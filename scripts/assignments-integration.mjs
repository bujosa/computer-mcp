// Real two-computer host/API/stdio contracts. No UI automation or host control.
// Creates only synthetic task/files and named grants in the explicitly owned QA PCs.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { readConfig } from '../src/config.js';
import { RuntimeClient } from '../src/client.js';
import { checkDocker, checkOwned } from '../src/docker.js';
import { readAssignedConnection } from '../src/assigned-connections.js';
import { checkConnection } from '../src/readiness.js';

assert.ok(
  process.argv[2] && process.argv[3],
  'Provide two idle, owned QA state paths and an optional artifact directory.',
);
const directory = path.resolve(
  process.argv[4] || `artifacts/assignments-${randomUUID()}`,
);
await fs.mkdir(directory, { recursive: true, mode: 0o700 });
const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const exec = promisify(execFile);
const proof = randomUUID().slice(0, 8);
const clients = [];
const grants = [];
async function computer(state) {
  state = path.resolve(state);
  const config = await readConfig(state);
  await checkDocker(config);
  assert.equal(await checkOwned(config), true);
  const ownerClient = new RuntimeClient(config, { owner: true });
  const info = await ownerClient.info();
  assert.equal(info.lease, null, 'Use idle explicitly owned QA PCs.');
  assert.equal(info.operationsVersion, 1);
  assert.equal(
    info.legacyEnabled,
    false,
    'This suite exercises new named-only defaults.',
  );
  assert.equal(
    info.connection,
    null,
    'Owner requests must not treat the HTTP socket as an agent grant.',
  );
  const ticket = await fetch(ownerClient.base + '/api/owner/ticket', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.ownerToken}`,
      'content-type': 'application/json',
    },
    body: '{}',
  });
  assert.equal(ticket.status, 200);
  const session = await fetch(ownerClient.base + '/api/ui/session', {
    method: 'POST',
    headers: { origin: ownerClient.base, 'content-type': 'application/json' },
    body: JSON.stringify(await ticket.json()),
  });
  assert.equal(session.status, 200);
  const cookie = session.headers.get('set-cookie').split(';')[0];
  async function owner(url, body, status = 200) {
    const response = await fetch(ownerClient.base + url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        cookie,
        origin: ownerClient.base,
        'content-type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let value;
    try {
      value = await response.json();
    } catch {
      throw new Error(`Non-JSON owner response: ${response.status} ${url}`);
    }
    assert.equal(
      response.status,
      status,
      `${url}: ${value.code || 'unexpected status'}`,
    );
    return value;
  }
  const call = async (name, args = {}) =>
    (await owner('/api/call', { name, args })).result;
  return { state, config, info, ownerClient, owner, call };
}
async function grant(pc, access) {
  const label = `contract-${access}-${proof}`;
  const { stdout, stderr } = await exec(
    process.execPath,
    [
      cli,
      'connection',
      'create',
      label,
      '--state',
      pc.state,
      '--root',
      path.join(directory, 'catalog'),
      '--access',
      access,
    ],
    { timeout: 15000 },
  );
  const entries = Object.entries(JSON.parse(stdout).mcpServers);
  assert.equal(entries.length, 1);
  const [key, entry] = entries[0];
  assert.ok(key.startsWith('computer-'));
  const file = entry.args[entry.args.indexOf('--connection') + 1];
  const config = await readAssignedConnection(file);
  for (const secret of [pc.config.token, pc.config.ownerToken, config.token])
    assert.ok(
      !(stdout + stderr).includes(secret),
      'CLI output contains no credentials.',
    );
  assert.equal(config.computerId, pc.info.computerId);
  const api = new RuntimeClient(config);
  await api.info();
  const result = { pc, file, config, api, key };
  grants.push(result);
  return result;
}
async function bridge(grant) {
  const client = new Client({ name: 'assigned-contract', version: '1.0' });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [cli, 'mcp', '--connection', grant.file],
      stderr: 'pipe',
    }),
  );
  clients.push(client);
  return client;
}
async function invoke(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  assert.ok(!result.isError, `${name} returned an error`);
  const json = JSON.parse(result.content[0].text);
  assert.deepEqual(
    result.structuredContent,
    json,
    `${name}: structured/text parity`,
  );
  return json;
}
async function task(grant, extra = {}) {
  return (
    await grant.pc.owner('/api/tasks', {
      requestId: randomUUID(),
      connectionId: grant.config.connectionId,
      name: `Contract ${proof}`,
      goal: `Write synthetic proof ${proof}.`,
      expectedResult: 'Read back the proof and leave other files unchanged.',
      scope: `Only contract-${proof} files in the guest workspace.`,
      ...extra,
    })
  ).task;
}
const a = await computer(process.argv[2]);
const b = await computer(process.argv[3]);
assert.notEqual(a.info.computerId, b.info.computerId);
const checks = [];
try {
  const wa = await grant(a, 'work'),
    ra = await grant(a, 'read'),
    wb = await grant(b, 'work');
  assert.notEqual(wa.key, wb.key);
  await assert.rejects(new RuntimeClient(a.config).info(), {
    code: 'legacy_access_disabled',
  });
  const wrong = new RuntimeClient({ ...wa.config, port: b.config.port });
  await assert.rejects(wrong.info());
  await assert.rejects(wa.api.request('/api/owner/connections'), {
    code: 'owner_required',
  });
  await assert.rejects(wa.api.request('/api/tasks'), { code: 'human_only' });
  await assert.rejects(
    wa.api.call('files_write', { path: `contract-${proof}.txt`, text: proof }),
  );
  checks.push(
    'new default rejects shared credentials; owner remains available; wrong PC and owner authority rejected',
  );
  const ca = await bridge(wa),
    cr = await bridge(ra),
    cb = await bridge(wb);
  assert.equal((await ca.listTools()).tools.length, 20);
  assert.equal((await cr.listTools()).tools.length, 9);
  assert.equal((await cb.listTools()).tools.length, 20);
  for (const client of [ca, cr, cb])
    assert.ok(
      (await client.listTools()).tools.every(
        (tool) => tool.outputSchema?.type === 'object',
      ),
    );
  const idleCheck = await checkConnection(wa.file);
  assert.equal(idleCheck.result, 'ready');
  assert.equal(idleCheck.work.state, 'needs-assignment');
  assert.ok(
    (await ca.listPrompts()).prompts.some((x) => x.name === 'assigned-task'),
  );
  await assert.rejects(
    ca.getPrompt({
      name: 'computer-task',
      arguments: { goal: 'Change', expectedResult: 'Done', intent: 'execute' },
    }),
  );
  const ta = await task(wa),
    tb = await task(wb);
  const assignedCheck = await checkConnection(wa.file);
  assert.equal(assignedCheck.result, 'ready');
  assert.equal(assignedCheck.work.state, 'assigned');
  assert.equal((await a.owner('/api/info')).lease, null);
  const prepared = await ca.getPrompt({
    name: 'assigned-task',
    arguments: { id: ta.id },
  });
  assert.ok(prepared.messages[0].content.text.includes(ta.id));
  assert.equal(
    (await a.owner('/api/info')).lease,
    null,
    'Prompt retrieval starts nothing.',
  );
  await assert.rejects(wb.api.call('task_get', { id: ta.id }));
  await assert.rejects(ra.api.call('task_start', { id: ta.id }), {
    code: 'read_only',
  });
  assert.deepEqual((await invoke(cr, 'task_list')).tasks, []);
  const started = await invoke(ca, 'task_start', { id: ta.id });
  assert.equal(started.task.status, 'running');
  const busyCheck = await checkConnection(wa.file);
  assert.equal(busyCheck.result, 'ready');
  assert.equal(busyCheck.work.state, 'busy');
  assert.equal(
    (await a.owner('/api/info')).lease.generation,
    started.lease.generation,
  );
  checks.push(
    'real named stdio check validates schemas, pins and readiness without taking or releasing existing control',
  );
  assert.deepEqual(
    (await ra.api.info()).lease.controller,
    { kind: 'assigned' },
    'Another grant sees busy control without private labels or assignment IDs.',
  );
  assert.equal((await a.owner('/api/info')).lease.controller.taskId, ta.id);
  assert.equal(
    (await invoke(ca, 'task_start', { id: ta.id })).task.attempt.id,
    started.task.attempt.id,
  );
  await invoke(cb, 'task_start', { id: tb.id });
  await invoke(ca, 'files_write', { path: `contract-${proof}.txt`, text: 'A' });
  await invoke(cb, 'files_write', { path: `contract-${proof}.txt`, text: 'B' });
  assert.equal(
    (await invoke(ca, 'files_read', { path: `contract-${proof}.txt` })).text,
    'A',
  );
  assert.equal(
    (await invoke(cb, 'files_read', { path: `contract-${proof}.txt` })).text,
    'B',
  );
  const otherSession = new RuntimeClient(wa.config);
  await assert.rejects(
    otherSession.call('files_write', {
      path: `contract-${proof}.txt`,
      text: 'wrong',
    }),
  );
  // Copying a public lease actor's UUID into another credential cannot impersonate it.
  ra.api.sessionId = started.lease.owner.slice('agent:'.length);
  await ra.api.endSession();
  assert.equal((await a.owner('/api/info')).lease.owner, started.lease.owner);
  await a.ownerClient.request('/api/owner/legacy', { body: { enabled: true } });
  try {
    const legacy = new RuntimeClient(a.config);
    legacy.sessionId = started.lease.owner.slice('agent:'.length);
    await legacy.endSession();
    assert.equal((await a.owner('/api/info')).lease.owner, started.lease.owner);
  } finally {
    await a.ownerClient.request('/api/owner/legacy', {
      body: { enabled: false },
    });
  }
  const report = {
    id: ta.id,
    outcome: 'success',
    summary: 'Read back synthetic A proof.',
    evidence: [`contract-${proof}.txt`],
  };
  const finished = await invoke(ca, 'task_finish', report);
  assert.equal(finished.task.status, 'reported_success');
  assert.equal(finished.task.attempt.verification, null);
  assert.equal((await a.owner('/api/info')).lease, null);
  const verified = await a.owner(`/api/tasks/${ta.id}/verify`, {
    expectedRevision: finished.task.revision,
    verdict: 'verified',
    notes: 'Owner independently read the synthetic A file.',
  });
  assert.equal(verified.task.attempt.verification.verdict, 'verified');
  await a.owner(
    `/api/tasks/${ta.id}/verify`,
    {
      expectedRevision: finished.task.revision,
      verdict: 'verified',
      notes: 'Stale owner page.',
    },
    409,
  );
  await invoke(cb, 'task_finish', {
    id: tb.id,
    outcome: 'uncertain',
    summary: 'Synthetic B exists; deliberately uncertain result.',
    evidence: [],
  });
  checks.push(
    'actual stdio discovery 20/9, assigned prompt, two simultaneous PCs, attempt/session binding, explicit report and independent owner verification',
  );
  const cancel = await task(wa);
  const cancelStart = await invoke(ca, 'task_start', { id: cancel.id });
  await invoke(ca, 'task_finish', report);
  assert.equal(
    (await a.owner('/api/info')).lease.generation,
    cancelStart.lease.generation,
    'An old idempotent report cannot release the next attempt.',
  );
  const pending = ca.callTool({
    name: 'terminal_run',
    arguments: {
      command: `printf started > contract-${proof}-started; sleep 8; printf late > contract-${proof}-late`,
      timeoutMs: 12000,
    },
  });
  const deadline = Date.now() + 5000;
  let observed = false;
  while (Date.now() < deadline) {
    try {
      await wa.api.call('files_read', { path: `contract-${proof}-started` });
      observed = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  assert.ok(observed, 'Command reached its synthetic start marker.');
  const running = (await a.owner(`/api/tasks/${cancel.id}`)).task;
  const cancelled = await a.owner(`/api/tasks/${cancel.id}/cancel`, {
    expectedRevision: running.revision,
  });
  assert.equal(cancelled.task.status, 'cancelled');
  assert.ok((await pending).isError);
  await assert.rejects(
    wa.api.call('files_read', { path: `contract-${proof}-late` }),
  );
  assert.equal((await a.owner('/api/info')).lease, null);
  await assert.rejects(
    wa.api.call('task_finish', {
      id: cancel.id,
      outcome: 'success',
      summary: 'Cannot invent success.',
      evidence: [],
    }),
  );
  checks.push(
    'owner cancellation aborts and drains running process before terminal status/control reuse; late success rejected',
  );
  // Review revision and operation mutations share the actual workflow Store queue.
  await a.owner('/api/control/take', {});
  await a.owner('/api/teach/start', {
    name: `Contract method ${proof}`,
    goal: 'Write a synthetic result.',
  });
  await a.call('files_write', {
    path: `contract-${proof}-demo.txt`,
    text: proof,
  });
  const saved = await a.owner('/api/teach/stop', {});
  const reviewed = await a.owner(`/api/workflows/${saved.id}/review`, {
    expectedRevision: saved.revision,
    procedure:
      'Write the current supplied value to a new authorized result path, then read it back.',
    expectedResult: 'Result matches the current supplied value.',
    parameters: [
      { name: 'result_path', description: 'New relative output path.' },
      { name: 'value', description: 'Current synthetic value.' },
    ],
  });
  await a.call('control_release');
  const taught = await task(wa, {
    workflow: { id: reviewed.id, revision: reviewed.revision },
  });
  await invoke(ca, 'task_start', { id: taught.id });
  await a.owner(
    `/api/workflows/${saved.id}/review`,
    {
      expectedRevision: reviewed.revision,
      expectedResult: 'Forbidden while attempt runs.',
    },
    409,
  );
  await a.owner(
    `/api/workflows/${saved.id}/analysis`,
    { expectedRevision: reviewed.revision, enabled: true },
    409,
  );
  await invoke(ca, 'task_finish', {
    id: taught.id,
    outcome: 'failure',
    summary: 'Intentional contract test; no task output created.',
    evidence: [],
  });
  const stale = await task(wa, {
    workflow: { id: reviewed.id, revision: reviewed.revision },
  });
  await a.owner(`/api/workflows/${saved.id}/review`, {
    expectedRevision: reviewed.revision,
    expectedResult: 'New owner review after the earlier attempt.',
  });
  assert.equal((await a.owner(`/api/tasks/${stale.id}`)).task.outdated, true);
  assert.ok(
    (await ca.callTool({ name: 'task_start', arguments: { id: stale.id } }))
      .isError,
  );
  assert.equal((await a.owner('/api/info')).lease, null);
  checks.push(
    'actual reviewed workflow pin, mutation lock during running taught attempt and stale queued start rejection',
  );
  const revoked = await task(wa);
  await invoke(ca, 'task_start', { id: revoked.id });
  const revokingEffect = ca.callTool({
    name: 'terminal_run',
    arguments: {
      command: `printf started > contract-${proof}-revoke-started; sleep 8; printf late > contract-${proof}-revoke-late`,
      timeoutMs: 12000,
    },
  });
  let revokeStarted = false;
  const revokeDeadline = Date.now() + 5000;
  while (Date.now() < revokeDeadline) {
    try {
      await wa.api.call('files_read', {
        path: `contract-${proof}-revoke-started`,
      });
      revokeStarted = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  assert.ok(revokeStarted);
  await wa.pc.ownerClient.request(
    `/api/owner/connections/${wa.config.connectionId}/revoke`,
    { body: {} },
  );
  assert.ok((await revokingEffect).isError);
  await a.owner(
    '/api/call',
    { name: 'files_read', args: { path: `contract-${proof}-revoke-late` } },
    400,
  );
  assert.equal(
    (await a.owner(`/api/tasks/${revoked.id}`)).task.status,
    'interrupted',
  );
  await assert.rejects(wa.api.info(), { code: 'connection_revoked' });
  assert.equal((await a.owner('/api/info')).lease, null);
  assert.equal((await wb.api.info()).connection.id, wb.config.connectionId);
  checks.push(
    'revocation interrupts only its named computer/grant and rejects subsequent authentication',
  );
  await a.ownerClient.request('/api/owner/legacy', { body: { enabled: true } });
  const legacy = new RuntimeClient(a.config);
  try {
    await legacy.call('control_acquire');
    const pendingLegacy = legacy
      .call('terminal_run', {
        command: `printf started > contract-${proof}-legacy-started; sleep 8; printf late > contract-${proof}-legacy-late`,
        timeoutMs: 12000,
      })
      .then(
        (value) => ({ value }),
        (error) => ({ error }),
      );
    const deadline = Date.now() + 5000;
    let started = false;
    while (Date.now() < deadline) {
      try {
        await legacy.call('files_read', {
          path: `contract-${proof}-legacy-started`,
        });
        started = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    assert.ok(started);
    await a.ownerClient.request('/api/owner/legacy', {
      body: { enabled: false },
    });
    assert.ok((await pendingLegacy).error);
    await a.owner(
      '/api/call',
      { name: 'files_read', args: { path: `contract-${proof}-legacy-late` } },
      400,
    );
    assert.equal((await a.owner('/api/info')).lease, null);
    await assert.rejects(legacy.info(), { code: 'legacy_access_disabled' });
    checks.push(
      'explicit legacy disable drains its active process and rejects later access without changing named grants',
    );
  } finally {
    await a.ownerClient.request('/api/owner/legacy', {
      body: { enabled: false },
    });
  }
  const activity = await a.owner('/api/activity/export');
  const serialized = JSON.stringify(activity);
  for (const secret of [
    a.config.token,
    a.config.ownerToken,
    ...grants.map((x) => x.config.token),
  ])
    assert.ok(!serialized.includes(secret));
  assert.ok(!serialized.includes(`Write synthetic proof ${proof}.`));
  assert.ok(serialized.includes(wa.config.connectionId));
  assert.ok(serialized.includes(ta.id));
  assert.ok(serialized.includes(started.task.attempt.id));
  checks.push(
    'Activity exports trusted grant/task/attempt IDs without requirements or credentials',
  );
  const result = {
    result: 'passed',
    at: new Date().toISOString(),
    proof,
    computers: [a, b].map((x) => ({
      computerId: x.info.computerId,
      workspaceId: x.info.workspaceId,
      port: x.config.port,
    })),
    checks,
  };
  await fs.writeFile(
    path.join(directory, 'result.json'),
    JSON.stringify(result, null, 2) + '\n',
    { mode: 0o600 },
  );
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
} finally {
  await Promise.allSettled(clients.map((x) => x.close()));
  for (const item of grants) {
    try {
      await item.pc.ownerClient.request(
        `/api/owner/connections/${item.config.connectionId}/revoke`,
        { body: {} },
      );
    } catch {
      /* preserved for owner inspection */
    }
  }
}
