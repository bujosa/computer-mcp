import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID, createHmac } from 'node:crypto';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { setup, saveConfig } from '../src/config.js';
import { serverInfo } from '../src/metadata.js';

async function bridge(t, { access = 'work', modern = false } = {}) {
  const state = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-task-prompt-'));
  const requests = [];
  let current, config;
  const runtime = http.createServer((req, res) => {
    const token =
      access === 'read'
        ? createHmac('sha256', config.token)
            .update('computer-mcp:read:v1')
            .digest('hex')
        : config.token;
    assert.equal(req.headers.authorization, `Bearer ${token}`);
    requests.push({ path: req.url, method: req.method });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify(req.url === '/api/info' ? current : { ended: true }),
    );
  });
  await new Promise((resolve) => runtime.listen(0, '127.0.0.1', resolve));
  config = await setup(state, {
    name: 'prompt-test',
    context: 'desktop-linux',
    port: runtime.address().port,
  });
  config.workspaceId = randomUUID();
  await saveConfig(state, config);
  current = {
    computerId: config.computerId,
    workspaceId: config.workspaceId,
    lease: null,
  };
  const client = new Client(
    { name: 'task-prompt-contract', version: '0.1.0' },
    {
      versionNegotiation: { mode: modern ? 'auto' : 'legacy' },
    },
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      path.resolve('src/cli.js'),
      'mcp',
      '--state',
      state,
      '--access',
      access,
    ],
    stderr: 'pipe',
  });
  let stderr = '';
  transport.stderr?.on('data', (chunk) => {
    stderr += chunk;
  });
  t.after(async () => {
    await client.close();
    await new Promise((resolve) => {
      runtime.close(resolve);
      runtime.closeAllConnections();
    });
    await fs.rm(state, { recursive: true, force: true });
    assert.ok(!stderr.includes(config.token));
    assert.ok(!stderr.includes(config.ownerToken));
  });
  await client.connect(transport);
  assert.deepEqual(client.getServerVersion(), serverInfo);
  return {
    client,
    config,
    requests,
    update: (value) => {
      current = value;
    },
  };
}
const requirements = {
  goal: 'Read the supplied CSV and write a report in a new guest directory.',
  expectedResult:
    'Report totals reconcile with the source; the source remains unchanged.',
};

for (const modern of [false, true])
  test(`computer-task is discovered and prepares plan/work requests without effects (${modern ? 'modern' : 'legacy'} stdio)`, async (t) => {
    const { client, config, requests } = await bridge(t, { modern });
    const catalog = await client.listPrompts();
    const prompt = catalog.prompts.find((p) => p.name === 'computer-task');
    assert.ok(prompt);
    assert.ok(prompt.arguments.find((a) => a.name === 'goal').required);
    assert.ok(
      prompt.arguments.find((a) => a.name === 'expectedResult').required,
    );
    assert.equal(
      prompt.arguments.find((a) => a.name === 'intent').required,
      false,
    );
    // Auto negotiation can close a preliminary bridge session. The prompt
    // retrieval itself must only read info, regardless of that lifecycle cleanup.
    requests.length = 0;
    const plan = await client.getPrompt({
      name: 'computer-task',
      arguments: requirements,
    });
    const text = plan.messages[0].content.text;
    assert.match(text, /^Prepare a plan/);
    assert.ok(text.includes(config.computerId));
    assert.ok(text.includes(config.workspaceId));
    assert.ok(
      text.includes(JSON.stringify({ ...requirements, scope: '' }, null, 2)),
    );
    const execution = await client.getPrompt({
      name: 'computer-task',
      arguments: { ...requirements, intent: 'execute' },
    });
    assert.match(execution.messages[0].content.text, /^Complete this/);
    assert.equal(requests.length, 2);
    assert.ok(
      requests.every((r) => r.method === 'GET' && r.path === '/api/info'),
      JSON.stringify(requests),
    );
  });

test('computer-task rejects read execution, malformed authority and changed runtime identities', async (t) => {
  const { client, config, requests, update } = await bridge(t, {
    access: 'read',
  });
  const plan = await client.getPrompt({
    name: 'computer-task',
    arguments: requirements,
  });
  assert.match(plan.messages[0].content.text, /^Prepare a plan/);
  await assert.rejects(
    () =>
      client.getPrompt({
        name: 'computer-task',
        arguments: { ...requirements, intent: 'execute' },
      }),
    /Execution needs a work connection/,
  );
  for (const args of [
    { ...requirements, computerId: randomUUID() },
    { ...requirements, intent: 'owner' },
    { ...requirements, expectedResult: '   ' },
    { ...requirements, scope: 'x'.repeat(2001) },
    { ...requirements, expectedResult: 'x'.repeat(2001) },
    { ...requirements, goal: 'x'.repeat(4001) },
  ])
    await assert.rejects(() =>
      client.getPrompt({ name: 'computer-task', arguments: args }),
    );
  for (const key of ['computerId', 'workspaceId']) {
    update({
      computerId: config.computerId,
      workspaceId: config.workspaceId,
      [key]: randomUUID(),
    });
    await assert.rejects(
      () =>
        client.getPrompt({ name: 'computer-task', arguments: requirements }),
      /identity changed/,
    );
  }
  assert.ok(
    requests.every((r) => r.method === 'GET' && r.path === '/api/info'),
  );
});
