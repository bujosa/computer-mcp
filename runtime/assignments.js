import { requireThat } from './errors.js';
import { revision } from './analysis.js';
import {
  taskCreateSchema,
  taskCancelSchema,
  taskVerifySchema,
} from '../src/operations-contract.js';
import { formatAssignedTask } from '../src/assigned-task.js';

export class Assignments {
  constructor({ operations, store, lease, identity, sync = () => {} }) {
    Object.assign(this, { operations, store, lease, identity, sync });
    this.cancelling = new Set();
  }
  connection(req, work = false) {
    requireThat(
      req.kind === 'agent' && req.computerConnection,
      'named_connection_required',
      'Use an owner-created named connection for assigned tasks.',
      403,
    );
    const connection = this.operations.assertConnectionActive(
      req.computerConnection.id,
    );
    requireThat(
      !work || connection.access === 'work',
      'work_access_required',
      'Task execution requires a work connection.',
      403,
    );
    return connection;
  }
  effect(req) {
    const connection = this.connection(req, true);
    const lease = this.lease.assert(req.actor);
    const binding = this.operations.assertEffect({
      actor: req.actor,
      connectionId: connection.id,
      leaseGeneration: lease.generation,
    });
    requireThat(
      !this.cancelling.has(binding.id),
      'task_cancelling',
      'This task is being cancelled. Stop and inspect its final state.',
      409,
    );
    return binding;
  }
  workflow(workflow, pin) {
    requireThat(
      workflow.computerId === this.identity.computerId &&
        workflow.status === 'ready' &&
        !!workflow.review?.reviewedAt &&
        !workflow.draft &&
        revision(workflow) === pin.revision,
      'workflow_changed',
      'This assignment needs its exact ready, owner-reviewed workflow. Create a new assignment after reviewing changes.',
      409,
    );
  }
  async decorate(task) {
    if (!task.workflow) return { ...task, outdated: false };
    let outdated = true;
    try {
      this.workflow(await this.store.get(task.workflow.id), task.workflow);
      outdated = false;
    } catch {
      /* Missing or changed evidence cannot become a valid task. */
    }
    return { ...task, outdated };
  }
  async create(input, owner) {
    const parsed = taskCreateSchema.safeParse(input);
    requireThat(
      parsed.success,
      'invalid_task',
      'Provide a bounded named connection assignment and current reviewed workflow, if used.',
    );
    const value = parsed.data;
    const create = () => this.operations.createTask(value, owner);
    const task = value.workflow
      ? await this.store.withWorkflow(value.workflow.id, (workflow) => {
          this.workflow(workflow, value.workflow);
          return create();
        })
      : create();
    return {
      task: await this.decorate(task),
      request: formatAssignedTask(task),
    };
  }
  async list(connectionId) {
    return Promise.all(
      this.operations.tasks(connectionId).map((task) => this.decorate(task)),
    );
  }
  async get(id, connectionId) {
    return this.decorate(this.operations.task(id, connectionId));
  }
  async start(req, id, signal) {
    const connection = this.connection(req, true);
    const snapshot = this.operations.task(id, connection.id);
    const start = (workflow) => {
      requireThat(
        !signal?.aborted,
        'cancelled',
        'Task activation was cancelled.',
        409,
      );
      this.connection(req, true); // A queued workflow read may have outlived a revoke.
      const current = this.operations.prepareStart(id, {
        actor: req.actor,
        connectionId: connection.id,
      });
      if (current.workflow) this.workflow(workflow, current.workflow);
      if (current.status === 'running') {
        requireThat(
          !this.cancelling.has(current.attempt.id),
          'task_cancelling',
          'This task is being cancelled.',
          409,
        );
        const held = this.lease.assert(req.actor);
        this.operations.assertEffect({
          actor: req.actor,
          connectionId: connection.id,
          leaseGeneration: held.generation,
        });
        return { task: current, lease: this.lease.status() };
      }
      const held = this.lease.claim(req.actor, 'agent');
      try {
        const task = this.operations.startTask(id, {
          actor: req.actor,
          connectionId: connection.id,
          leaseGeneration: held.generation,
        });
        this.sync();
        return { task, lease: held };
      } catch (error) {
        if (
          this.lease.status()?.owner === req.actor &&
          this.lease.status()?.generation === held.generation
        )
          this.lease.revoke('task_start_failed');
        throw error;
      }
    };
    const result = snapshot.workflow
      ? await this.store.withWorkflow(snapshot.workflow.id, start)
      : start();
    if (signal?.aborted) {
      if (
        this.lease.status()?.owner === req.actor &&
        this.lease.status()?.generation === result.lease.generation
      )
        this.lease.revoke('cancelled');
      requireThat(false, 'cancelled', 'Task activation was cancelled.', 409);
    }
    this.effect(req);
    return result;
  }
  finish(req, input) {
    const connection = this.connection(req, true);
    const task = this.operations.task(input.id, connection.id);
    if (task.status === 'running') {
      this.effect(req);
      requireThat(
        !this.lease.active,
        'operation_busy',
        'Wait for the current effect to finish before reporting the task.',
        409,
      );
    }
    const { id, ...report } = input;
    const finished = this.operations.finishTask(id, {
      ...report,
      actor: req.actor,
      connectionId: connection.id,
    });
    const held = this.lease.status();
    if (
      held?.owner === req.actor &&
      held.generation === finished.attempt?.leaseGeneration
    ) {
      this.lease.release(req.actor);
      this.sync();
    }
    return { task: finished, released: true };
  }
  async cancel(id, input, owner) {
    const parsed = taskCancelSchema.safeParse(input);
    requireThat(
      parsed.success && parsed.data.expectedRevision,
      'invalid_task_cancel',
      'Provide the saved task revision.',
    );
    const task = this.operations.task(id);
    if (task.status === 'cancelled')
      return { task: this.operations.cancelTask(id, parsed.data, owner) };
    requireThat(
      task.revision === parsed.data.expectedRevision,
      'task_changed',
      'This task changed. Refresh it before cancelling.',
      409,
    );
    requireThat(
      ['queued', 'running'].includes(task.status),
      'task_not_cancellable',
      'Only queued or running tasks can be cancelled.',
      409,
    );
    if (task.status === 'queued')
      return { task: this.operations.cancelTask(id, parsed.data, owner) };
    requireThat(
      !this.cancelling.has(task.attempt.id),
      'task_cancelling',
      'This task is already being cancelled.',
      409,
    );
    const pending =
      this.lease.active?.owner === task.attempt?.actor
        ? this.lease.active.done
        : null;
    this.cancelling.add(task.attempt.id);
    try {
      if (pending) this.lease.active.controller.abort();
      if (pending) await pending;
      const current = this.operations.task(id);
      // A concurrent takeover/revoke/storage failure may have interrupted it.
      const cancelled =
        current.status === 'running'
          ? this.operations.cancelTask(id, parsed.data, owner)
          : current;
      const held = this.lease.status();
      if (
        held?.owner === task.attempt.actor &&
        held.generation === task.attempt.leaseGeneration
      )
        this.lease.revoke('owner_cancelled');
      this.sync();
      return { task: cancelled };
    } finally {
      this.cancelling.delete(task.attempt.id);
    }
  }
  verify(id, input, owner) {
    const parsed = taskVerifySchema.safeParse(input);
    requireThat(
      parsed.success,
      'invalid_task_verification',
      'Provide the saved task revision and an explicit owner verdict with notes.',
    );
    return { task: this.operations.verifyTask(id, parsed.data, owner) };
  }
}
