import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Assignments } from '../runtime/assignments.js';
import { Operations, actorForConnection } from '../runtime/operations.js';
import { Lease } from '../runtime/lease.js';
import { Store } from '../runtime/store.js';
import { taskCreateSchema } from '../src/operations-contract.js';

const owner = () => `human:${randomUUID()}`;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function leaseFor(operations) {
  return new Lease({
    onChange(previous, current, reason) {
      if (
        previous &&
        (!current ||
          previous.owner !== current.owner ||
          previous.generation !== current.generation)
      )
        operations.interruptActor(previous.owner, reason);
    },
  });
}

function controllerFor(fixture) {
  return new Assignments({
    operations: fixture.operations,
    store: fixture.store,
    lease: fixture.lease,
    identity: fixture.identity,
    sync: () => fixture.syncs++,
  });
}

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-assignments-'));
  const computerId = randomUUID();
  const store = new Store(path.join(root, 'store'));
  const storedIdentity = await store.init(computerId);
  const fixture = {
    root,
    operationsRoot: path.join(root, 'operations'),
    store,
    identity: { ...storedIdentity, bootId: randomUUID() },
    syncs: 0,
  };
  fixture.operations = await new Operations(
    fixture.operationsRoot,
    fixture.identity,
    { legacyEnabled: false },
  ).init();
  fixture.lease = leaseFor(fixture.operations);
  fixture.store.beforeUpdate = (id) =>
    fixture.operations.assertWorkflowIdle(id);
  fixture.assignments = controllerFor(fixture);
  fixture.owner = owner();
  fixture.grant = fixture.operations.createConnection(
    { label: 'assigned-worker', access: 'work' },
    fixture.owner,
  );
  fixture.actor = actorForConnection(fixture.grant.connection.id, randomUUID());
  fixture.operations.touch(fixture.grant.connection.id, fixture.actor, {
    source: 'mcp',
    name: 'Assignment tests',
    version: '1.0.0',
    protocol: '2026-07-28',
  });
  fixture.req = {
    actor: fixture.actor,
    kind: 'agent',
    computerConnection: fixture.grant.connection,
  };
  t.after(async () => {
    try {
      fixture.lease.revoke('test_cleanup');
    } catch {
      // A simulated crash may have already closed the previous database.
    }
    fixture.operations.close();
    await fs.rm(root, { recursive: true, force: true });
  });
  return fixture;
}

async function reviewedWorkflow(fixture) {
  const workflow = {
    id: randomUUID(),
    revision: randomUUID(),
    computerId: fixture.identity.computerId,
    name: 'Publish reviewed report',
    createdAt: new Date().toISOString(),
    status: 'ready',
    steps: [],
    review: {
      reviewedAt: new Date().toISOString(),
      procedure: 'Open the saved draft and publish it.',
      expectedResult: 'The reviewed report is published.',
    },
  };
  await fixture.store.save(workflow);
  return workflow;
}

function taskInput(fixture, overrides = {}) {
  return taskCreateSchema.parse({
    requestId: randomUUID(),
    connectionId: fixture.grant.connection.id,
    name: 'Publish "Q4" report',
    goal: 'Publish <the reviewed report> without changing its totals.',
    expectedResult: 'The report is visible with the reviewed totals.',
    scope: 'Only the saved report; do not change account settings.',
    ...overrides,
  });
}

async function createTask(fixture, overrides = {}) {
  return fixture.assignments.create(
    taskInput(fixture, overrides),
    fixture.owner,
  );
}

function report(id, overrides = {}) {
  return {
    id,
    outcome: 'success',
    summary: 'The published report was read back successfully.',
    evidence: ['report page readback'],
    ...overrides,
  };
}

async function workflowBarrier(store, id) {
  const entered = deferred();
  const release = deferred();
  const pending = store.withWorkflow(id, async (workflow) => {
    entered.resolve();
    await release.promise;
    return workflow;
  });
  await entered.promise;
  return { pending, release };
}

async function restart(fixture) {
  fixture.operations.db.close();
  fixture.operations.closed = true;
  fixture.identity = { ...fixture.identity, bootId: randomUUID() };
  fixture.operations = await new Operations(
    fixture.operationsRoot,
    fixture.identity,
    { legacyEnabled: false },
  ).init();
  fixture.lease = leaseFor(fixture.operations);
  fixture.store.beforeUpdate = (id) =>
    fixture.operations.assertWorkflowIdle(id);
  fixture.assignments = controllerFor(fixture);
  fixture.req = {
    ...fixture.req,
    computerConnection: fixture.operations.authenticate(fixture.grant.secret),
  };
  fixture.operations.touch(fixture.grant.connection.id, fixture.actor, {
    source: 'mcp',
  });
}

test('saved assignments pin literal requirements without starting work', async (t) => {
  const f = await fixture(t);
  const workflow = await reviewedWorkflow(f);
  const input = taskInput(f, {
    workflow: { id: workflow.id, revision: workflow.revision },
  });
  const created = await f.assignments.create(input, f.owner);

  assert.equal(created.task.status, 'queued');
  assert.equal(created.task.attempt, null);
  assert.equal(created.task.outdated, false);
  assert.equal(f.lease.status(), null);
  assert.equal(f.operations.activeAttempt(f.actor), null);
  assert.equal(f.syncs, 0);
  assert.ok(
    created.request.includes(
      JSON.stringify({
        computerId: f.identity.computerId,
        workspaceId: f.identity.workspaceId,
        connectionId: f.grant.connection.id,
        taskId: created.task.id,
      }),
    ),
  );
  assert.ok(
    created.request.includes(
      JSON.stringify(
        {
          name: input.name,
          goal: input.goal,
          expectedResult: input.expectedResult,
          scope: input.scope,
        },
        null,
        2,
      ),
    ),
  );
  assert.ok(created.request.includes(JSON.stringify(input.workflow)));
  assert.match(created.request, /did not start an agent or run the task/);
  assert.match(created.request, /Call task_start/);
  assert.match(created.request, /awaiting owner verification/i);

  const listed = await f.assignments.list(f.grant.connection.id);
  assert.deepEqual(listed, [created.task]);
  assert.deepEqual(
    await f.assignments.get(created.task.id, f.grant.connection.id),
    created.task,
  );
});

test('a start queued before a workflow edit runs first and blocks that edit', async (t) => {
  const f = await fixture(t);
  const workflow = await reviewedWorkflow(f);
  const { task } = await createTask(f, {
    workflow: { id: workflow.id, revision: workflow.revision },
  });
  const barrier = await workflowBarrier(f.store, workflow.id);
  const starting = f.assignments.start(f.req, task.id);
  const editing = f.store.update(workflow.id, (current) => ({
    ...current,
    revision: randomUUID(),
  }));
  const editRejected = assert.rejects(editing, { code: 'workflow_in_use' });

  barrier.release.resolve();
  await barrier.pending;
  const started = await starting;
  await editRejected;

  assert.equal(started.task.status, 'running');
  assert.equal(started.task.workflow.revision, workflow.revision);
  assert.equal(f.lease.status().generation, started.lease.generation);
  assert.equal((await f.store.get(workflow.id)).revision, workflow.revision);
  f.assignments.finish(
    f.req,
    report(task.id, {
      outcome: 'failure',
      summary: 'Stopped after confirming the edit was blocked.',
      evidence: [],
    }),
  );
});

test('a workflow edit queued before start makes the assignment stale with no control', async (t) => {
  const f = await fixture(t);
  const workflow = await reviewedWorkflow(f);
  const { task } = await createTask(f, {
    workflow: { id: workflow.id, revision: workflow.revision },
  });
  const barrier = await workflowBarrier(f.store, workflow.id);
  const nextRevision = randomUUID();
  const editing = f.store.update(workflow.id, (current) => ({
    ...current,
    revision: nextRevision,
  }));
  const starting = f.assignments.start(f.req, task.id);
  const startRejected = assert.rejects(starting, {
    code: 'workflow_changed',
  });

  barrier.release.resolve();
  await barrier.pending;
  await editing;
  await startRejected;

  assert.equal(f.lease.status(), null);
  assert.equal(f.operations.task(task.id).status, 'queued');
  assert.equal(f.operations.task(task.id).attempt, null);
  assert.equal(f.syncs, 0);
  assert.equal(
    (await f.assignments.get(task.id, f.grant.connection.id)).outdated,
    true,
  );
});

test('activation rechecks a connection revoked while waiting on the workflow queue', async (t) => {
  const f = await fixture(t);
  const workflow = await reviewedWorkflow(f);
  const { task } = await createTask(f, {
    workflow: { id: workflow.id, revision: workflow.revision },
  });
  const barrier = await workflowBarrier(f.store, workflow.id);
  const starting = f.assignments.start(f.req, task.id);
  const startRejected = assert.rejects(starting, {
    code: 'connection_revoked',
  });

  f.operations.revokeConnection(f.grant.connection.id, f.owner);
  barrier.release.resolve();
  await barrier.pending;
  await startRejected;

  assert.equal(f.lease.status(), null);
  assert.equal(f.operations.task(task.id).status, 'queued');
  assert.equal(f.operations.task(task.id).attempt, null);
  assert.equal(f.syncs, 0);
});

test('attempt binding gates effects, reports and release across sessions and retries', async (t) => {
  const f = await fixture(t);
  const { task } = await createTask(f);
  assert.throws(() => f.assignments.effect(f.req), { code: 'lease_required' });

  const firstStart = await f.assignments.start(f.req, task.id);
  const duplicateStart = await f.assignments.start(f.req, task.id);
  assert.equal(duplicateStart.task.attempt.id, firstStart.task.attempt.id);
  assert.equal(duplicateStart.lease.generation, firstStart.lease.generation);
  assert.equal(f.assignments.effect(f.req).id, firstStart.task.attempt.id);

  const foreignActor = actorForConnection(f.grant.connection.id, randomUUID());
  f.operations.touch(f.grant.connection.id, foreignActor, { source: 'mcp' });
  const foreignReq = { ...f.req, actor: foreignActor };
  assert.throws(() => f.assignments.finish(foreignReq, report(task.id)), {
    code: 'lease_required',
  });
  assert.equal(f.lease.status().owner, f.actor);

  const effectEntered = deferred();
  const finishEffect = deferred();
  const activeEffect = f.lease.run(
    f.actor,
    async () => {
      effectEntered.resolve();
      await finishEffect.promise;
      return { observed: true };
    },
    randomUUID(),
  );
  await effectEntered.promise;
  assert.throws(() => f.assignments.finish(f.req, report(task.id)), {
    code: 'operation_busy',
  });
  finishEffect.resolve();
  await activeEffect;

  const finished = f.assignments.finish(f.req, report(task.id));
  assert.equal(finished.task.status, 'reported_success');
  assert.equal(f.lease.status(), null);
  const verified = f.assignments.verify(
    task.id,
    {
      expectedRevision: finished.task.revision,
      verdict: 'verified',
      notes: 'Owner checked the published report.',
    },
    f.owner,
  );
  assert.equal(verified.task.attempt.verification.verdict, 'verified');

  const { task: nextTask } = await createTask(f);
  const nextStart = await f.assignments.start(f.req, nextTask.id);
  const duplicateFinish = f.assignments.finish(f.req, report(task.id));
  assert.equal(duplicateFinish.task.id, task.id);
  assert.equal(f.lease.status().generation, nextStart.lease.generation);
  assert.equal(f.lease.status().owner, f.actor);
  f.assignments.finish(
    f.req,
    report(nextTask.id, {
      outcome: 'failure',
      summary: 'Second assignment stopped without effects.',
      evidence: [],
    }),
  );
});

test('owner cancellation blocks task operations, aborts and drains before committing', async (t) => {
  const f = await fixture(t);
  const { task } = await createTask(f);
  const started = await f.assignments.start(f.req, task.id);
  const effectEntered = deferred();
  const abortObserved = deferred();
  const drain = deferred();
  let statusWhenAborted;
  const activeEffect = f.lease.run(
    f.actor,
    async (signal) => {
      effectEntered.resolve();
      if (!signal.aborted)
        await new Promise((resolve) =>
          signal.addEventListener('abort', resolve, { once: true }),
        );
      statusWhenAborted = f.operations.task(task.id).status;
      abortObserved.resolve();
      await drain.promise;
      return { possibleLateEffect: true };
    },
    randomUUID(),
  );
  const effectRejected = assert.rejects(activeEffect, { code: 'lease_lost' });
  await effectEntered.promise;

  let cancelSettled = false;
  const cancelling = f.assignments.cancel(
    task.id,
    { expectedRevision: started.task.revision },
    f.owner,
  );
  cancelling.then(
    () => {
      cancelSettled = true;
    },
    () => {
      cancelSettled = true;
    },
  );
  await abortObserved.promise;

  assert.equal(statusWhenAborted, 'running');
  assert.equal(f.operations.task(task.id).status, 'running');
  assert.equal(cancelSettled, false);
  assert.throws(() => f.assignments.effect(f.req), {
    code: 'task_cancelling',
  });
  assert.throws(() => f.assignments.finish(f.req, report(task.id)), {
    code: 'task_cancelling',
  });
  await assert.rejects(f.assignments.start(f.req, task.id), {
    code: 'task_cancelling',
  });

  drain.resolve();
  await effectRejected;
  const cancelled = await cancelling;
  assert.equal(cancelled.task.status, 'cancelled');
  assert.equal(cancelled.task.attempt.status, 'cancelled');
  assert.equal(cancelled.task.attempt.partialEffects, 'unknown');
  assert.equal(f.lease.status(), null);
  assert.deepEqual(
    await f.assignments.cancel(
      task.id,
      { expectedRevision: started.task.revision },
      f.owner,
    ),
    cancelled,
  );
});

test('runtime restart preserves interruption and rejects a late success report', async (t) => {
  const f = await fixture(t);
  const { task } = await createTask(f);
  await f.assignments.start(f.req, task.id);

  await restart(f);
  const recovered = f.operations.task(task.id);
  assert.equal(recovered.status, 'interrupted');
  assert.equal(recovered.attempt.interruptionReason, 'runtime_restart');
  assert.equal(f.lease.status(), null);
  assert.throws(() => f.assignments.finish(f.req, report(task.id)), {
    code: 'task_forbidden',
  });
  assert.equal(f.operations.task(task.id).status, 'interrupted');
});

test('read connections cannot create, start or authorize assigned effects', async (t) => {
  const f = await fixture(t);
  const readGrant = f.operations.createConnection(
    { label: 'review-only', access: 'read' },
    f.owner,
  );
  const readActor = actorForConnection(readGrant.connection.id, randomUUID());
  f.operations.touch(readGrant.connection.id, readActor, { source: 'mcp' });
  const readReq = {
    actor: readActor,
    kind: 'agent',
    computerConnection: readGrant.connection,
  };

  await assert.rejects(
    f.assignments.create(
      taskInput(f, { connectionId: readGrant.connection.id }),
      f.owner,
    ),
    { code: 'work_access_required' },
  );
  const { task } = await createTask(f);
  await assert.rejects(f.assignments.start(readReq, task.id), {
    code: 'work_access_required',
  });
  assert.throws(() => f.assignments.effect(readReq), {
    code: 'work_access_required',
  });
  assert.deepEqual(await f.assignments.list(readGrant.connection.id), []);
  assert.equal(f.lease.status(), null);
  assert.equal(f.operations.task(task.id).status, 'queued');
});
