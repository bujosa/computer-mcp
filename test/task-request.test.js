import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prepareComputerTask, taskRequestLimits } from '../src/task-request.js';

const identity = () => ({
  computerId: randomUUID(),
  workspaceId: randomUUID(),
});
const task = () => ({
  goal: 'Create a report from the supplied guest CSV.',
  expectedResult: 'A JSON report reconciles with the input rows.',
  scope: 'Use only the new report directory; no installs or external actions.',
});

test('general task handoff pins both identities, defaults to planning and does not modify requirements', () => {
  const ids = identity(),
    input = task(),
    before = structuredClone(input);
  const packet = prepareComputerTask(ids, input);
  assert.deepEqual(input, before);
  assert.equal(packet.intent, 'plan');
  assert.equal(packet.computerId, ids.computerId);
  assert.equal(packet.workspaceId, ids.workspaceId);
  assert.ok(packet.request.includes(JSON.stringify(ids)));
  assert.ok(packet.request.includes(JSON.stringify(input, null, 2)));
  assert.deepEqual(Object.keys(packet).sort(), [
    'computerId',
    'intent',
    'request',
    'version',
    'workspaceId',
  ]);
});

test('read-only task preparation supports observation/planning but rejects execution and unknown authority', () => {
  assert.equal(
    prepareComputerTask(identity(), task(), { access: 'read' }).intent,
    'plan',
  );
  assert.throws(
    () =>
      prepareComputerTask(
        identity(),
        { ...task(), intent: 'execute' },
        { access: 'read' },
      ),
    { code: 'work_access_required' },
  );
  assert.equal(
    prepareComputerTask(identity(), { ...task(), intent: 'execute' }).intent,
    'execute',
  );
  assert.throws(
    () => prepareComputerTask(identity(), task(), { access: 'owner' }),
    { code: 'invalid_access' },
  );
});

test('missing identities, unsupported fields, empty outcomes and oversized requirements fail without echoing content', () => {
  assert.throws(
    () => prepareComputerTask({ computerId: randomUUID() }, task()),
    { code: 'identity_unavailable' },
  );
  assert.throws(
    () =>
      prepareComputerTask(identity(), { ...task(), token: 'private-marker' }),
    { code: 'invalid_task' },
  );
  assert.throws(
    () => prepareComputerTask(identity(), { ...task(), expectedResult: '  ' }),
    { code: 'incomplete_task' },
  );
  for (const [name, limit] of Object.entries(taskRequestLimits))
    assert.throws(
      () =>
        prepareComputerTask(identity(), {
          ...task(),
          [name]: 'x'.repeat(limit + 1),
        }),
      { code: 'invalid_task' },
    );
});

test('owner text remains literal JSON with quotes/newlines and never changes request identities or intent', () => {
  const ids = identity(),
    input = {
      ...task(),
      goal: 'Report "quoted" values\n```\n<script>alert(1)</script>',
      scope: '',
    };
  const packet = prepareComputerTask(ids, input);
  assert.equal(packet.intent, 'plan');
  assert.ok(packet.request.includes(JSON.stringify(input, null, 2)));
  assert.equal(packet.computerId, ids.computerId);
  assert.equal(packet.workspaceId, ids.workspaceId);
});
