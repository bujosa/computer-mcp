// Real MCP/X11 input and security contracts, using the guest's existing xev
// diagnostic window. This does not inspect appearance or automate the owner UI.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { RuntimeClient } from '../src/client.js';
import { readConfig } from '../src/config.js';
import {
  checkDocker,
  checkOwned,
  runDocker,
  projectName,
} from '../src/docker.js';

assert.ok(process.argv[2], 'Provide an idle owned QA computer.');
const state = path.resolve(process.argv[2]),
  config = await readConfig(state);
await checkDocker(config);
assert.equal(await checkOwned(config), true);
const api = new RuntimeClient(config),
  initial = await api.info();
assert.equal(initial.lease, null, 'Use an idle owned QA computer.');
assert.equal(
  initial.teach.active,
  false,
  'Save any demonstration before testing.',
);
assert.ok(
  initial.capabilities.includes('desktop_action'),
  'Rebuild this owned guest.',
);
const proof = randomUUID(),
  marker = `desktop-${proof}`,
  logfile = `${marker}.log`,
  pidfile = `${marker}.pid`;
const directory = path.resolve(process.argv[3] || `artifacts/${marker}`);
await fs.mkdir(directory, { recursive: true, mode: 0o700 });
const ticket = await fetch(api.base + '/api/owner/ticket', {
  method: 'POST',
  headers: {
    authorization: `Bearer ${config.ownerToken}`,
    'content-type': 'application/json',
  },
  body: '{}',
});
assert.equal(ticket.status, 200);
const session = await fetch(api.base + '/api/ui/session', {
  method: 'POST',
  headers: { origin: api.base, 'content-type': 'application/json' },
  body: JSON.stringify(await ticket.json()),
});
assert.equal(session.status, 200);
const cookie = session.headers.get('set-cookie').split(';')[0];
async function owner(url, body) {
  const r = await fetch(api.base + url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { cookie, origin: api.base, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await r.json();
  assert.ok(r.ok, `Owner request failed: ${r.status} ${url}`);
  return value;
}
const client = new Client(
  { name: 'desktop-contract-modern', version: '1.0' },
  { versionNegotiation: { mode: 'auto' } },
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
client.onerror = () => {};
await client.connect(transport);
async function tool(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  assert.ok(
    !result.isError,
    `Failed tool: ${name} (${result.isError ? JSON.parse(result.content[0].text).code : ''})`,
  );
  const json = JSON.parse(result.content[0].text);
  assert.deepEqual(
    result.structuredContent,
    json,
    `${name}: structured/text parity`,
  );
  return json;
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let fixtureStarted = false,
  workflow,
  teachingId;
try {
  const catalog = await client.listTools();
  assert.equal(catalog.tools.length, 16);
  const denied = await client.callTool({
    name: 'desktop_action',
    arguments: { action: 'move', x: 0, y: 0 },
  });
  assert.equal(denied.isError, true, 'Desktop mutation requires control.');
  await tool('control_acquire');
  const readAPI = new RuntimeClient({
    ...config,
    token: createHmac('sha256', config.token)
      .update('computer-mcp:read:v1')
      .digest('hex'),
  });
  readAPI.sessionId = (await api.info()).lease.owner.split(':')[1];
  await assert.rejects(
    readAPI.call('desktop_action', { action: 'key', key: 'Tab' }),
    { code: 'read_only' },
  );
  for (const input of [
    { action: 'click', x: 1280, y: 0 },
    { action: 'key', key: 'a exec sh' },
    { action: 'type', text: 'line\nReturn' },
    { action: 'move', x: 0, y: 0, display: ':0' },
  ]) {
    assert.equal(
      (await client.callTool({ name: 'desktop_action', arguments: input }))
        .isError,
      true,
    );
  }
  fixtureStarted = true;
  const started = await tool('terminal_run', {
    command: `setsid stdbuf -oL xev -name ${marker} -geometry 360x240+80+100 > ${logfile} 2>&1 < /dev/null & printf '%s' "$!" > ${pidfile}; sleep 0.3`,
  });
  assert.equal(started.exitCode, 0);
  await tool('desktop_action', { action: 'move', x: 200, y: 180 });
  await tool('desktop_action', { action: 'click', x: 200, y: 180 });
  const held = await tool('terminal_run', {
    command: 'xdotool keydown x mousedown 1',
  });
  assert.equal(held.exitCode, 0);
  await tool('desktop_action', { action: 'move', x: 201, y: 180 });
  await tool('desktop_action', { action: 'key', key: 'q' });
  await tool('desktop_action', { action: 'type', text: 'z' });
  await tool('desktop_action', {
    action: 'scroll',
    x: 200,
    y: 180,
    direction: 'down',
    steps: 2,
  });
  await pause(100);
  const events = (await tool('files_read', { path: logfile })).text;
  assert.ok(
    events
      .split('\n\n')
      .some(
        (block) =>
          block.includes('KeyRelease') && block.includes('keysym 0x78, x'),
      ),
    'Cleanup must release an ordinary held key.',
  );
  assert.ok(
    events
      .split('\n\n')
      .some(
        (block) =>
          block.includes('ButtonRelease') && block.includes('button 1'),
      ),
    'Cleanup must release a held button.',
  );
  assert.ok(
    events.includes('keysym 0x71, q') && events.includes('keysym 0x7a, z'),
    'Native window did not receive key/text.',
  );
  assert.ok(
    events
      .split('\n\n')
      .some(
        (block) => block.includes('ButtonPress') && block.includes('button 1'),
      ),
    'Native click missing.',
  );
  assert.ok(
    events
      .split('\n\n')
      .some(
        (block) => block.includes('ButtonPress') && block.includes('button 5'),
      ),
    'Native scroll missing.',
  );
  const screenshot = await client.callTool({
    name: 'desktop_screenshot',
    arguments: {},
  });
  assert.equal(screenshot.content[0].type, 'image');
  await fs.writeFile(
    path.join(directory, 'native-guest.png'),
    Buffer.from(screenshot.content[0].data, 'base64'),
  );

  // The long typed input lets takeover interrupt an actual X11 child. Effects
  // already delivered are intentionally not undone; the new owner must inspect.
  const pending = client.callTool({
    name: 'desktop_action',
    arguments: { action: 'type', text: 'x'.repeat(1024) },
  });
  await pause(60);
  await owner('/api/control/take', {});
  assert.equal(
    (await pending).isError,
    true,
    'Takeover must interrupt desktop input.',
  );
  await owner('/api/call', {
    name: 'desktop_action',
    args: { action: 'key', key: 'z' },
  });

  const recording = await owner('/api/teach/start', {
    name: 'Native desktop input contract',
    goal: 'Inspect the focused guest diagnostic window.',
  });
  teachingId = recording.id;
  await owner('/api/call', {
    name: 'desktop_action',
    args: { action: 'click', x: 200, y: 180 },
  });
  const privateText = `omitted-${proof}`;
  await owner('/api/call', {
    name: 'desktop_action',
    args: { action: 'type', text: privateText },
  });
  await owner('/api/call', {
    name: 'desktop_action',
    args: { action: 'key', key: 'Tab' },
  });
  // Teach stays active over Chromium: native type plus a later blur must not
  // generate an extra executable browser fill. Later owner editing still records.
  await owner('/api/call', {
    name: 'browser_action',
    args: { action: 'navigate', url: 'http://127.0.0.1:7070/demo' },
  });
  await owner('/api/call', {
    name: 'browser_action',
    args: { action: 'click', selector: '#project' },
  });
  for (const args of [
    { action: 'key', key: 'Ctrl+a' },
    { action: 'type', text: privateText },
    { action: 'key', key: 'Tab' },
  ])
    await owner('/api/call', { name: 'desktop_action', args });
  await pause(100);
  const nativeTrace = (await owner(`/api/workflows/${recording.id}`)).steps;
  assert.equal(
    nativeTrace.filter(
      (step) => step.type === 'fill' && step.selector === '#project',
    ).length,
    0,
    'Native typing/blur must not duplicate a browser fill.',
  );
  await owner('/api/call', {
    name: 'browser_action',
    args: {
      action: 'fill',
      selector: '#project',
      text: `Owner correction ${proof}`,
    },
  });
  await pause(100);
  // Navigation destroys the old DOM context; closing the guest's Chromium
  // tab must also preserve the delivered key step and never poison recording.
  for (const args of [
    { action: 'key', key: 'Ctrl+l' },
    { action: 'type', text: 'http://127.0.0.1:7070/demo' },
    { action: 'key', key: 'Return' },
    { action: 'key', key: 'Ctrl+w' },
  ]) {
    const delivered = await owner('/api/call', {
      name: 'desktop_action',
      args,
    });
    assert.equal(delivered.result.inputSent, true);
    assert.equal(delivered.result.teachingInterrupted, undefined);
  }
  workflow = await owner('/api/teach/stop', {});
  assert.equal(
    workflow.steps.filter((step) => step.type === 'desktop').length,
    10,
  );
  assert.equal(
    workflow.steps.filter(
      (step) => step.type === 'fill' && step.selector === '#project',
    ).length,
    1,
    'Subsequent owner editing must remain recordable.',
  );
  assert.ok(!JSON.stringify(workflow.steps).includes(privateText));
  const reviewed = await owner(`/api/workflows/${workflow.id}/review`, {
    expectedRevision: workflow.revision,
    expectedResult:
      'Inspect the guest window and verify the requested input was received.',
  });
  const skill = await owner(`/api/workflows/${workflow.id}/skill`);
  assert.ok(
    skill.content.includes('desktop_action') &&
      skill.content.includes('single-line text') &&
      skill.content.includes('supported desktop key/chord'),
  );
  assert.ok(!skill.content.includes(privateText));
  assert.ok(reviewed.review);
  await owner('/api/call', { name: 'control_release', args: {} });
  await tool('control_acquire');
  // A supported browser inspection/focus tool can be combined with native text.
  // Save and read the actual application's state, not an inputSent response.
  await tool('browser_action', {
    action: 'navigate',
    url: 'http://127.0.0.1:7070/demo',
  });
  await tool('browser_action', { action: 'click', selector: '#project' });
  await tool('desktop_action', { action: 'key', key: 'Ctrl+a' });
  const browserNote = {
    project: `Desktop reuse ${proof}`,
    note: 'Supplied values through guest desktop input.',
  };
  await tool('desktop_action', {
    action: 'type',
    text: browserNote.project,
  });
  await tool('browser_action', { action: 'click', selector: '#note' });
  await tool('desktop_action', {
    action: 'type',
    text: browserNote.note,
  });
  await tool('browser_action', { action: 'click', selector: '#save-note' });
  const saved = await tool('browser_snapshot');
  assert.ok(saved.text.includes(browserNote.project));
  assert.ok(saved.text.includes(browserNote.note));
  const activity = await owner('/api/activity?days=7');
  assert.ok(
    activity.events.some(
      (event) =>
        event.action === 'tool.desktop_action.type' &&
        ['cancelled', 'interrupted'].includes(event.outcome),
    ),
  );
  assert.ok(
    activity.events.some(
      (event) =>
        event.action === 'tool.desktop_action.click' &&
        event.outcome === 'success',
    ),
  );
  assert.ok(!JSON.stringify(activity).includes(privateText));
  const report = {
    result: 'passed',
    computerId: config.computerId,
    workspaceId: initial.workspaceId,
    workflowId: workflow.id,
    tools: catalog.tools.length,
    nativeX11: true,
    heldInputsReleased: true,
    browserTeachCorrelated: true,
    takeoverCancellation: true,
    readScope: true,
    typedValuesOmitted: true,
    browserResultVerified: true,
    browserNote,
  };
  await fs.writeFile(
    path.join(directory, 'report.json'),
    JSON.stringify(report, null, 2),
  );
  await fs.writeFile(path.join(directory, 'SKILL.md'), skill.content);
  process.stdout.write(JSON.stringify(report) + '\n');
} finally {
  // Only the exact diagnostic PID/name created by this contract is eligible.
  // Retain its files as evidence; never search/kill other guest processes.
  if (fixtureStarted)
    await runDocker(
      config,
      [
        'exec',
        '--user',
        '1000:1000',
        projectName(config),
        'python3',
        '-c',
        `import os,signal
from pathlib import Path
f=Path('/data/workspace/${pidfile}')
if f.exists():
 pid=int(f.read_text())
 p=Path('/proc')/str(pid)/'cmdline'
 if p.exists():
  command=p.read_bytes().split(bytes([0]))
  assert b'${marker}' in command and any(b'xev' in item for item in command),'Unexpected diagnostic PID'
  os.kill(pid,signal.SIGTERM)
`,
      ],
      { timeoutMs: 5000 },
    );
  const status = await api.info();
  if (status.teach.active && status.teach.id === teachingId)
    await owner('/api/teach/stop', {});
  if (status.lease?.kind === 'human')
    await owner('/api/call', { name: 'control_release', args: {} }).catch(
      () => {},
    );
  await client.close();
}
