// Backend/MCP contract smoke against an explicitly selected owned computer.
// No UI appearance harness, browser login profile or parent container is used.
import { WebSocket } from 'ws';
import http from 'node:http';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHmac } from 'node:crypto';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { readConfig } from '../src/config.js';
import { ownerConnection } from '../src/connection.js';
import { RuntimeClient } from '../src/client.js';
import { checkDocker, checkOwned } from '../src/docker.js';
const state = process.argv[2];
assert.ok(state, 'Usage: npm run test:integration -- /absolute/owned/state');
const config = await readConfig(path.resolve(state));
await checkDocker(config);
assert.equal(await checkOwned(config), true);
const api = new RuntimeClient(config);
const identity = await api.info();
const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const clients = [];
async function connect({ modern = false, access = 'work' } = {}) {
  const client = new Client(
    { name: 'computer-mcp-contract-smoke', version: '0.1.0' },
    { versionNegotiation: { mode: modern ? 'auto' : 'legacy' } },
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cli, 'mcp', '--state', path.resolve(state), '--access', access],
    stderr: 'pipe',
  });
  let stderr = '';
  transport.stderr?.on('data', (chunk) => {
    stderr += chunk;
  });
  client.onerror = () => {};
  await client.connect(transport);
  clients.push(client);
  assert.ok(!stderr.includes(config.token), 'MCP must not log credentials');
  return client;
}
async function tool(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  assert.ok(!result.isError, JSON.stringify(result));
  return JSON.parse(result.content[0].text);
}
async function rejected(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  assert.ok(result.isError, `Expected rejection: ${name}`);
  return result;
}
async function human(pathname, body, cookie) {
  const issuedTicket = pathname === '/api/ui/session' && !cookie;
  if (issuedTicket) {
    const ticketResponse = await fetch(api.base + '/api/owner/ticket', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.ownerToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        connection: ownerConnection(path.resolve(state), config),
      }),
    });
    assert.equal(ticketResponse.status, 200);
    body = await ticketResponse.json();
  }
  const response = await fetch(api.base + pathname, {
    method: 'POST',
    headers: {
      origin: api.base,
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const value = await response.json();
  assert.ok(response.ok, JSON.stringify(value));
  if (issuedTicket) {
    const replay = await fetch(api.base + pathname, {
      method: 'POST',
      headers: { origin: api.base, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(replay.status, 401, 'Owner ticket must be single-use');
  }
  return { value, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function socketCheck(pathname, { cookie, allowed = false } = {}) {
  const ws = new WebSocket(api.base.replace('http:', 'ws:') + pathname, {
    headers: { origin: api.base, ...(cookie ? { cookie } : {}) },
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error('Desktop handshake timed out'));
    }, 3000);
    ws.once('message', (data) => {
      clearTimeout(timer);
      ws.close(1000);
      allowed
        ? (assert.ok(data.toString().startsWith('RFB ')), resolve())
        : reject(new Error('Unauthorized desktop opened'));
    });
    ws.once('error', () => {
      clearTimeout(timer);
      allowed ? reject(new Error('Authorized desktop failed')) : resolve();
    });
  });
}
try {
  await socketCheck('/desktop/view');
  const unauth = await fetch(api.base + '/api/info');
  assert.equal(unauth.status, 401);
  const noTicket = await fetch(api.base + '/api/ui/session', {
    method: 'POST',
    headers: { origin: api.base, 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(noTicket.status, 401);
  const agentOwner = await fetch(api.base + '/api/owner/ticket', {
    method: 'POST',
    headers: { authorization: `Bearer ${config.token}` },
  });
  assert.equal(agentOwner.status, 401);
  const malformed = await fetch(api.base + '/api/ui/session', {
    method: 'POST',
    headers: { origin: api.base, 'content-type': 'application/json' },
    body: '{',
  });
  assert.equal(malformed.status, 400);
  const foreign = await fetch(api.base + '/api/ui/session', {
    method: 'POST',
    headers: {
      origin: 'https://example.org',
      'content-type': 'application/json',
    },
    body: '{}',
  });
  assert.equal(foreign.status, 403);
  const rebound = await new Promise((resolve, reject) => {
    const req = http.get(
      api.base + '/health',
      { headers: { host: 'attacker.example' } },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on('error', reject);
  });
  assert.equal(rebound, 403);
  const wrong = new RuntimeClient({ ...config, computerId: randomUUID() });
  await assert.rejects(wrong.info(), { code: 'computer_mismatch' });
  const wrongWorkspace = new RuntimeClient({
    ...config,
    workspaceId: randomUUID(),
  });
  await assert.rejects(wrongWorkspace.info(), { code: 'workspace_mismatch' });
  const owner = (await human('/api/ui/session', {})).cookie;
  const connectionResponse = await fetch(api.base + '/api/ui/connection', {
    headers: { cookie: owner },
  });
  assert.equal(connectionResponse.status, 200);
  const connection = await connectionResponse.json();
  assert.deepEqual(
    connection.connection,
    ownerConnection(path.resolve(state), config),
  );
  assert.ok(!JSON.stringify(connection).includes(config.token));
  assert.ok(!JSON.stringify(connection).includes(config.ownerToken));
  const reopened = await fetch(api.base + '/api/owner/ticket', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.ownerToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      connection: ownerConnection(path.resolve(state), config),
    }),
  });
  assert.equal(reopened.status, 200);
  const reopenTicket = await reopened.json();
  await human('/api/ui/session', reopenTicket, owner);
  const reopenReplay = await fetch(api.base + '/api/ui/session', {
    method: 'POST',
    headers: {
      origin: api.base,
      cookie: owner,
      'content-type': 'application/json',
    },
    body: JSON.stringify(reopenTicket),
  });
  assert.equal(
    reopenReplay.status,
    401,
    'Reopening a valid session still consumes the new ticket',
  );
  await assert.rejects(api.request('/api/ui/connection'), {
    code: 'human_only',
  });
  const badConnection = await fetch(api.base + '/api/owner/ticket', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.ownerToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ connection: { work: { command: 'invalid' } } }),
  });
  assert.equal(badConnection.status, 400);
  await socketCheck('/desktop/view', { cookie: owner, allowed: true });
  await socketCheck('/desktop/control', { cookie: owner });
  const a = await connect(),
    b = await connect({ modern: true }),
    read = await connect({ access: 'read' });
  const catalog = await a.listTools();
  assert.ok(catalog.tools.some((t) => t.name === 'terminal_run'));
  const readCatalog = await read.listTools();
  assert.ok(!readCatalog.tools.some((t) => t.name === 'terminal_run'));
  const readAPI = new RuntimeClient({
    ...config,
    token: createHmac('sha256', config.token)
      .update('computer-mcp:read:v1')
      .digest('hex'),
  });
  await assert.rejects(readAPI.call('control_acquire'), { code: 'read_only' });
  await assert.rejects(readAPI.request('/api/ui/connection'), {
    code: 'human_only',
  });
  await assert.rejects(
    readAPI.request('/api/cancel', { body: { operationId: randomUUID() } }),
    { code: 'read_only' },
  );
  const resources = await a.listResources();
  assert.equal(resources.resources.length, 1);
  const resource = await a.readResource({ uri: resources.resources[0].uri });
  assert.equal(
    JSON.parse(resource.contents[0].text).workspaceId,
    identity.workspaceId,
  );
  await rejected(a, 'files_write', {
    path: 'integration.txt',
    text: 'should not write',
  });
  await tool(a, 'control_acquire');
  await rejected(b, 'control_acquire');
  await tool(a, 'files_write', {
    path: 'integration.txt',
    text: 'Owned guest file.\n',
  });
  assert.equal(
    (await tool(a, 'files_read', { path: 'integration.txt' })).text,
    'Owned guest file.\n',
  );
  for (const bad of [
    '../control/identity.json',
    '/etc/passwd',
    'folder/../../etc/passwd',
  ])
    await rejected(a, 'files_read', { path: bad });
  const terminal = await tool(a, 'terminal_run', {
    command:
      'id -u; pwd; printf "guest executed\\n"; test ! -r /proc/1/environ; test ! -r /data/control/identity.json; test ! -S /var/run/docker.sock; touch terminal-proof.txt',
  });
  assert.equal(terminal.exitCode, 0);
  assert.ok(terminal.stdout.startsWith('1000\n'));
  assert.ok(terminal.stdout.includes('/data/workspace'));
  await tool(a, 'terminal_run', { command: 'ln -sf /etc/passwd blocked-link' });
  await rejected(a, 'files_read', { path: 'blocked-link' });
  const timeout = await tool(a, 'terminal_run', {
    command: 'sleep 2',
    timeoutMs: 100,
  });
  assert.equal(timeout.stopped, 'timeout');
  const bounded = await tool(a, 'terminal_run', { command: 'yes test' });
  assert.equal(bounded.stopped, 'output_limit');
  await tool(a, 'browser_action', {
    action: 'navigate',
    url: 'http://127.0.0.1:7070/demo',
  });
  const page = await tool(a, 'browser_snapshot');
  assert.ok(page.text.includes('Make a project note'));
  await tool(a, 'browser_action', {
    action: 'fill',
    selector: '#project',
    text: 'MCP execution',
  });
  await tool(a, 'browser_action', {
    action: 'fill',
    selector: '#note',
    text: 'Browser, terminal and files work in the same guest.',
  });
  await tool(a, 'browser_action', { action: 'click', selector: '#save-note' });
  assert.ok((await tool(a, 'browser_snapshot')).text.includes('MCP execution'));
  const screenshot = await a.callTool({
    name: 'desktop_screenshot',
    arguments: {},
  });
  assert.equal(screenshot.content[0].type, 'image');
  const png = Buffer.from(screenshot.content[0].data, 'base64');
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  await fs.mkdir('artifacts', { recursive: true });
  await fs.writeFile('artifacts/guest-desktop.png', png);
  const cancelled = new AbortController();
  const cancelRequest = a.callTool(
    {
      name: 'terminal_run',
      arguments: {
        command: 'sleep 10; touch cancelled-must-not-run.txt',
        timeoutMs: 15000,
      },
    },
    { signal: cancelled.signal },
  );
  const expectedCancellation = assert.rejects(cancelRequest);
  await new Promise((r) => setTimeout(r, 200));
  cancelled.abort();
  await expectedCancellation;
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(
    (
      await tool(a, 'terminal_run', {
        command: 'test ! -f cancelled-must-not-run.txt',
      })
    ).exitCode,
    0,
  );
  const pending = a.callTool({
    name: 'terminal_run',
    arguments: {
      command: 'sleep 20; touch takeover-must-not-run.txt',
      timeoutMs: 30000,
    },
  });
  await new Promise((r) => setTimeout(r, 200));
  await human('/api/control/take', {}, owner);
  assert.ok((await pending).isError);
  await socketCheck('/desktop/control', { cookie: owner, allowed: true });
  await rejected(a, 'files_write', { path: 'lost.txt', text: 'no' });
  await human('/api/call', { name: 'control_release', args: {} }, owner);
  await tool(b, 'control_acquire');
  const after = await tool(b, 'terminal_run', {
    command: 'test ! -f takeover-must-not-run.txt',
  });
  assert.equal(after.exitCode, 0);
  await tool(b, 'control_release');
  // Persisted Teach is exercised through the real control API; manual VNC input is reviewed separately.
  await human('/api/control/take', {}, owner);
  await human(
    '/api/teach/start',
    { name: 'MCP contract task', goal: 'Create a local project note' },
    owner,
  );
  await human(
    '/api/call',
    {
      name: 'browser_action',
      args: { action: 'navigate', url: 'http://127.0.0.1:7070/demo' },
    },
    owner,
  );
  await human(
    '/api/call',
    {
      name: 'browser_action',
      args: {
        action: 'fill',
        selector: '#project',
        text: 'Parameter values are intentionally omitted',
      },
    },
    owner,
  );
  await human(
    '/api/call',
    {
      name: 'browser_action',
      args: { action: 'press', selector: '#project', key: 'Tab' },
    },
    owner,
  );
  await human(
    '/api/call',
    {
      name: 'browser_action',
      args: { action: 'fill', selector: '#note', text: 'Recorded workflow' },
    },
    owner,
  );
  await human(
    '/api/call',
    {
      name: 'browser_action',
      args: { action: 'click', selector: '#save-note' },
    },
    owner,
  );
  const { value: workflow } = await human('/api/teach/stop', {}, owner);
  assert.equal(workflow.status, 'ready');
  assert.ok(workflow.steps.some((s) => s.type === 'fill'));
  assert.ok(
    !JSON.stringify(workflow).includes(
      'Parameter values are intentionally omitted',
    ),
  );
  const exported = await api.request(`/api/workflows/${workflow.id}/skill`);
  assert.equal(exported.filename, 'SKILL.md');
  assert.ok(exported.content.includes(config.computerId));
  assert.ok(
    !exported.content.includes('Parameter values are intentionally omitted'),
  );
  const exportDirectory = path.join(
    '.computer-mcp',
    'exported-skills',
    exported.name,
  );
  await fs.mkdir(exportDirectory, { recursive: true });
  await fs.writeFile(path.join(exportDirectory, 'SKILL.md'), exported.content);
  const readWorkflow = await tool(read, 'workflow_get', { id: workflow.id });
  assert.ok(readWorkflow.instructions.includes('input_'));
  const prompt = await read.getPrompt({
    name: 'taught-workflow',
    arguments: { id: workflow.id },
  });
  assert.ok(prompt.messages[0].content.text.includes('MCP contract task'));
  await human('/api/call', { name: 'control_release', args: {} }, owner);
  await tool(b, 'control_acquire');
  const taught = await tool(b, 'workflow_get', { id: workflow.id });
  for (const step of taught.steps) {
    if (step.type === 'navigate')
      await tool(b, 'browser_action', { action: 'navigate', url: step.url });
    else if (step.type === 'click')
      await tool(b, 'browser_action', {
        action: 'click',
        selector: step.selector,
      });
    else if (step.type === 'fill')
      await tool(b, 'browser_action', {
        action: 'fill',
        selector: step.selector,
        text:
          step.selector === '#project'
            ? 'Reused teaching task'
            : 'Explicit parameter supplied by the MCP client',
      });
  }
  assert.ok(
    (await tool(b, 'browser_snapshot')).text.includes('Reused teaching task'),
  );
  await tool(b, 'control_release');
  await tool(a, 'control_acquire');
  await a.close();
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(
    (await api.info()).lease,
    null,
    'Closed stdio connection must release its lease',
  );
  const info = await tool(b, 'computer_info');
  assert.equal(info.computerId, config.computerId);
  process.stdout.write(
    JSON.stringify(
      {
        result: 'passed',
        computerId: config.computerId,
        workspaceId: identity.workspaceId,
        tools: catalog.tools.length,
        workflowId: workflow.id,
        checks: [
          'legacy+modern stdio',
          'read-only credential enforcement',
          'API auth+origin+host',
          'owner-only credential-free host configuration',
          'taught Agent Skills export with identity+omitted parameters',
          'computer+workspace pinning',
          'lease exclusion+human takeover',
          'unprivileged terminal+timeouts+output cap',
          'contained files+symlink rejection',
          'real browser actions',
          'guest PNG screenshot',
          'Teach persistence+MCP prompt+parameterized reuse',
          'MCP request cancellation+stdio-close cleanup',
          'VNC view/control authorization+RFB handshake',
        ],
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await Promise.allSettled(clients.map((client) => client.close()));
  await api.call('control_release').catch(() => {});
}
