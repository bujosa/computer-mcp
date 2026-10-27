import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  Operations,
  actorForConnection,
  actorForLegacy,
} from '../runtime/operations.js';
import {
  connectionCreateSchema,
  connectionPublicSchema,
  taskCreateSchema,
  taskFinishSchema,
  taskVerifySchema,
} from '../src/operations-contract.js';

const human = () => `human:${randomUUID()}`;
const taskInput = (connectionId, overrides = {}) => ({
  requestId: randomUUID(),
  connectionId,
  name: 'Publish the report',
  goal: 'Create the requested report from the current source.',
  expectedResult: 'The report exists and its totals reconcile.',
  scope: 'Only the supplied source and a new output file.',
  ...overrides,
});

async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-operations-'));
  const identity = {
    computerId: randomUUID(),
    workspaceId: randomUUID(),
    bootId: randomUUID(),
  };
  const operations = await new Operations(root, identity, options).init();
  t.after(async () => {
    operations.close();
    await fs.rm(root, { recursive: true, force: true });
  });
  return { root, identity, operations };
}

function namedSession(operations, connection, sessionId = randomUUID()) {
  const actor = actorForConnection(connection.id, sessionId);
  operations.touch(connection.id, actor, {
    source: 'mcp',
    name: 'Test harness',
    version: '1.0.0',
    protocol: '2026-07-28',
  });
  return actor;
}

function start(operations, task, connection, actor) {
  const leaseGeneration = randomUUID();
  operations.prepareStart(task.id, {
    actor,
    connectionId: connection.id,
  });
  const running = operations.startTask(task.id, {
    actor,
    connectionId: connection.id,
    leaseGeneration,
  });
  return { running, leaseGeneration };
}

test('legacy actors are credential-scoped and cannot copy a named actor identity', () => {
  const connectionId = randomUUID();
  const named = actorForConnection(connectionId, randomUUID());
  const namedUuidAsSession = named.slice('agent:'.length);
  const workSecret = 'a'.repeat(64);
  const readSecret = 'b'.repeat(64);
  const legacyWork = actorForLegacy(workSecret, namedUuidAsSession);
  const legacyRead = actorForLegacy(readSecret, namedUuidAsSession);

  assert.match(
    legacyWork,
    /^agent:[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  assert.equal(actorForLegacy(workSecret, namedUuidAsSession), legacyWork);
  assert.notEqual(legacyWork, named);
  assert.notEqual(legacyRead, named);
  assert.notEqual(legacyRead, legacyWork);
  assert.throws(() => actorForLegacy('not-a-secret', randomUUID()), {
    code: 'invalid_legacy_credential',
  });
});

test('named connection secrets are hash-only, scoped, revocable and independently attributed', async (t) => {
  let now = Date.UTC(2026, 9, 17);
  const f = await fixture(t, { now: () => now, legacyEnabled: false });
  const owner = human();
  const first = f.operations.createConnection(
    { label: 'build-agent', access: 'work' },
    owner,
  );
  const second = f.operations.createConnection(
    { label: 'review-agent', access: 'read' },
    owner,
  );
  assert.match(first.secret, /^[0-9a-f]{64}$/);
  assert.equal(
    connectionPublicSchema.safeParse(first.connection).success,
    true,
  );
  assert.ok(!JSON.stringify(first.connection).includes(first.secret));
  const stored = f.operations.db
    .prepare('SELECT secret_hash FROM connections WHERE id=?')
    .get(first.connection.id).secret_hash;
  assert.match(stored, /^[0-9a-f]{64}$/);
  assert.notEqual(stored, first.secret);
  assert.equal(f.operations.authenticate(first.secret).id, first.connection.id);
  assert.equal(f.operations.authenticate('0'.repeat(64)), null);
  assert.equal(f.operations.getLegacyEnabled(), false);

  const copiedSession = randomUUID();
  const firstActor = actorForConnection(first.connection.id, copiedSession);
  const secondActor = actorForConnection(second.connection.id, copiedSession);
  assert.notEqual(firstActor, secondActor);
  f.operations.touch(first.connection.id, firstActor, { source: 'mcp' });
  assert.throws(
    () =>
      f.operations.touch(second.connection.id, firstActor, { source: 'mcp' }),
    { code: 'session_identity_mismatch' },
  );
  f.operations.touch(second.connection.id, secondActor, { source: 'mcp' });
  assert.equal(f.operations.controller(firstActor).label, 'build-agent');
  assert.equal(f.operations.controller(`agent:${randomUUID()}`), null);

  now += 1000;
  const revoked = f.operations.revokeConnection(first.connection.id, owner);
  assert.ok(revoked.revokedAt);
  assert.equal(revoked.sessions[0].reason, 'connection_revoked');
  assert.throws(() => f.operations.authenticate(first.secret), {
    code: 'connection_revoked',
  });
  assert.equal(
    f.operations.authenticate(second.secret).id,
    second.connection.id,
  );
  assert.deepEqual(
    f.operations.revokeConnection(first.connection.id, owner),
    revoked,
  );

  if (process.platform !== 'win32') {
    assert.equal((await fs.stat(f.root)).mode & 0o777, 0o700);
    assert.equal(
      (await fs.stat(path.join(f.root, 'operations.sqlite'))).mode & 0o777,
      0o600,
    );
  }
});

test('strict contracts reject unknown authority and task payload fields', () => {
  assert.equal(
    connectionCreateSchema.safeParse({
      label: 'agent',
      access: 'work',
      token: 'private',
    }).success,
    false,
  );
  assert.equal(
    taskCreateSchema.safeParse({
      ...taskInput(randomUUID()),
      command: 'private',
    }).success,
    false,
  );
  assert.equal(
    taskFinishSchema.safeParse({
      outcome: 'success',
      summary: 'done',
      evidence: [],
      verified: true,
    }).success,
    false,
  );
  for (const report of [
    { outcome: 'success', summary: ' ', evidence: [] },
    { outcome: 'success', summary: `${'x'.repeat(2000)} `, evidence: [] },
    { outcome: 'success', summary: 'done', evidence: [' '] },
    {
      outcome: 'success',
      summary: 'done',
      evidence: [`${'x'.repeat(500)} `],
    },
  ])
    assert.equal(taskFinishSchema.safeParse(report).success, false);
  assert.deepEqual(
    taskFinishSchema.parse({
      outcome: 'success',
      summary: '  done  ',
      evidence: ['  report readback  '],
    }),
    {
      outcome: 'success',
      summary: 'done',
      evidence: ['report readback'],
    },
  );
  assert.equal(
    taskVerifySchema.safeParse({
      expectedRevision: 1,
      verdict: 'verified',
      notes: ' ',
    }).success,
    false,
  );
});

test('owner task creation is bounded, idempotent and private from connection metadata', async (t) => {
  const f = await fixture(t);
  const owner = human();
  const work = f.operations.createConnection(
    { label: 'worker', access: 'work' },
    owner,
  ).connection;
  const read = f.operations.createConnection(
    { label: 'observer', access: 'read' },
    owner,
  ).connection;
  const input = taskInput(work.id, {
    workflow: { id: randomUUID(), revision: randomUUID() },
  });
  const created = f.operations.createTask(input, owner);
  assert.equal(created.status, 'queued');
  assert.equal(created.revision, 1);
  assert.deepEqual(created.workflow, input.workflow);
  assert.equal(created.attempt, null);
  assert.deepEqual(f.operations.createTask(input, owner), created);
  assert.throws(
    () =>
      f.operations.createTask(
        { ...input, goal: 'Use the same request identity differently.' },
        owner,
      ),
    { code: 'task_request_conflict' },
  );
  assert.throws(() => f.operations.createTask(taskInput(read.id), owner), {
    code: 'work_access_required',
  });
  assert.throws(() => f.operations.task(created.id, read.id), {
    code: 'task_forbidden',
  });
  assert.equal(f.operations.tasks(work.id)[0].id, created.id);
  const publicConnections = JSON.stringify(f.operations.connections());
  for (const privateValue of [input.goal, input.expectedResult, input.scope])
    assert.ok(!publicConnections.includes(privateValue));
  const stored = f.operations.db
    .prepare('SELECT goal,expected_result,scope FROM tasks WHERE id=?')
    .get(created.id);
  assert.deepEqual(
    { ...stored },
    {
      goal: input.goal,
      expected_result: input.expectedResult,
      scope: input.scope,
    },
  );
});

test('one lease-bound attempt owns effects and start retries cannot change its binding', async (t) => {
  const f = await fixture(t);
  const owner = human();
  const first = f.operations.createConnection(
    { label: 'first-worker', access: 'work' },
    owner,
  ).connection;
  const second = f.operations.createConnection(
    { label: 'second-worker', access: 'work' },
    owner,
  ).connection;
  const firstActor = namedSession(f.operations, first);
  const secondActor = namedSession(f.operations, second);
  const workflow = { id: randomUUID(), revision: randomUUID() };
  const firstTask = f.operations.createTask(
    taskInput(first.id, { workflow }),
    owner,
  );
  const secondTask = f.operations.createTask(taskInput(second.id), owner);
  const { running, leaseGeneration } = start(
    f.operations,
    firstTask,
    first,
    firstActor,
  );
  assert.equal(running.status, 'running');
  assert.equal(running.attempt.actor, firstActor);
  assert.equal(running.attempt.verification, null);
  const duplicate = f.operations.startTask(firstTask.id, {
    actor: firstActor,
    connectionId: first.id,
    leaseGeneration,
  });
  assert.equal(duplicate.attempt.id, running.attempt.id);
  assert.throws(
    () =>
      f.operations.startTask(firstTask.id, {
        actor: firstActor,
        connectionId: first.id,
        leaseGeneration: randomUUID(),
      }),
    { code: 'attempt_binding_changed' },
  );
  assert.throws(
    () =>
      f.operations.prepareStart(secondTask.id, {
        actor: secondActor,
        connectionId: second.id,
      }),
    { code: 'computer_busy' },
  );
  const binding = f.operations.assertEffect({
    actor: firstActor,
    connectionId: first.id,
    leaseGeneration,
  });
  assert.equal(binding.id, running.attempt.id);
  assert.equal(binding.taskId, firstTask.id);
  assert.deepEqual(binding.workflow, workflow);
  assert.deepEqual(f.operations.activeAttempt(firstActor), binding);
  assert.throws(
    () =>
      f.operations.assertEffect({
        actor: firstActor,
        connectionId: first.id,
        leaseGeneration: randomUUID(),
      }),
    { code: 'task_required' },
  );
  assert.throws(() => f.operations.assertWorkflowIdle(workflow.id), {
    code: 'workflow_in_use',
  });
});

test('reports are idempotent but remain distinct from exact-revision owner verification', async (t) => {
  const f = await fixture(t);
  const owner = human();
  const connection = f.operations.createConnection(
    { label: 'reporter', access: 'work' },
    owner,
  ).connection;
  const other = f.operations.createConnection(
    { label: 'other-reporter', access: 'work' },
    owner,
  ).connection;
  const session = namedSession(f.operations, connection);
  const otherSession = namedSession(f.operations, other);
  const queued = f.operations.createTask(taskInput(connection.id), owner);
  assert.throws(
    () =>
      f.operations.verifyTask(
        queued.id,
        {
          expectedRevision: queued.revision,
          verdict: 'verified',
          notes: 'Checked the output.',
        },
        owner,
      ),
    { code: 'task_not_verifiable' },
  );
  const { running } = start(f.operations, queued, connection, session);
  assert.throws(
    () =>
      f.operations.finishTask(queued.id, {
        actor: otherSession,
        connectionId: other.id,
        outcome: 'success',
        summary: 'Wrong session.',
        evidence: [],
      }),
    { code: 'task_forbidden' },
  );
  for (const invalid of [
    { summary: ' ', evidence: [] },
    { summary: `${'x'.repeat(2000)} `, evidence: [] },
    { summary: 'Observed output.', evidence: [' '] },
    { summary: 'Observed output.', evidence: [`${'x'.repeat(500)} `] },
  ])
    assert.throws(
      () =>
        f.operations.finishTask(queued.id, {
          actor: session,
          connectionId: connection.id,
          outcome: 'success',
          ...invalid,
        }),
      { code: 'invalid_task_report' },
    );
  const report = {
    actor: session,
    connectionId: connection.id,
    outcome: 'success',
    summary: '  The report was read back and reconciled.  ',
    evidence: ['  report.json totals match the source  '],
  };
  const finished = f.operations.finishTask(queued.id, report);
  assert.equal(finished.status, 'reported_success');
  assert.equal(finished.attempt.verification, null);
  assert.deepEqual(finished.attempt.report, {
    outcome: 'success',
    summary: 'The report was read back and reconciled.',
    evidence: ['report.json totals match the source'],
  });
  assert.deepEqual(
    f.operations.finishTask(queued.id, {
      ...report,
      summary: report.summary.trim(),
      evidence: report.evidence.map((item) => item.trim()),
    }),
    finished,
  );
  assert.throws(
    () =>
      f.operations.finishTask(queued.id, {
        ...report,
        summary: 'A conflicting report.',
      }),
    { code: 'task_report_conflict' },
  );
  assert.throws(
    () =>
      f.operations.verifyTask(
        queued.id,
        {
          expectedRevision: running.revision,
          verdict: 'verified',
          notes: 'Checked the output.',
        },
        owner,
      ),
    { code: 'task_changed' },
  );
  const verified = f.operations.verifyTask(
    queued.id,
    {
      expectedRevision: finished.revision,
      verdict: 'verified',
      notes:
        'I inspected the saved file and independently recalculated totals.',
    },
    owner,
  );
  assert.equal(verified.status, 'reported_success');
  assert.equal(verified.revision, finished.revision + 1);
  assert.deepEqual(verified.attempt.verification, {
    verdict: 'verified',
    actor: owner,
    notes: 'I inspected the saved file and independently recalculated totals.',
    at: verified.attempt.verification.at,
  });
});

test('lease loss, revocation and guarded owner cancellation preserve terminal uncertainty', async (t) => {
  const f = await fixture(t);
  const owner = human();
  const first = f.operations.createConnection(
    { label: 'interruptible', access: 'work' },
    owner,
  );
  const actor = namedSession(f.operations, first.connection);
  const task = f.operations.createTask(taskInput(first.connection.id), owner);
  start(f.operations, task, first.connection, actor);
  const interrupted = f.operations.interruptActor(actor, 'lease_released');
  assert.equal(interrupted.status, 'interrupted');
  assert.equal(interrupted.attempt.interruptionReason, 'lease_released');
  assert.equal(interrupted.attempt.partialEffects, 'unknown');
  assert.throws(
    () =>
      f.operations.finishTask(task.id, {
        actor,
        connectionId: first.connection.id,
        outcome: 'success',
        summary: 'Too late.',
        evidence: [],
      }),
    { code: 'task_report_conflict' },
  );

  const queued = f.operations.createTask(taskInput(first.connection.id), owner);
  assert.throws(
    () =>
      f.operations.cancelTask(
        queued.id,
        { expectedRevision: queued.revision + 1 },
        owner,
      ),
    { code: 'task_changed' },
  );
  const cancelled = f.operations.cancelTask(
    queued.id,
    { expectedRevision: queued.revision },
    owner,
  );
  assert.equal(cancelled.status, 'cancelled');
  assert.deepEqual(
    f.operations.cancelTask(
      queued.id,
      { expectedRevision: queued.revision },
      owner,
    ),
    cancelled,
  );

  const secondTask = f.operations.createTask(
    taskInput(first.connection.id),
    owner,
  );
  start(f.operations, secondTask, first.connection, actor);
  f.operations.revokeConnection(first.connection.id, owner);
  const revokedTask = f.operations.task(secondTask.id);
  assert.equal(revokedTask.status, 'interrupted');
  assert.equal(revokedTask.attempt.interruptionReason, 'connection_revoked');
  assert.throws(
    () =>
      f.operations.finishTask(secondTask.id, {
        actor,
        connectionId: first.connection.id,
        outcome: 'failure',
        summary: 'Revoked.',
        evidence: [],
      }),
    { code: 'connection_revoked' },
  );
});

test('a new boot closes presence and interrupts only unfinished attempts', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-ops-restart-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const base = {
    computerId: randomUUID(),
    workspaceId: randomUUID(),
    bootId: randomUUID(),
  };
  const owner = human();
  const first = await new Operations(root, base, {
    legacyEnabled: false,
  }).init();
  const connection = first.createConnection(
    { label: 'restart-worker', access: 'work' },
    owner,
  );
  const actor = namedSession(first, connection.connection);
  const running = first.createTask(taskInput(connection.connection.id), owner);
  start(first, running, connection.connection, actor);
  const queued = first.createTask(taskInput(connection.connection.id), owner);
  first.db.close();
  first.closed = true;

  const second = await new Operations(
    root,
    { ...base, bootId: randomUUID() },
    { legacyEnabled: true },
  ).init();
  t.after(() => second.close());
  const recovered = second.task(running.id);
  assert.equal(recovered.status, 'interrupted');
  assert.equal(recovered.attempt.interruptionReason, 'runtime_restart');
  assert.equal(second.task(queued.id).status, 'queued');
  assert.equal(
    second.connection(connection.connection.id).sessions[0].reason,
    'runtime_restart',
  );
  assert.equal(second.getLegacyEnabled(), false);
  assert.equal(
    second.authenticate(connection.secret).id,
    connection.connection.id,
  );
});

test('foreign identities, live-record limits and storage failures fail closed', async (t) => {
  let now = Date.UTC(2026, 9, 17);
  const f = await fixture(t, {
    now: () => now,
    limits: { connections: 1, tasks: 1, attempts: 1, presence: 1, days: 1 },
  });
  const owner = human();
  const connection = f.operations.createConnection(
    { label: 'capacity-worker', access: 'work' },
    owner,
  );
  assert.throws(
    () =>
      f.operations.createConnection(
        { label: 'another-worker', access: 'work' },
        owner,
      ),
    { code: 'connection_limit' },
  );
  const actor = namedSession(f.operations, connection.connection);
  const queued = f.operations.createTask(
    taskInput(connection.connection.id),
    owner,
  );
  assert.throws(
    () => f.operations.createTask(taskInput(connection.connection.id), owner),
    { code: 'task_limit' },
  );
  const { running } = start(f.operations, queued, connection.connection, actor);
  f.operations.finishTask(queued.id, {
    actor,
    connectionId: connection.connection.id,
    outcome: 'failure',
    summary: 'Expected fixture failure.',
    evidence: [],
  });
  now += 2 * 86400000;
  const replacement = f.operations.createTask(
    taskInput(connection.connection.id),
    owner,
  );
  assert.notEqual(replacement.id, running.id);
  assert.throws(() => f.operations.task(queued.id), { code: 'task_not_found' });

  let failures = 0;
  f.operations.onFailure = () => failures++;
  f.operations.db.exec('DROP TABLE presence');
  assert.throws(() => f.operations.connections(), {
    code: 'operations_unavailable',
  });
  assert.equal(f.operations.healthy, false);
  assert.equal(failures, 1);
  assert.throws(
    () =>
      f.operations.createConnection(
        { label: 'blocked-worker', access: 'work' },
        owner,
      ),
    { code: 'operations_unavailable' },
  );

  const foreignRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), 'cmcp-ops-foreign-'),
  );
  t.after(() => fs.rm(foreignRoot, { recursive: true, force: true }));
  const identity = {
    computerId: randomUUID(),
    workspaceId: randomUUID(),
    bootId: randomUUID(),
  };
  const original = await new Operations(foreignRoot, identity).init();
  original.db.close();
  original.closed = true;
  const foreign = new Operations(foreignRoot, {
    ...identity,
    workspaceId: randomUUID(),
    bootId: randomUUID(),
  });
  await assert.rejects(foreign.init(), {
    code: 'operations_identity_mismatch',
  });
  foreign.db.close();
  foreign.closed = true;
});
