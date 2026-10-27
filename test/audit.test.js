import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { Audit } from '../runtime/audit.js';
import { Lease } from '../runtime/lease.js';
import {
  activityAction,
  activityFault,
  clientMetadata,
  activityMiddleware,
} from '../runtime/audit-http.js';
import { declaredClient } from '../src/audit-contract.js';
import { Fault } from '../runtime/errors.js';

async function fixture(t, limits = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-audit-'));
  const identity = {
    computerId: randomUUID(),
    workspaceId: randomUUID(),
    bootId: randomUUID(),
  };
  let now = Date.parse('2026-10-10T12:00:00Z'),
    elapsed = 0;
  const options = { now: () => now, monotonic: () => elapsed, limits };
  let audit = await new Audit(root, identity, options).init();
  t.after(async () => {
    if (!audit.closed) audit.db.close();
    await fs.rm(root, { recursive: true, force: true });
  });
  return {
    root,
    identity,
    get audit() {
      return audit;
    },
    tick(ms) {
      now += ms;
      elapsed += ms;
    },
    wall(ms) {
      now += ms;
    },
    async restart() {
      audit.db.close();
      identity.bootId = randomUUID();
      audit = await new Audit(root, identity, options).init();
      return audit;
    },
  };
}
const agent = (extra = {}) => ({
  actor: `agent:${randomUUID()}`,
  kind: 'agent',
  auditClient: {
    source: 'mcp',
    name: 'QA agent',
    version: '1.0',
    protocol: '2026-07-28',
  },
  ...extra,
});

function httpAudit(audit, req, { prepare = () => {}, response = {} } = {}) {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.writableEnded = false;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (value) => {
    res.writableEnded = true;
    return value;
  };
  activityMiddleware(audit, { prepare })(req, res, (error) => {
    if (error) throw error;
    res.json(response);
  });
}

test('schema-1 attribution migration validates identity first and retains unassigned history without inventing IDs', async (t) => {
  const f = await fixture(t);
  const req = agent();
  const id = f.audit.start(req, 'tool.files_read');
  f.audit.finish(id);
  const previous = f.audit.export();
  // Reconstruct the exact additive boundary of a pre-connection schema-1 DB.
  f.audit.db.exec(`
    ALTER TABLE sessions DROP COLUMN connection_id;
    ALTER TABLE events DROP COLUMN connection_id;
    ALTER TABLE events DROP COLUMN task_id;
    ALTER TABLE events DROP COLUMN attempt_id;
  `);
  const columns = (table) =>
    f.audit.db
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((column) => column.name);
  const wrong = new Audit(f.root, { ...f.identity, workspaceId: randomUUID() });
  await assert.rejects(wrong.init(), { code: 'audit_identity_mismatch' });
  wrong.db.close();
  assert.ok(!columns('sessions').includes('connection_id'));
  assert.ok(!columns('events').includes('task_id'));
  f.audit.db.prepare("UPDATE meta SET value='2' WHERE key='schema'").run();
  const unsupported = new Audit(f.root, f.identity);
  await assert.rejects(unsupported.init(), { code: 'audit_identity_mismatch' });
  unsupported.db.close();
  assert.ok(!columns('events').includes('attempt_id'));
  f.audit.db.prepare("UPDATE meta SET value='1' WHERE key='schema'").run();
  await f.restart();
  const upgraded = f.audit.export();
  assert.equal(
    f.audit.db.prepare("SELECT value FROM meta WHERE key='schema'").get().value,
    '1',
  );
  for (const old of previous.events) {
    const retained = upgraded.events.find((event) => event.id === old.id);
    assert.deepEqual(retained, old);
    assert.equal(retained.connectionId, null);
    assert.equal(retained.taskId, null);
    assert.equal(retained.attemptId, null);
  }
  assert.equal(upgraded.sessions[0].connectionId, null);
  assert.equal(upgraded.sessions[0].id, previous.sessions[0].id);
  await f.restart();
  assert.equal(
    columns('sessions').filter((column) => column === 'connection_id').length,
    1,
  );
  for (const column of ['connection_id', 'task_id', 'attempt_id'])
    assert.equal(
      columns('events').filter((value) => value === column).length,
      1,
    );
  assert.equal(
    f.audit.export().events.find((event) => event.id === id).outcome,
    'success',
  );
});

test('trusted grant, task and attempt UUIDs persist in events and exports while sessions keep only grant attribution', async (t) => {
  const f = await fixture(t);
  const connectionId = randomUUID(),
    taskId = randomUUID(),
    attemptId = randomUUID(),
    workflowId = randomUUID();
  const req = agent({ connectionId, taskId, attemptId });
  const id = f.audit.start(req, 'tool.terminal_run', { workflowId });
  f.audit.finish(id);
  const read = f.audit.read();
  const event = read.events.find((item) => item.id === id);
  assert.equal(event.connectionId, connectionId);
  assert.equal(event.taskId, taskId);
  assert.equal(event.attemptId, attemptId);
  assert.equal(event.workflowId, workflowId);
  const session = read.sessions.find((item) => item.id === event.sessionId);
  assert.equal(session.connectionId, connectionId);
  assert.ok(!Object.hasOwn(session, 'taskId'));
  assert.ok(!Object.hasOwn(session, 'attemptId'));
  // Even an identical actor/access cannot retroactively label a legacy session.
  const legacy = f.audit.start(
    {
      ...req,
      connectionId: undefined,
      taskId: undefined,
      attemptId: undefined,
    },
    'tool.files_read',
  );
  f.audit.finish(legacy);
  const exported = f.audit.export();
  const legacyEvent = exported.events.find((item) => item.id === legacy);
  assert.notEqual(legacyEvent.sessionId, event.sessionId);
  assert.equal(legacyEvent.connectionId, null);
  assert.equal(legacyEvent.taskId, null);
  assert.equal(legacyEvent.attemptId, null);
  assert.equal(
    exported.sessions.find((item) => item.id === event.sessionId).connectionId,
    connectionId,
  );
  await f.restart();
  const restored = f.audit.export();
  assert.deepEqual(
    restored.events.find((item) => item.id === id),
    event,
  );
  assert.equal(
    restored.sessions.find((item) => item.id === event.sessionId).connectionId,
    connectionId,
  );
});

test('declared metadata cannot promote grant identity; body, headers and private task content stay outside Activity', async (t) => {
  const f = await fixture(t);
  const forged = randomUUID();
  let prepared = false;
  assert.throws(
    () =>
      httpAudit(
        f.audit,
        agent({
          path: '/call',
          method: 'POST',
          body: { name: 'task_get', args: { id: randomUUID() } },
          get: (name) =>
            name === 'x-audit-client'
              ? JSON.stringify({ source: 'mcp', connectionId: forged })
              : undefined,
        }),
        {
          prepare: () => {
            prepared = true;
          },
        },
      ),
    { code: 'invalid_client' },
  );
  assert.equal(prepared, false);
  assert.equal(f.audit.export().sessions.length, 0);
  const privateValues = [
    'private-grant-label',
    'private-task-goal',
    'private-input-value',
    '/private/task/path',
    'private-prompt',
    'private-result',
    randomBytes(32).toString('hex'),
    'private-evidence',
  ];
  const req = agent({
    path: '/call',
    method: 'POST',
    body: {
      name: 'terminal_run',
      connectionId: forged,
      taskId: forged,
      attemptId: forged,
      args: {
        id: forged,
        connectionId: forged,
        taskId: forged,
        attemptId: forged,
        label: privateValues[0],
        goal: privateValues[1],
        input: privateValues[2],
        path: privateValues[3],
        prompt: privateValues[4],
        result: privateValues[5],
        token: privateValues[6],
        evidence: [privateValues[7]],
      },
    },
    connection: { id: forged, label: privateValues[0] },
    get: (name) =>
      name === 'x-audit-client'
        ? JSON.stringify({ source: 'mcp', name: 'Declared client' })
        : ['x-connection-id', 'x-task-id', 'x-attempt-id'].includes(name)
          ? forged
          : undefined,
  });
  httpAudit(f.audit, req, {
    response: { result: privateValues[5], token: privateValues[6] },
  });
  const result = f.audit.export();
  const event = result.events.find(
    (item) => item.action === 'tool.terminal_run',
  );
  assert.equal(event.connectionId, null);
  assert.equal(event.taskId, null);
  assert.equal(event.attemptId, null);
  assert.equal(event.workflowId, null);
  assert.equal(result.sessions[0].connectionId, null);
  const stored =
    JSON.stringify(result) +
    (await fs.readFile(path.join(f.root, 'activity.sqlite'))).toString('utf8');
  assert.ok(!stored.includes(forged));
  for (const value of privateValues) assert.ok(!stored.includes(value));
});

test('HTTP audit separates task IDs from workflows and uses only prepared active binding metadata', async (t) => {
  const f = await fixture(t);
  const taskId = randomUUID(),
    workflowId = randomUUID(),
    connectionId = randomUUID(),
    attemptId = randomUUID();
  const request = (name, id = taskId) =>
    agent({
      path: '/call',
      method: 'POST',
      body: { name, args: { id } },
      get: () => undefined,
    });
  httpAudit(f.audit, request('task_get'));
  const task = f.audit
    .read()
    .events.find((event) => event.action === 'tool.task_get');
  assert.equal(task.workflowId, null);
  assert.equal(task.taskId, null);
  httpAudit(f.audit, request('workflow_get', workflowId));
  assert.equal(
    f.audit.read().events.find((event) => event.action === 'tool.workflow_get')
      .workflowId,
    workflowId,
  );
  httpAudit(f.audit, request('task_start'), {
    prepare: (req) => {
      assert.equal(req.auditClient.source, 'api');
      req.connectionId = connectionId;
      req.taskId = taskId;
      req.attemptId = attemptId;
      req.auditWorkflowId = workflowId;
    },
  });
  const prepared = f.audit
    .read()
    .events.find((event) => event.action === 'tool.task_start');
  assert.equal(prepared.connectionId, connectionId);
  assert.equal(prepared.taskId, taskId);
  assert.equal(prepared.attemptId, attemptId);
  assert.equal(prepared.workflowId, workflowId);
  httpAudit(
    f.audit,
    agent({
      path: `/workflows/${workflowId}/use`,
      method: 'POST',
      body: { inputs: { private: 'not activity' } },
      get: () => undefined,
    }),
  );
  assert.equal(
    f.audit.read().events.find((event) => event.action === 'skill.handoff')
      .workflowId,
    workflowId,
  );
  const malformed = f.audit.start(
    agent({
      connectionId: [connectionId],
      taskId: { id: taskId },
      attemptId: 'private-non-uuid',
    }),
    'tool.task_get',
    { workflowId: [workflowId] },
  );
  f.audit.finish(malformed);
  const ignored = f.audit.read().events.find((event) => event.id === malformed);
  assert.equal(ignored.connectionId, null);
  assert.equal(ignored.taskId, null);
  assert.equal(ignored.attemptId, null);
  assert.equal(ignored.workflowId, null);
  assert.equal(f.audit.healthy, true);
});

test('owner assignment and connection actions are fixed; owner polling is quiet and agents cannot read owner history silently', () => {
  const cases = [
    ['/owner/connections', 'POST', 'connection.create'],
    ['/connections/private-label/revoke', 'POST', 'connection.revoke'],
    ['/owner/connections/private-label/revoke', 'POST', 'connection.revoke'],
    ['/legacy', 'POST', 'connection.legacy'],
    ['/owner/legacy', 'POST', 'connection.legacy'],
    ['/tasks', 'POST', 'task.assign'],
    ['/tasks/private-task', 'GET', 'task.read'],
    ['/tasks/private-task/cancel', 'POST', 'task.cancel'],
    ['/tasks/private-task/verify', 'POST', 'task.verify'],
  ];
  for (const [route, method, action] of cases)
    assert.equal(
      activityAction({
        path: route,
        method,
        kind: 'human',
        body: { goal: 'private', label: 'private' },
      }),
      action,
    );
  for (const route of [
    '/connections',
    '/owner/connections',
    '/tasks',
    '/attempts',
    '/attempts/private',
  ])
    assert.equal(
      activityAction({ path: route, method: 'GET', kind: 'human' }),
      null,
    );
  for (const [route, action] of [
    ['/connections', 'connection.denied'],
    ['/owner/connections', 'connection.denied'],
    ['/tasks', 'task.denied'],
    ['/tasks/private', 'task.denied'],
    ['/attempts/private', 'attempt.denied'],
  ])
    assert.equal(
      activityAction({ path: route, method: 'GET', kind: 'agent' }),
      action,
    );
  assert.equal(
    activityAction({
      path: '/tasks/private-task/verify/extra',
      method: 'POST',
      kind: 'human',
    }),
    null,
  );
});

test('activity persists scoped sessions and allowlisted outcomes without payloads; clocks cannot corrupt tool durations', async (t) => {
  const f = await fixture(t),
    req = agent();
  req.body = {
    command: 'private-command',
    path: 'private-path',
    text: 'private-text',
  };
  const operationId = randomUUID();
  const id = f.audit.start(req, 'tool.terminal_run', { operationId });
  f.tick(1200);
  f.wall(-60000);
  f.audit.finish(id, {
    outcome: 'failed',
    code: 'nonzero_exit',
    exitCode: 7,
    stdout: 'private-output',
    message: 'private-message',
  });
  const result = f.audit.export();
  const event = result.events.find((e) => e.id === id);
  assert.equal(event.durationMs, 1200);
  assert.equal(event.operationId, operationId);
  assert.equal(event.actor, req.actor);
  assert.equal(event.client.name, 'QA agent');
  assert.equal(event.outcome, 'failed');
  assert.equal(event.exitCode, 7);
  assert.equal(result.summary.toolMs, 1200);
  for (const value of [
    'private-command',
    'private-path',
    'private-text',
    'private-output',
    'private-message',
  ])
    assert.ok(!JSON.stringify(result).includes(value));
  if (process.platform !== 'win32')
    assert.equal(
      (await fs.stat(path.join(f.root, 'activity.sqlite'))).mode & 0o777,
      0o600,
    );
  await f.restart();
  assert.equal(
    f.audit.export().events.find((e) => e.id === id).outcome,
    'failed',
  );
});

test('crash recovery never marks pending effects successful or invents a tool duration', async (t) => {
  const f = await fixture(t),
    req = agent();
  const id = f.audit.start(req, 'tool.files_write');
  const lease = new Lease({
    now: () => f.audit.now(),
    ttl: 90000,
    onChange: (...args) => f.audit.control(...args),
  });
  lease.claim(req.actor, 'agent');
  f.tick(3600000);
  await f.restart();
  const result = f.audit.export();
  const event = result.events.find((e) => e.id === id);
  assert.equal(event.outcome, 'interrupted');
  assert.equal(event.code, 'runtime_restart');
  assert.equal(event.durationMs, null);
  assert.equal(result.controlIntervals[0].rangeMs, 90000);
  assert.equal(result.sessions[0].reason, 'runtime_restart');
  const id2 = f.audit.start(req, 'tool.files_read');
  f.audit.finish(id2);
  assert.notEqual(
    f.audit.export().events.find((e) => e.id === id2).sessionId,
    event.sessionId,
  );
});

test('lease timing is exclusive, scoped to authenticated access and capped on expiry', async (t) => {
  const f = await fixture(t),
    a = agent(),
    human = { actor: `human:${randomUUID()}`, kind: 'human' };
  f.audit.touch(a, true);
  f.audit.touch(human, true);
  f.audit.touch({ ...a, readOnly: true }, true);
  const lease = new Lease({
    now: () => f.audit.now(),
    ttl: 100,
    onChange: (...args) => f.audit.control(...args),
  });
  lease.claim(a.actor, 'agent');
  f.tick(40);
  lease.claim(human.actor, 'human', { takeover: true });
  f.tick(30);
  lease.release(human.actor);
  const first = f.audit.export();
  const work = first.sessions.find((s) => s.access === 'work'),
    read = first.sessions.find((s) => s.access === 'read');
  assert.equal(first.controlIntervals[0].sessionId, work.id);
  assert.notEqual(first.controlIntervals[0].sessionId, read.id);
  assert.equal(first.summary.controlMs, 70);
  assert.equal(first.controlIntervals[0].reason, 'takeover');
  lease.claim(a.actor, 'agent');
  f.tick(200);
  assert.equal(lease.status(), null);
  assert.equal(f.audit.read().summary.controlMs, 170);
});

test('bounded retention removes complete old sessions and never loses retained session attribution', async (t) => {
  const f = await fixture(t, { sessions: 1, events: 10 }),
    a = agent(),
    b = agent();
  const first = f.audit.start(a, 'tool.files_read');
  f.audit.finish(first);
  f.audit.end(a);
  f.tick(100);
  const second = f.audit.start(b, 'tool.files_read');
  f.audit.finish(second);
  const result = f.audit.export();
  assert.equal(result.sessions.length, 1);
  assert.equal(result.sessions[0].actor, b.actor);
  assert.equal(
    result.events.find((e) => e.id === second).sessionId,
    result.sessions[0].id,
  );
  assert.ok(!result.events.some((e) => e.id === first));
  assert.ok(result.retention.prunedEvents >= 1);
  assert.throws(() => f.audit.start(agent(), 'tool.files_read'), {
    code: 'activity_limit',
  });
  assert.equal(f.audit.export().sessions.length, 1);
  f.tick(5 * 60000 + 1);
  f.audit.prune();
  const third = f.audit.start(agent(), 'tool.files_read');
  f.audit.finish(third);
  assert.equal(f.audit.export().sessions.length, 1);
});

test('paging, filters, pending bounds and retention preserve running effects', async (t) => {
  const f = await fixture(t, { pending: 2, events: 2 }),
    a = agent();
  const x = f.audit.start(a, 'tool.files_read'),
    y = f.audit.start(a, 'tool.files_list');
  assert.throws(() => f.audit.start(a, 'tool.files_write'), {
    code: 'activity_limit',
  });
  f.audit.prune();
  assert.equal(f.audit.read().summary.running, 2);
  f.audit.finish(x);
  f.audit.finish(y);
  let result = f.audit.read({ limit: '1' });
  assert.equal(result.events.length, 1);
  assert.ok(result.nextCursor);
  const earlier = f.audit.read({ limit: '1', before: result.nextCursor });
  assert.ok(earlier.events[0].id < result.events[0].id);
  assert.equal(
    f.audit.read({ session: result.sessions[0].id }).summary.operations,
    2,
  );
  for (const bad of [
    { days: '100' },
    { limit: '999' },
    { session: '../../private' },
    { before: 'NaN' },
    { days: ['7', '90'] },
  ])
    assert.throws(() => f.audit.read(bad), { code: 'invalid_activity_filter' });
  for (let i = 0; i < 3; i++) {
    const id = f.audit.start(a, 'tool.files_read');
    f.audit.finish(id);
  }
  f.audit.prune();
  result = f.audit.export();
  assert.ok(result.events.length <= 2);
  assert.ok(result.retention.prunedEvents >= 3);
});

test('maintenance does not relabel client identity; requests retain changed declared metadata', async (t) => {
  const f = await fixture(t),
    a = agent();
  const id = f.audit.start(a, 'tool.files_read');
  f.audit.finish(id);
  f.tick(20000);
  f.audit.touch({ ...a, auditClient: { source: 'mcp' } });
  assert.equal(f.audit.read().sessions[0].client.mixed, false);
  const changed = f.audit.start(
    { ...a, auditClient: { source: 'mcp', name: 'Another declared client' } },
    'tool.files_list',
  );
  f.audit.finish(changed);
  assert.equal(f.audit.read().sessions[0].client.mixed, true);
  assert.equal(f.audit.read().events[0].client.name, 'Another declared client');
});

test('metadata and HTTP audit use fixed actions; all errors override preliminary tool results', () => {
  assert.deepEqual(
    declaredClient(
      'mcp',
      { name: 'unsafe\nvalue', version: 'x\r\n' },
      'unknown',
    ),
    { source: 'mcp' },
  );
  const req = {
    kind: 'agent',
    get: () =>
      JSON.stringify({ source: 'mcp', name: 'Agent', extra: 'private' }),
  };
  assert.throws(() => clientMetadata(req), { code: 'invalid_client' });
  assert.equal(
    activityAction({ path: '/call', body: { name: 'unknown-private-name' } }),
    'tool.unknown',
  );
  assert.equal(
    activityAction({
      path: '/call',
      body: { name: 'terminal_run', args: { command: 'private' } },
    }),
    'tool.terminal_run',
  );
  assert.equal(
    activityAction({ path: '/call', body: { name: 'control_renew' } }),
    null,
  );
  assert.equal(
    activityAction({
      path: '/workflows/uuid/use',
      body: { expectedRevision: 'not logged', intent: 'plan' },
    }),
    'skill.handoff',
  );
  assert.equal(
    activityAction({ path: '/workflows/uuid/use/private-input' }),
    null,
  );
  const errorReq = { auditOutcome: { outcome: 'success', exitCode: 0 } };
  activityFault(errorReq, new Error('private detail'));
  assert.deepEqual(errorReq.auditOutcome, {
    outcome: 'failed',
    code: 'operation_failed',
  });
  activityFault(errorReq, new Fault('lease_lost', 'private detail'));
  assert.equal(errorReq.auditOutcome.outcome, 'cancelled');
});

test('session truncation is explicit and export includes every retained matching session', async (t) => {
  const f = await fixture(t);
  for (let i = 0; i < 101; i++) {
    const req = agent();
    const id = f.audit.start(req, 'tool.files_read');
    f.audit.finish(id);
    f.audit.end(req);
  }
  const page = f.audit.read();
  assert.equal(page.sessions.length, 100);
  assert.equal(page.summary.sessions, 101);
  assert.equal(page.sessionsTruncated, true);
  const exported = f.audit.export();
  assert.equal(exported.sessions.length, 101);
  assert.equal(exported.sessionsTruncated, false);
});

test('saturated ordinary operations retain bounded takeover, cancellation and cleanup capacity', async (t) => {
  const f = await fixture(t, { pending: 1 }),
    a = agent(),
    human = { actor: `human:${randomUUID()}`, kind: 'human' };
  const pending = f.audit.start(a, 'tool.terminal_run');
  assert.throws(() => f.audit.start(agent(), 'tool.files_read'), {
    code: 'activity_limit',
  });
  const takeover = f.audit.start(human, 'control.takeover');
  f.audit.finish(takeover);
  const cancel = f.audit.start(a, 'operation.cancel');
  f.audit.finish(cancel);
  const cleanup = ['teach.stop', 'tool.control_release', 'session.end'].map(
    (action) => f.audit.start(human, action),
  );
  const lastSlot = f.audit.start(a, 'operation.cancel');
  assert.throws(() => f.audit.start(human, 'teach.stop'), {
    code: 'activity_limit',
  });
  for (const id of [...cleanup, lastSlot]) f.audit.finish(id);
  f.audit.finish(pending, { outcome: 'cancelled', code: 'lease_lost' });
  assert.equal(f.audit.read().summary.running, 0);
});

test('the database pins identity and storage failure rejects effects without silently resetting history', async (t) => {
  const f = await fixture(t),
    req = agent();
  const id = f.audit.start(req, 'tool.files_write');
  f.audit.finish(id);
  const wrong = new Audit(f.root, { ...f.identity, workspaceId: randomUUID() });
  await assert.rejects(wrong.init(), { code: 'audit_identity_mismatch' });
  wrong.db.close();
  assert.ok(f.audit.export().events.some((e) => e.id === id));
  f.audit.db.exec('DROP TABLE controls');
  assert.throws(
    () =>
      f.audit.control(
        null,
        {
          owner: req.actor,
          kind: 'agent',
          generation: randomUUID(),
          expiresAt: f.audit.now() + 100,
        },
        'acquired',
      ),
    { code: 'audit_unavailable' },
  );
  assert.equal(f.audit.healthy, false);
  assert.throws(() => f.audit.start(req, 'tool.files_write'), {
    code: 'audit_unavailable',
  });
  assert.ok(f.audit.db.prepare('SELECT id FROM events WHERE id=?').get(id));
});

test('agent session saturation preserves owner observation capacity', async (t) => {
  const f = await fixture(t, { sessions: 2, ownerSessions: 1 }),
    a = agent();
  const id = f.audit.start(a, 'tool.files_read');
  f.audit.finish(id);
  assert.throws(() => f.audit.start(agent(), 'tool.files_read'), {
    code: 'activity_limit',
  });
  const human = { actor: `human:${randomUUID()}`, kind: 'human' };
  const takeover = f.audit.start(human, 'control.takeover');
  f.audit.finish(takeover);
  assert.equal(f.audit.read().summary.sessions, 2);
});

test('graceful audit shutdown closes pending observations and tolerates late network completion', async (t) => {
  const f = await fixture(t),
    req = agent();
  const id = f.audit.start(req, 'desktop.view');
  f.tick(120);
  f.audit.close();
  f.audit.close();
  f.audit.finish(id);
  assert.throws(() => f.audit.start(req, 'tool.files_write'), {
    code: 'audit_unavailable',
  });
  const reopened = new Audit(f.root, f.identity, {
    now: f.audit.now,
    monotonic: f.audit.monotonic,
  });
  await reopened.init();
  const event = reopened.export().events.find((e) => e.id === id);
  assert.equal(event.outcome, 'interrupted');
  assert.equal(event.code, 'runtime_stop');
  assert.equal(event.durationMs, 120);
  reopened.close();
});

test('audit persistence failure prevents new control but cannot prevent revocation and cancellation', async () => {
  let fail = false;
  const lease = new Lease({
    onChange: () => {
      if (fail) throw new Fault('audit_unavailable', 'No storage');
    },
  });
  lease.claim('a', 'agent');
  let aborted = false;
  const running = lease.run(
    'a',
    (signal) =>
      new Promise((resolve) =>
        signal.addEventListener('abort', () => {
          aborted = true;
          resolve();
        }),
      ),
  );
  fail = true;
  await assert.rejects(lease.take('b'), {
    code: 'audit_unavailable',
  });
  assert.equal(lease.current, null);
  assert.equal(aborted, true);
  await assert.rejects(running, { code: 'lease_lost' });
  assert.throws(() => lease.claim('b', 'agent'), { code: 'audit_unavailable' });
  assert.equal(lease.current, null);
});
