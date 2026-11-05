import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  Routines,
  gate,
  intervalMinutes,
  runRequestId,
} from '../runtime/routines.js';
import { activityAction } from '../runtime/audit-http.js';

const owner = `human:${randomUUID()}`;
const connectionId = randomUUID();

function harness(t, { access = 'work' } = {}) {
  let clock = Date.UTC(2026, 10, 5, 9, 0);
  const tasks = new Map();
  const created = [];
  const operations = {
    assertConnectionActive(id) {
      if (id !== connectionId)
        throw Object.assign(new Error('revoked'), {
          code: 'connection_revoked',
        });
      return { id, access };
    },
    task(id) {
      const task = tasks.get(id);
      if (!task) throw new Error('missing');
      return task;
    },
  };
  const assignments = {
    async create(input, actor) {
      operations.assertConnectionActive(input.connectionId);
      const task = {
        id: randomUUID(),
        name: input.name,
        status: 'queued',
        attempt: null,
      };
      tasks.set(task.id, task);
      created.push({ input, actor });
      return { task };
    },
  };
  return fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-routines-')).then((dir) => {
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    const routines = new Routines({
      file: path.join(dir, 'routines.json'),
      assignments,
      operations,
      now: () => clock,
    });
    return {
      routines,
      tasks,
      created,
      file: path.join(dir, 'routines.json'),
      advance: (minutes) => {
        clock += minutes * 60000;
      },
      finish: (id, status, verdict) => {
        const task = tasks.get(id);
        task.status = status;
        task.attempt = { verification: verdict ? { verdict } : null };
      },
    };
  });
}

const research = {
  name: 'MCP research',
  connectionId,
  goal: 'Find the newest MCP servers on GitHub and write reports/mcp.md.',
  expectedResult: 'reports/mcp.md lists five repositories with links.',
  every: { value: 2, unit: 'minutes' },
};

test('the next run gates on the owner check of the previous run', () => {
  assert.deepEqual(gate(null), { next: 'run' });
  assert.deepEqual(gate({ status: 'running' }), { next: 'wait' });
  assert.deepEqual(
    gate({ status: 'reported_success', attempt: { verification: null } }),
    {
      next: 'wait',
      waiting: 'check',
    },
  );
  assert.deepEqual(
    gate({
      status: 'reported_success',
      attempt: { verification: { verdict: 'verified' } },
    }),
    { next: 'run' },
  );
  assert.equal(
    gate({
      status: 'reported_success',
      attempt: { verification: { verdict: 'rejected' } },
    }).reason,
    'last_run_rejected',
  );
  assert.equal(
    gate({ status: 'failed', attempt: {} }).reason,
    'last_run_failed',
  );
  assert.equal(intervalMinutes({ value: 2, unit: 'days' }), 2880);
  assert.equal(runRequestId('a', 1), runRequestId('a', 1));
  assert.notEqual(runRequestId('a', 1), runRequestId('a', 2));
  assert.match(
    runRequestId('a', 1),
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test('a routine assigns one run at a time and waits for the owner check', async (t) => {
  const h = await harness(t);
  const routine = await h.routines.create(research, owner);
  assert.equal(routine.state, 'scheduled');
  await h.routines.tick();
  assert.equal(h.created.length, 1, 'enabling runs it right away');
  assert.equal(h.created[0].actor, owner);
  assert.equal(h.created[0].input.name, 'MCP research · run 1');
  assert.equal(h.created[0].input.requestId, runRequestId(routine.id, 1));
  const first = h.routines.list()[0];
  assert.equal(first.state, 'running');
  h.advance(5);
  await h.routines.tick();
  assert.equal(h.created.length, 1, 'never two runs at once');
  h.finish(first.lastTaskId, 'reported_success', null);
  await h.routines.tick();
  assert.equal(h.routines.list()[0].state, 'waiting_check');
  assert.equal(h.created.length, 1, 'an unchecked report holds the next run');
  h.finish(first.lastTaskId, 'reported_success', 'verified');
  await h.routines.tick();
  assert.equal(h.created.length, 2);
  assert.equal(h.created[1].input.name, 'MCP research · run 2');
  const saved = JSON.parse(await fs.readFile(h.file, 'utf8'));
  assert.equal(saved.routines[0].runs, 2);
  assert.equal(saved.routines[0].history.length, 2);
});

test('failures pause the routine until the owner turns it back on', async (t) => {
  const h = await harness(t);
  const routine = await h.routines.create(research, owner);
  await h.routines.tick();
  h.finish(h.routines.list()[0].lastTaskId, 'failed', null);
  h.advance(3);
  await h.routines.tick();
  let view = h.routines.list()[0];
  assert.equal(view.state, 'paused');
  assert.equal(view.pausedReason, 'last_run_failed');
  assert.equal(view.enabled, false);
  h.advance(10);
  await h.routines.tick();
  assert.equal(h.created.length, 1);
  const other = `human:${randomUUID()}`;
  view = await h.routines.update(routine.id, { enabled: true }, other);
  assert.equal(view.pausedReason, null);
  await h.routines.tick();
  assert.equal(h.created.length, 2, 're-enabling is the go-ahead');
  assert.equal(h.created[1].actor, other);
  view = await h.routines.update(routine.id, { enabled: false }, other);
  assert.equal(view.state, 'off');
  h.advance(60);
  await h.routines.tick();
  assert.equal(h.created.length, 2);
  assert.deepEqual(await h.routines.remove(routine.id), { removed: true });
  assert.deepEqual(h.routines.list(), []);
});

test('routines need a work connection and bounded input', async (t) => {
  const h = await harness(t);
  await assert.rejects(
    h.routines.create(
      { ...research, every: { value: 0, unit: 'minutes' } },
      owner,
    ),
    /interval|how often/,
  );
  await assert.rejects(
    h.routines.create(
      { ...research, every: { value: 31, unit: 'days' } },
      owner,
    ),
    /1 minute to 30 days/,
  );
  await assert.rejects(
    h.routines.create({ ...research, extra: 1 }, owner),
    /how often/,
  );
  await assert.rejects(
    h.routines.create({ ...research, connectionId: randomUUID() }, owner),
    /revoked/,
  );
  const read = await harness(t, { access: 'read' });
  await assert.rejects(
    read.routines.create(research, owner),
    /work connection/,
  );
  const off = await h.routines.create({ ...research, enabled: false }, owner);
  assert.equal(off.state, 'off');
  assert.equal(off.nextRunAt, null);
});

test('owner routine changes are recorded in Activity; agents are denied', () => {
  const act = (path, method, kind = 'human') =>
    activityAction({ path, method, kind, body: {} });
  assert.equal(act('/routines', 'POST'), 'routine.create');
  assert.equal(act(`/routines/${randomUUID()}`, 'POST'), 'routine.update');
  assert.equal(
    act(`/routines/${randomUUID()}/delete`, 'POST'),
    'routine.delete',
  );
  assert.equal(act('/routines', 'GET'), null);
  assert.equal(act('/routines', 'GET', 'agent'), 'routine.denied');
});

test('worker queue polls stay out of Activity; agent calls do not', () => {
  const call = (name, client) =>
    activityAction({
      path: '/call',
      method: 'POST',
      kind: 'agent',
      body: { name, args: {} },
      auditClient: client,
    });
  const worker = { source: 'mcp', name: 'computer-mcp-worker claude' };
  assert.equal(call('task_list', worker), null);
  assert.equal(call('workflow_list', worker), null);
  assert.equal(call('task_start', worker), 'tool.task_start');
  assert.equal(
    call('task_list', { source: 'mcp', name: 'claude-code' }),
    'tool.task_list',
  );
});
