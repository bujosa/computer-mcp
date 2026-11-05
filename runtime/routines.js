import fs from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import * as z from 'zod';
import { requireThat } from './errors.js';
import { atomicJSON } from '../src/atomic-json.js';

// A routine is an owner-saved assignment the runtime re-creates on a schedule.
// It adds no agent tool or authority: each run is an ordinary queued task for
// one named work connection, and the next run waits until the owner checked the
// previous one. A failed, rejected, interrupted or cancelled run pauses it.
export const routineLimits = Object.freeze({
  routines: 20,
  minMinutes: 1,
  maxMinutes: 30 * 24 * 60,
  history: 20,
});
const unitMinutes = { minutes: 1, hours: 60, days: 1440 };
const text = (max) => z.string().trim().min(1).max(max);
export const routineSchema = z.strictObject({
  name: text(100),
  connectionId: z.uuid(),
  goal: text(4000),
  expectedResult: text(2000),
  scope: z.string().max(2000).optional().default(''),
  every: z.strictObject({
    value: z.number().int().min(1).max(43200),
    unit: z.enum(['minutes', 'hours', 'days']),
  }),
  enabled: z.boolean().optional().default(true),
});
const updateSchema = z.strictObject({ enabled: z.boolean() });

export function intervalMinutes(every) {
  return every.value * unitMinutes[every.unit];
}

// Stable per-run request identity: a lost write retries the same task.
export function runRequestId(routineId, run) {
  const h = createHash('sha256')
    .update(`computer-mcp:routine-run:v1:${routineId}:${run}`)
    .digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// Whether the last run lets the next one start, wait, or pause the routine.
export function gate(task) {
  if (!task) return { next: 'run' };
  if (['queued', 'running'].includes(task.status)) return { next: 'wait' };
  const verdict = task.attempt?.verification?.verdict;
  if (task.status === 'reported_success' && verdict === 'verified')
    return { next: 'run' };
  if (task.status === 'reported_success' && !verdict)
    return { next: 'wait', waiting: 'check' };
  return {
    next: 'pause',
    reason:
      verdict === 'rejected' ? 'last_run_rejected' : `last_run_${task.status}`,
  };
}

export class Routines {
  constructor({ file, assignments, operations, now = () => Date.now() }) {
    Object.assign(this, { file, assignments, operations, now });
    this.items = [];
    this.ticking = null;
  }
  async init() {
    try {
      const saved = JSON.parse(await fs.readFile(this.file, 'utf8'));
      requireThat(
        saved.version === 1,
        'routines_schema',
        'Unknown routines file.',
        500,
      );
      this.items = saved.routines;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return this;
  }
  save() {
    return atomicJSON(this.file, { version: 1, routines: this.items });
  }
  find(id) {
    const routine = this.items.find((item) => item.id === id);
    requireThat(routine, 'routine_not_found', 'Routine not found.', 404);
    return routine;
  }
  // Turning a routine back on acknowledges its last run, whatever its outcome.
  decide(routine, last = this.lastTask(routine)) {
    if (
      last &&
      last.id === routine.acknowledgedTaskId &&
      !['queued', 'running'].includes(last.status)
    )
      return { next: 'run' };
    return gate(last);
  }
  lastTask(routine) {
    if (!routine.lastTaskId) return null;
    try {
      return this.operations.task(routine.lastTaskId);
    } catch {
      return null; // Pruned or missing history does not block the next run.
    }
  }
  view(routine) {
    const last = this.lastTask(routine);
    const state = !routine.enabled
      ? routine.pausedReason
        ? 'paused'
        : 'off'
      : this.decide(routine, last).waiting === 'check'
        ? 'waiting_check'
        : last && ['queued', 'running'].includes(last.status)
          ? 'running'
          : 'scheduled';
    return {
      ...routine,
      state,
      lastRun: last && {
        id: last.id,
        name: last.name,
        status: last.status,
        verdict: last.attempt?.verification?.verdict || null,
      },
    };
  }
  list() {
    return this.items.map((routine) => this.view(routine));
  }
  async create(input, owner) {
    const parsed = routineSchema.safeParse(input);
    requireThat(
      parsed.success,
      'invalid_routine',
      'Provide a name, a work connection, the goal, how to check it and how often (1 minute to 30 days).',
    );
    const value = parsed.data;
    const minutes = intervalMinutes(value.every);
    requireThat(
      minutes >= routineLimits.minMinutes &&
        minutes <= routineLimits.maxMinutes,
      'invalid_routine',
      'Choose an interval from 1 minute to 30 days.',
    );
    requireThat(
      this.items.length < routineLimits.routines,
      'routine_limit',
      `Up to ${routineLimits.routines} routines per computer.`,
      409,
    );
    requireThat(
      this.operations.assertConnectionActive(value.connectionId).access ===
        'work',
      'work_access_required',
      'Routines run on a named work connection.',
      409,
    );
    const now = new Date(this.now()).toISOString();
    const routine = {
      id: randomUUID(),
      ...value,
      owner,
      runs: 0,
      history: [],
      createdAt: now,
      updatedAt: now,
      nextRunAt: value.enabled ? now : null,
      lastRunAt: null,
      lastTaskId: null,
      acknowledgedTaskId: null,
      pausedReason: null,
    };
    this.items.push(routine);
    await this.save();
    return this.view(routine);
  }
  async update(id, input, owner) {
    const parsed = updateSchema.safeParse(input);
    requireThat(
      parsed.success,
      'invalid_routine',
      'Choose enabled true or false.',
    );
    const routine = this.find(id);
    const now = this.now();
    routine.enabled = parsed.data.enabled;
    routine.updatedAt = new Date(now).toISOString();
    if (routine.enabled) {
      // Turning it on is the owner's go-ahead for the next run.
      routine.owner = owner;
      routine.pausedReason = null;
      routine.acknowledgedTaskId = routine.lastTaskId;
      const due = routine.lastRunAt
        ? Date.parse(routine.lastRunAt) + intervalMinutes(routine.every) * 60000
        : now;
      routine.nextRunAt = new Date(Math.max(due, now)).toISOString();
    } else routine.nextRunAt = null;
    await this.save();
    return this.view(routine);
  }
  async remove(id) {
    this.find(id);
    this.items = this.items.filter((item) => item.id !== id);
    await this.save();
    return { removed: true };
  }
  async pause(routine, reason) {
    routine.enabled = false;
    routine.pausedReason = reason;
    routine.nextRunAt = null;
    routine.updatedAt = new Date(this.now()).toISOString();
  }
  // Serialized: at most one scheduler pass creates runs at a time.
  tick() {
    this.ticking ||= this.run().finally(() => {
      this.ticking = null;
    });
    return this.ticking;
  }
  async run() {
    let changed = false;
    const created = [];
    for (const routine of this.items) {
      if (!routine.enabled || Date.parse(routine.nextRunAt) > this.now())
        continue;
      const decision = this.decide(routine);
      if (decision.next === 'wait') continue;
      if (decision.next === 'pause') {
        await this.pause(routine, decision.reason);
        changed = true;
        continue;
      }
      const run = routine.runs + 1;
      try {
        const { task } = await this.assignments.create(
          {
            requestId: runRequestId(routine.id, run),
            connectionId: routine.connectionId,
            name: `${routine.name} · run ${run}`.slice(0, 120),
            goal: routine.goal,
            expectedResult: routine.expectedResult,
            scope: routine.scope,
          },
          routine.owner,
        );
        const now = this.now();
        routine.runs = run;
        routine.lastTaskId = task.id;
        routine.lastRunAt = new Date(now).toISOString();
        routine.nextRunAt = new Date(
          now + intervalMinutes(routine.every) * 60000,
        ).toISOString();
        routine.history = [task.id, ...routine.history].slice(
          0,
          routineLimits.history,
        );
        routine.updatedAt = routine.lastRunAt;
        created.push(task);
      } catch (error) {
        // A revoked connection or full task queue needs the owner.
        await this.pause(routine, error.code || 'run_failed');
      }
      changed = true;
    }
    if (changed) await this.save();
    return created;
  }
}
