// Real runtime/MCP/security contracts. No UI automation or shared profiles.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { RuntimeClient } from '../src/client.js';
import { readConfig } from '../src/config.js';
import { checkDocker, checkOwned } from '../src/docker.js';

assert.ok(process.argv[2], 'Provide an idle, explicitly owned QA state.');
const state = path.resolve(process.argv[2]);
const config = await readConfig(state);
await checkDocker(config);
assert.equal(await checkOwned(config), true);
const api = new RuntimeClient(config),
  initial = await api.info();
assert.equal(initial.lease, null, 'Use an idle owned QA computer.');
assert.ok(
  initial.limits.activity,
  'Rebuild this owned guest for activity contracts.',
);
const proof = randomUUID(),
  omitted = `omitted-${proof}`;
const directory = path.resolve(
  process.argv[3] || `artifacts/activity-${proof}`,
);
await fs.mkdir(directory, { recursive: true, mode: 0o700 });
const ticketResponse = await fetch(api.base + '/api/owner/ticket', {
  method: 'POST',
  headers: {
    authorization: `Bearer ${config.ownerToken}`,
    'content-type': 'application/json',
  },
  body: '{}',
});
assert.equal(ticketResponse.status, 200);
const sessionResponse = await fetch(api.base + '/api/ui/session', {
  method: 'POST',
  headers: { origin: api.base, 'content-type': 'application/json' },
  body: JSON.stringify(await ticketResponse.json()),
});
assert.equal(sessionResponse.status, 200);
const cookie = sessionResponse.headers.get('set-cookie').split(';')[0];
async function owner(url, body) {
  const response = await fetch(api.base + url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { cookie, origin: api.base, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await response.json();
  assert.ok(response.ok, `Owner request failed: ${response.status} ${url}`);
  return value;
}
const bridges = [];
async function bridge(modern) {
  const name = `activity-contract-${modern ? 'modern' : 'legacy'}`;
  const client = new Client(
    { name, version: '1.0' },
    { versionNegotiation: { mode: modern ? 'auto' : 'legacy' } },
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      fileURLToPath(new URL('../src/cli.js', import.meta.url)),
      'mcp',
      '--state',
      state,
    ],
    stderr: 'pipe',
  });
  await client.connect(transport);
  bridges.push(client);
  return { client, name };
}
async function invoke(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  assert.ok(!result.isError, `MCP ${name} failed`);
  return JSON.parse(result.content[0].text);
}
try {
  const legacy = await bridge(false),
    modern = await bridge(true);
  await invoke(legacy.client, 'files_list');
  await invoke(modern.client, 'files_list');
  const a = await invoke(legacy.client, 'control_acquire');
  await invoke(legacy.client, 'files_write', {
    path: `activity-${proof}.txt`,
    text: omitted,
  });
  const failed = await invoke(legacy.client, 'terminal_run', {
    command: `printf '${omitted}' >&2; exit 7`,
  });
  assert.equal(failed.exitCode, 7);
  const timeout = await invoke(legacy.client, 'terminal_run', {
    command: 'sleep 2',
    timeoutMs: 100,
  });
  assert.equal(timeout.stopped, 'timeout');
  const privateDB = await invoke(legacy.client, 'terminal_run', {
    command: 'test ! -r /data/control/activity/activity.sqlite',
  });
  assert.equal(privateDB.exitCode, 0);
  const read = new RuntimeClient({
    ...config,
    token: createHmac('sha256', config.token)
      .update('computer-mcp:read:v1')
      .digest('hex'),
  });
  // A read credential can copy the visible actor UUID, but cannot affect work control.
  read.sessionId = a.owner.split(':')[1];
  await read.call('files_list');
  await read.endSession();
  assert.equal((await api.info()).lease.owner, a.owner);
  await assert.rejects(read.request('/api/activity'), { code: 'human_only' });
  await assert.rejects(api.request('/api/activity/export'), {
    code: 'human_only',
  });
  const malformed = new RuntimeClient(config);
  await assert.rejects(
    malformed.request('/api/call', {
      body: { name: 'files_list', args: {} },
      client: { source: 'mcp', name: omitted, secret: omitted },
    }),
    { code: 'invalid_client' },
  );
  const marker = `activity-running-${proof}`;
  const running = legacy.client.callTool({
    name: 'terminal_run',
    arguments: { command: `touch ${marker}; sleep 5` },
  });
  const started = Date.now();
  while (Date.now() - started < 5000) {
    try {
      await api.call('files_read', { path: marker });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  assert.equal((await api.call('files_read', { path: marker })).text, '');
  // Repeat spoofed read close while an actual command is running.
  await read.endSession();
  assert.equal((await api.info()).lease.owner, a.owner);
  await owner('/api/control/take', {});
  const cancelled = await running;
  assert.equal(cancelled.isError, true);
  const humanCall = async (name, args = {}) =>
    (await owner('/api/call', { name, args })).result;
  await humanCall('browser_action', {
    action: 'navigate',
    url: 'http://127.0.0.1:7070/demo/',
  });
  await owner('/api/teach/start', { name: omitted, goal: omitted });
  await humanCall('files_write', {
    path: `activity-taught-${proof}.txt`,
    text: omitted,
  });
  const workflow = await owner('/api/teach/stop', {});
  await owner(`/api/workflows/${workflow.id}/review`, {
    expectedRevision: workflow.revision,
    expectedResult: omitted,
    procedure: `1. Read the supplied file. ${omitted}`,
  });
  await owner(`/api/workflows/${workflow.id}/skill`);
  await invoke(modern.client, 'workflow_get', { id: workflow.id });
  await humanCall('control_release');
  for (const client of bridges) await client.close();
  const deadline = Date.now() + 5000;
  let snapshot;
  while (Date.now() < deadline) {
    snapshot = await owner('/api/activity?days=1');
    const modernActor = snapshot.events.find(
      (e) =>
        e.action === 'tool.workflow_get' &&
        e.workflowId === workflow.id &&
        e.client.name === modern.name,
    )?.actor;
    if (
      [a.owner, modernActor].every(
        (actor) =>
          actor &&
          snapshot.sessions.some(
            (s) =>
              s.actor === actor &&
              s.access === 'work' &&
              s.endedAt &&
              s.reason === 'client_closed',
          ),
      )
    )
      break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const exactModernActor = snapshot.events.find(
    (e) =>
      e.action === 'tool.workflow_get' &&
      e.workflowId === workflow.id &&
      e.client.name === modern.name,
  )?.actor;
  for (const actor of [a.owner, exactModernActor])
    assert.ok(
      snapshot.sessions.some(
        (s) =>
          s.actor === actor &&
          s.access === 'work' &&
          s.endedAt &&
          s.reason === 'client_closed',
      ),
      'Exact stdio bridge must close its work observation session',
    );
  assert.ok(
    snapshot.events.some(
      (e) =>
        e.action === 'tool.terminal_run' &&
        e.outcome === 'failed' &&
        e.exitCode === 7,
    ),
  );
  assert.ok(
    snapshot.events.some(
      (e) => e.action === 'tool.terminal_run' && e.code === 'timeout',
    ),
  );
  assert.ok(
    snapshot.events.some(
      (e) => e.action === 'tool.terminal_run' && e.outcome === 'cancelled',
    ),
  );
  for (const b of [legacy, modern]) {
    const event = snapshot.events.find(
      (e) => e.action === 'tool.files_list' && e.client.name === b.name,
    );
    assert.ok(event, `Missing declared MCP identity ${b.name}`);
    assert.equal(
      event.client.protocol,
      b === modern ? '2026-07-28' : '2025-11-25',
    );
    assert.equal(event.client.version, '1.0');
  }
  assert.ok(
    snapshot.events.some(
      (e) => e.action === 'tool.workflow_get' && e.workflowId === workflow.id,
    ),
  );
  const scoped = snapshot.sessions.find(
    (s) => s.actor === a.owner && s.access === 'work',
  );
  assert.ok(scoped);
  assert.ok(
    !scoped.client.mixed,
    'Internal maintenance cannot relabel a normal MCP session',
  );
  const filtered = await owner(
    `/api/activity?days=1&session=${scoped.id}&limit=1`,
  );
  assert.equal(filtered.events.length, 1);
  assert.ok(filtered.nextCursor);
  const earlier = await owner(
    `/api/activity?days=1&session=${scoped.id}&limit=1&before=${filtered.nextCursor}`,
  );
  assert.ok(earlier.events[0].id < filtered.events[0].id);
  const exported = await owner('/api/activity/export?days=1');
  assert.equal(exported.computerId, initial.computerId);
  assert.equal(exported.workspaceId, initial.workspaceId);
  assert.ok(
    exported.controlIntervals.some(
      (c) => c.sessionId === scoped.id && c.reason === 'takeover',
    ),
  );
  assert.ok(exported.summary.controlMs > 0);
  assert.ok(exported.summary.toolMs > 0);
  for (const value of [
    config.token,
    config.ownerToken,
    omitted,
    marker,
    `activity-${proof}.txt`,
  ])
    assert.ok(
      !JSON.stringify(exported).includes(value),
      `Activity included private payload`,
    );
  await fs.writeFile(
    path.join(directory, 'activity.json'),
    JSON.stringify(exported, null, 2) + '\n',
    { mode: 0o600 },
  );
  const result = {
    result: 'passed',
    computerId: initial.computerId,
    workspaceId: initial.workspaceId,
    legacyMetadata: true,
    modernMetadata: true,
    readCannotEndWork: true,
    privatePayloadsExcluded: true,
    ownerExport: true,
    controlMs: exported.summary.controlMs,
    toolMs: exported.summary.toolMs,
    events: exported.events.length,
    workflowId: workflow.id,
    retainedOperationId: snapshot.events.find(
      (e) => e.action === 'tool.workflow_get' && e.workflowId === workflow.id,
    ).operationId,
  };
  await fs.writeFile(
    path.join(directory, 'report.json'),
    JSON.stringify(result, null, 2) + '\n',
    { mode: 0o600 },
  );
  process.stdout.write(JSON.stringify(result) + '\n');
} finally {
  for (const client of bridges) await client.close().catch(() => {});
  if ((await api.info()).lease?.kind === 'human')
    await owner('/api/call', { name: 'control_release', args: {} }).catch(
      () => {},
    );
}
