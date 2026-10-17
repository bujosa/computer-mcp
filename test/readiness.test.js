import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID, randomBytes } from 'node:crypto';
import { checkConnection, probeStdio } from '../src/readiness.js';
import { tools } from '../src/catalog.js';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const exec = promisify(execFile);
const cli = path.resolve('src/cli.js');
async function fixture(
  t,
  { access = 'work', busy = false, queued = false } = {},
) {
  const directory = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-check-')),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const config = {
    version: 1,
    kind: 'named-connection',
    name: 'acceptance',
    computerId: randomUUID(),
    workspaceId: randomUUID(),
    connectionId: randomUUID(),
    label: 'check-agent',
    access,
    token: randomBytes(32).toString('hex'),
  };
  const now = new Date().toISOString();
  const info = {
    version: 1,
    computerId: config.computerId,
    workspaceId: config.workspaceId,
    createdAt: now,
    bootId: randomUUID(),
    guestOS: 'Linux (Debian)',
    adapter: 'docker-linux',
    isolation: 'dedicated-container',
    hostControl: false,
    network: 'isolated',
    operationsVersion: 1,
    legacyEnabled: false,
    connection: {
      id: config.connectionId,
      label: config.label,
      access,
      requiresTask: access === 'work',
    },
    lease: busy
      ? {
          owner: `agent:${randomUUID()}`,
          kind: 'agent',
          generation: randomUUID(),
          expiresAt: now,
          controller: { kind: 'assigned' },
        }
      : null,
    teach: { active: false },
    capabilities: Object.entries(tools)
      .filter(([, tool]) => access === 'work' || tool.read)
      .map(([name]) => name),
    limits: { commandMs: 30000 },
    desktop: { width: 1280, height: 800 },
    policy: 'test',
  };
  const tasks = queued
    ? [
        {
          id: randomUUID(),
          revision: 1,
          computerId: config.computerId,
          workspaceId: config.workspaceId,
          connectionId: config.connectionId,
          name: 'private task name',
          goal: 'private task content',
          expectedResult: 'private result',
          scope: '',
          workflow: null,
          status: 'queued',
          createdAt: now,
          createdBy: `human:${randomUUID()}`,
          attempt: null,
          outdated: false,
        },
      ]
    : [];
  const requests = [];
  const response = { status: 200, code: undefined, delay: 0 };
  const server = http.createServer(async (req, res) => {
    let data = '';
    for await (const chunk of req) data += chunk;
    const body = data ? JSON.parse(data) : undefined;
    requests.push({ url: req.url, body });
    assert.equal(req.headers.authorization, `Bearer ${config.token}`);
    assert.equal(req.headers['x-computer-id'], config.computerId);
    assert.equal(req.headers['x-connection-id'], config.connectionId);
    if (response.delay)
      await new Promise((resolve) => setTimeout(resolve, response.delay));
    res.writeHead(response.status, { 'content-type': 'application/json' });
    const value =
      response.status !== 200
        ? { code: response.code, error: `untrusted ${config.token}` }
        : req.url === '/api/info'
          ? info
          : req.url === '/api/session/end'
            ? { ended: true }
            : {
                result:
                  body?.name === 'computer_info'
                    ? info
                    : body?.name === 'task_list'
                      ? { tasks }
                      : null,
              };
    res.end(JSON.stringify(value));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  config.port = server.address().port;
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const file = path.join(directory, 'private connection é.json');
  await fs.writeFile(file, JSON.stringify(config), { mode: 0o600 });
  return { config, info, tasks, requests, response, file, directory, server };
}

for (const [access, busy, queued, state] of [
  ['read', false, false, 'read-only'],
  ['work', false, false, 'needs-assignment'],
  ['work', false, true, 'assigned'],
  ['work', true, true, 'busy'],
])
  test(`real CLI check accepts named ${access}/${state} without a task/effect or default catalog`, async (t) => {
    const f = await fixture(t, { access, busy, queued });
    const absent = path.join(f.directory, 'absent-home');
    const { stdout, stderr } = await exec(
      process.execPath,
      [cli, 'check', '--connection', f.file],
      {
        timeout: 12000,
        env: { ...process.env, HOME: absent, USERPROFILE: absent },
      },
    );
    assert.equal(stderr, '');
    const report = JSON.parse(stdout);
    assert.equal(report.result, 'ready');
    assert.equal(report.work.state, state);
    assert.equal(report.discovery.tools, access === 'work' ? 20 : 9);
    assert.equal(report.discovery.prompts, access === 'work' ? 4 : 2);
    assert.equal(report.computerId, f.config.computerId);
    for (const privateValue of [
      f.config.token,
      'private task content',
      'private task name',
      'private result',
    ])
      assert.ok(!stdout.includes(privateValue));
    assert.deepEqual(
      f.requests
        .filter((req) => req.url === '/api/call')
        .map((req) => req.body.name),
      ['computer_info', 'task_list'],
    );
    assert.ok(
      f.requests.every((req) =>
        ['/api/info', '/api/call', '/api/session/end'].includes(req.url),
      ),
    );
    assert.equal(
      f.requests.filter((req) => req.url === '/api/session/end').length,
      2,
    );
    await assert.rejects(fs.stat(absent), { code: 'ENOENT' });
    assert.equal(await fs.readFile(f.file, 'utf8'), JSON.stringify(f.config));
  });

test('check fails closed with actionable, sanitized errors and never repairs identity or credentials', async (t) => {
  const f = await fixture(t);
  for (const code of [
    'connection_revoked',
    'unauthorized',
    'workspace_mismatch',
    'not_ready',
  ]) {
    f.response.status = 403;
    f.response.code = code;
    const report = await checkConnection(f.file, {
      probe: () => assert.fail('No stdio after authentication failure'),
    });
    assert.equal(report.result, 'blocked');
    assert.equal(report.failure, code);
    assert.ok(!JSON.stringify(report).includes(f.config.token));
  }
  f.response.status = 200;
  f.info.workspaceId = randomUUID();
  assert.equal((await checkConnection(f.file)).failure, 'identity_mismatch');
  f.info.workspaceId = f.config.workspaceId;
  f.info.operationsVersion = 99;
  assert.equal((await checkConnection(f.file)).failure, 'runtime_contract');
  f.info.operationsVersion = 1;
  f.info.capabilities.pop();
  assert.equal((await checkConnection(f.file)).failure, 'discovery_contract');
  assert.ok(f.requests.every((req) => req.body?.name !== 'task_start'));
});

test('missing/damaged/public connection and contradictory authority produce no setup state', async (t) => {
  const f = await fixture(t);
  for (const file of [path.join(f.directory, 'missing'), 'relative.json'])
    assert.equal((await checkConnection(file)).failure, 'connection_file');
  await fs.writeFile(f.file, `{ "secret": "${f.config.token}" }`);
  const failure = await exec(process.execPath, [
    cli,
    'check',
    '--connection',
    f.file,
  ]).catch((error) => error);
  assert.equal(failure.code, 1);
  assert.equal(JSON.parse(failure.stdout).failure, 'connection_file');
  assert.ok(!failure.stdout.includes(f.config.token));
  assert.equal(failure.stderr, '');
  await assert.rejects(
    exec(process.execPath, [
      cli,
      'check',
      '--connection',
      f.file,
      '--root',
      f.directory,
    ]),
  );
  if (process.platform !== 'win32') {
    await fs.chmod(f.file, 0o644);
    assert.equal((await checkConnection(f.file)).failure, 'connection_file');
    await fs.chmod(f.file, 0o600);
    const fifo = path.join(f.directory, 'credential-fifo');
    await exec('mkfifo', ['-m', '600', fifo]);
    const rejected = await exec(
      process.execPath,
      [cli, 'check', '--connection', fifo],
      { timeout: 3000 },
    ).catch((error) => error);
    assert.equal(rejected.code, 1);
    assert.equal(JSON.parse(rejected.stdout).failure, 'connection_file');
  }
  await assert.rejects(exec(process.execPath, [cli, 'check']));
  assert.equal(f.requests.length, 0);
});

test('foreign task attribution is rejected and unavailable runtime is reported without starting a PC', async (t) => {
  const f = await fixture(t, { queued: true });
  f.tasks[0].connectionId = randomUUID();
  assert.equal((await checkConnection(f.file)).failure, 'identity_mismatch');
  await new Promise((resolve) => {
    f.server.close(resolve);
    f.server.closeAllConnections();
  });
  const report = await checkConnection(f.file);
  assert.equal(report.result, 'blocked');
  assert.equal(report.failure, 'runtime_unavailable');
  assert.ok(!JSON.stringify(report).includes(f.config.token));
});

for (const mode of ['legacy', 'auto'])
  test(`actual ${mode} MCP rejects malformed runtime results as sanitized tool errors`, async (t) => {
    const f = await fixture(t);
    const client = new Client(
      { name: 'bad-result-contract', version: '1' },
      { versionNegotiation: { mode } },
    );
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [cli, 'mcp', '--connection', f.file],
      stderr: 'pipe',
    });
    transport.stderr.resume();
    t.after(() => client.close());
    await client.connect(transport);
    for (const name of ['files_read', 'task_start', 'desktop_screenshot']) {
      const result = await client.callTool({
        name,
        arguments:
          name === 'files_read'
            ? { path: 'no-file-read' }
            : name === 'task_start'
              ? { id: randomUUID() }
              : {},
      });
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent, undefined);
      assert.equal(
        JSON.parse(result.content[0].text).code,
        'invalid_tool_result',
      );
      assert.ok(!JSON.stringify(result).includes(f.config.token));
      assert.match(
        result.content[0].text,
        /Inspect the computer before retrying/,
      );
    }
  });

test('stdio probe has a deadline and reaps its own bridge without acquiring control', async (t) => {
  const f = await fixture(t);
  f.response.delay = 150;
  const start = Date.now();
  await assert.rejects(probeStdio(f.file, f.config, { timeoutMs: 50 }), {
    code: 'probe_timeout',
  });
  assert.ok(Date.now() - start < 6000);
  assert.ok(f.requests.every((req) => req.body?.name === undefined));
});
