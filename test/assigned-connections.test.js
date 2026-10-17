import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { setup, saveConfig } from '../src/config.js';
import { registerComputer } from '../src/computers.js';
import { RuntimeClient } from '../src/client.js';
import {
  assignedConnectionSchema,
  readAssignedConnection,
  persistAssignedConnection,
  prepareConnectionDirectory,
  assignedConnectionDirectory,
  namedConnectionKey,
} from '../src/assigned-connections.js';
import {
  connectionEntryFromFile,
  formatConnection,
  ownerConnection,
  connectionSchema,
  cliCommand,
} from '../src/connection.js';
import { formatCommandEntry } from '../src/command-line.js';

const exec = promisify(execFile);
const cli = path.resolve('src/cli.js');
const run = (args, options) => exec(process.execPath, [cli, ...args], options);
async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-assigned-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return fs.realpath(root);
}
function assigned(overrides = {}) {
  return {
    version: 1,
    kind: 'named-connection',
    name: 'coding',
    computerId: randomUUID(),
    workspaceId: randomUUID(),
    connectionId: randomUUID(),
    label: 'codex',
    port: 17670,
    access: 'work',
    token: randomBytes(32).toString('hex'),
    ...overrides,
  };
}
function publicGrant(connection, overrides = {}) {
  return {
    id: connection.connectionId,
    label: connection.label,
    access: connection.access,
    requiresTask: connection.access === 'work',
    createdAt: new Date().toISOString(),
    revokedAt: null,
    sessions: [],
    ...overrides,
  };
}
async function mockRuntime(t, handler) {
  const server = http.createServer(async (req, res) => {
    try {
      let body = '';
      for await (const chunk of req) body += chunk;
      const response = await handler(req, body ? JSON.parse(body) : undefined);
      res.writeHead(response?.status || 200, {
        'content-type': 'application/json',
      });
      res.end(JSON.stringify(response?.value));
    } catch {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({ code: 'mock_failure', error: 'Mock request failed.' }),
      );
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  return server.address().port;
}
async function ownerRuntime(t, options = {}) {
  const root = await temporary(t);
  const state = path.join(root, 'computers', 'coding');
  const requests = [];
  const connection = assigned();
  let config;
  const port = await mockRuntime(t, async (req, body) => {
    requests.push({ path: req.url, method: req.method, body });
    if (
      req.headers.authorization !== `Bearer ${config.ownerToken}` ||
      req.headers['x-computer-id'] !== config.computerId ||
      req.headers['x-workspace-id'] !== config.workspaceId
    )
      return {
        status: 401,
        value: { code: 'owner_required', error: 'Owner required.' },
      };
    if (req.url === '/api/owner/info')
      return {
        value: {
          computerId: options.wrongComputer ? randomUUID() : config.computerId,
          workspaceId: config.workspaceId,
          lease: null,
        },
      };
    if (req.url === '/api/owner/connections' && req.method === 'GET')
      return {
        value: { connections: [publicGrant(connection)], legacyEnabled: false },
      };
    if (req.url === '/api/owner/connections') {
      connection.label = body.label;
      connection.access = body.access;
      await options.onCreate?.({ root, connection });
      return {
        value: {
          connection: publicGrant(connection, options.metadata),
          secret: connection.token,
        },
      };
    }
    if (req.url === `/api/owner/connections/${connection.connectionId}/revoke`)
      return options.revokeFails
        ? { status: 500, value: { error: connection.token } }
        : {
            value: {
              connection: publicGrant(connection, {
                revokedAt: new Date().toISOString(),
              }),
            },
          };
    if (req.url === '/api/owner/legacy')
      return { value: { legacyEnabled: body.enabled } };
    return {
      status: 404,
      value: { code: 'unknown_route', error: connection.token },
    };
  });
  config = await setup(state, { name: 'coding', context: 'default', port });
  config.workspaceId = randomUUID();
  await saveConfig(state, config);
  connection.computerId = config.computerId;
  connection.workspaceId = config.workspaceId;
  connection.port = config.port;
  await registerComputer(root, state);
  return { root, state, config, connection, requests };
}
function noCredentials(output, ...credentials) {
  for (const credential of credentials)
    assert.ok(
      !output.includes(credential),
      'Output must not include credentials.',
    );
}

test('private grant files are strict, isolated, atomically exclusive and do not contain owner configuration', async (t) => {
  const root = await temporary(t);
  const connection = assigned();
  const file = await persistAssignedConnection(root, connection);
  assert.equal(
    file,
    path.join(
      root,
      'connections',
      connection.computerId,
      `${connection.connectionId}.json`,
    ),
  );
  assert.deepEqual(await readAssignedConnection(file), connection);
  const before = await fs.readFile(file, 'utf8');
  await assert.rejects(
    persistAssignedConnection(root, { ...connection, token: 'e'.repeat(64) }),
    /Could not save/,
  );
  assert.equal(await fs.readFile(file, 'utf8'), before);
  assert.deepEqual(await fs.readdir(path.dirname(file)), [
    `${connection.connectionId}.json`,
  ]);
  if (process.platform !== 'win32') {
    assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
    assert.equal((await fs.stat(path.dirname(file))).mode & 0o777, 0o700);
    assert.equal(
      (await fs.stat(path.dirname(path.dirname(file)))).mode & 0o777,
      0o700,
    );
  }
  assert.ok(!before.includes('ownerToken'));
  assert.ok(!before.includes('context'));
  assert.ok(
    !assignedConnectionSchema.safeParse({
      ...connection,
      ownerToken: 'f'.repeat(64),
    }).success,
  );
  assert.ok(
    !assignedConnectionSchema.safeParse({ ...connection, access: 'owner' })
      .success,
  );
  await assert.rejects(readAssignedConnection('relative.json'), /absolute/);
  await fs.writeFile(
    file,
    JSON.stringify({ ...connection, secret: 'unrecognized' }),
  );
  await assert.rejects(readAssignedConnection(file), /valid private named/);
});

test('private persistence rejects symlink or public credential directories before writing', async (t) => {
  const root = await temporary(t);
  const foreign = path.join(root, 'foreign');
  await fs.mkdir(foreign, { mode: 0o700 });
  await fs.symlink(foreign, path.join(root, 'connections'), 'dir');
  await assert.rejects(
    prepareConnectionDirectory(root, randomUUID()),
    /private directories/,
  );
  assert.deepEqual(await fs.readdir(foreign), []);
  await fs.unlink(path.join(root, 'connections'));
  if (process.platform !== 'win32') {
    await fs.mkdir(path.join(root, 'connections'), { mode: 0o755 });
    await assert.rejects(
      prepareConnectionDirectory(root, randomUUID()),
      /private directories/,
    );
  }
});

test('named config reads only its scoped file with absent or damaged default catalogs and rejects mixed authority', async (t) => {
  const root = await temporary(t);
  const connection = assigned({ name: 'coding-long-name' });
  const file = await persistAssignedConnection(root, connection);
  const home = path.join(root, 'home');
  await fs.mkdir(home);
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  const printed = await run(['config', '--connection', file], { env });
  const entry = JSON.parse(printed.stdout).mcpServers[
    namedConnectionKey(connection)
  ];
  assert.deepEqual(entry, connectionEntryFromFile(file));
  await assert.rejects(fs.access(path.join(home, '.computer-mcp')));
  await fs.mkdir(path.join(home, '.computer-mcp'));
  await fs.writeFile(
    path.join(home, '.computer-mcp', 'registry.json'),
    '{damaged',
  );
  assert.equal(
    (await run(['config', '--connection', file], { env })).stdout,
    printed.stdout,
  );
  for (const option of ['root', 'state', 'name', 'access']) {
    await assert.rejects(
      run([
        'config',
        '--connection',
        file,
        `--${option}`,
        option === 'access' ? 'read' : 'other',
      ]),
      /cannot be combined/,
    );
  }
  await assert.rejects(run(['config', '--connection', '']), /absolute/);
  await fs.writeFile(
    file,
    JSON.stringify({ ...connection, ownerToken: 'f'.repeat(64) }),
  );
  await assert.rejects(
    run(['config', '--connection', file], { env }),
    /valid private named/,
  );
  noCredentials(printed.stdout + printed.stderr, connection.token);
});

test('MCP keys stay stable per grant, differ across grants and format safe Codex TOML keys', () => {
  const first = assigned();
  const second = assigned({ name: first.name });
  const key = namedConnectionKey(first);
  assert.equal(key, namedConnectionKey(first));
  assert.ok(key.length <= 30);
  assert.notEqual(key, namedConnectionKey(second));
  assert.notEqual(key, namedConnectionKey(assigned({ name: 'research' })));
  const entry = { command: '/node', args: ['/cli', 'mcp'] };
  assert.equal(
    JSON.parse(formatConnection(entry)).mcpServers.computer.command,
    '/node',
  );
  assert.match(
    formatConnection(entry, 'codex', 'a."b'),
    /^\[mcp_servers\."a\.\\"b"\]/,
  );
  assert.equal(
    JSON.parse(formatConnection(entry, 'vscode', key)).servers[key].type,
    'stdio',
  );
});

test('shared shell formatter preserves literal arguments and owner metadata uses standalone scoped placeholders', async (t) => {
  const root = await temporary(t);
  const args = [
    '',
    "a'b",
    '$(echo unsafe)',
    '`echo unsafe`',
    '$HOME',
    'space é',
    'a;b',
    'C:\\Users\\Owner',
  ];
  const entry = {
    command: process.execPath,
    args: [
      '-e',
      'process.stdout.write(JSON.stringify(process.argv.slice(1)))',
      ...args,
    ],
  };
  const formatted = formatCommandEntry(entry, 'posix');
  const result = await exec('/bin/sh', ['-c', formatted]);
  assert.deepEqual(JSON.parse(result.stdout), args);
  assert.equal(
    formatCommandEntry(
      { command: "C:\\Owner's Node\\node.exe", args: ["a'b", '$HOME'] },
      'win32',
    ),
    "& 'C:\\Owner''s Node\\node.exe' 'a''b' '$HOME'",
  );
  assert.throws(
    () => formatCommandEntry({ command: '/node', args: ['newline\n'] }),
    /Invalid command/,
  );
  const connection = assigned();
  const metadata = ownerConnection(
    path.join(root, "Owner's state"),
    connection,
    undefined,
    root,
  );
  const templates = metadata.assigned;
  assert.equal(
    templates.directory,
    assignedConnectionDirectory(root, connection.computerId),
  );
  for (const placeholder of ['__AGENT_LABEL__', '__ACCESS__', '__CLIENT__'])
    assert.equal(
      templates.create.args.filter((value) => value === placeholder).length,
      1,
    );
  assert.ok(templates.create.args.includes('--state'));
  assert.ok(templates.create.args.includes('--root'));
  assert.ok(templates.config.args.includes('__CONNECTION_FILE__'));
  assert.ok(!templates.config.args.includes('--root'));
  assert.ok(
    !connectionSchema.safeParse({
      ...metadata,
      assigned: {
        ...templates,
        config: {
          ...templates.config,
          args: templates.config.args.map((value) =>
            value === '__CONNECTION_FILE__'
              ? '/embedded/__CONNECTION_FILE__'
              : value,
          ),
        },
      },
    }).success,
  );
  assert.ok(cliCommand('connection', ['list']).includes("'connection' 'list'"));
});

test('owner CLI create writes only the random scoped credential and prints credential-free setup config', async (t) => {
  const fixture = await ownerRuntime(t);
  const { root, config, connection, requests } = fixture;
  const result = await run([
    'connection',
    'create',
    'codex-work',
    '--name',
    'coding',
    '--access',
    'work',
    '--root',
    root,
  ]);
  const file = path.join(
    root,
    'connections',
    config.computerId,
    `${connection.connectionId}.json`,
  );
  const saved = await readAssignedConnection(file);
  assert.equal(saved.label, 'codex-work');
  assert.equal(saved.access, 'work');
  assert.equal(saved.token, connection.token);
  assert.equal(saved.computerId, config.computerId);
  assert.equal(saved.workspaceId, config.workspaceId);
  assert.deepEqual(
    JSON.parse(result.stdout).mcpServers[namedConnectionKey(saved)],
    connectionEntryFromFile(file),
  );
  assert.match(result.stderr, /Created connection codex-work/);
  noCredentials(
    result.stdout + result.stderr + JSON.stringify(requests),
    config.token,
    config.ownerToken,
    connection.token,
  );
  noCredentials(
    await fs.readFile(file, 'utf8'),
    config.token,
    config.ownerToken,
  );
  assert.deepEqual(
    requests.map((request) => request.path),
    ['/api/owner/info', '/api/owner/connections'],
  );
  assert.deepEqual(requests[1].body, { label: 'codex-work', access: 'work' });
});

test('owner create validates selection, access, label, client and local directories before creating a credential', async (t) => {
  const { root, requests } = await ownerRuntime(t);
  const cases = [
    ['connection', 'create', 'codex', '--access', 'work'],
    ['connection', 'create', 'codex', '--name', 'coding', '--access', 'owner'],
    [
      'connection',
      'create',
      'not a slug',
      '--name',
      'coding',
      '--access',
      'work',
    ],
    [
      'connection',
      'create',
      'codex',
      '--name',
      'coding',
      '--access',
      'work',
      '--client',
      'bad',
    ],
  ];
  for (const args of cases)
    await assert.rejects(run([...args, '--root', root]));
  await fs.writeFile(path.join(root, 'connections'), 'not a directory');
  await assert.rejects(
    run([
      'connection',
      'create',
      'codex',
      '--name',
      'coding',
      '--access',
      'work',
      '--root',
      root,
    ]),
  );
  assert.deepEqual(requests, []);
});

test('owner create compensates failed exclusive persistence without replacing an existing file', async (t) => {
  const fixture = await ownerRuntime(t, {
    onCreate: async ({ root, connection }) =>
      fs.writeFile(
        path.join(
          assignedConnectionDirectory(root, connection.computerId),
          `${connection.connectionId}.json`,
        ),
        'existing grant',
        { flag: 'wx', mode: 0o600 },
      ),
  });
  const { root, connection, requests } = fixture;
  await assert.rejects(
    run([
      'connection',
      'create',
      'codex',
      '--name',
      'coding',
      '--access',
      'work',
      '--root',
      root,
    ]),
    (error) => {
      assert.equal(error.stdout, '');
      assert.match(error.stderr, /new connection was revoked/);
      noCredentials(error.stderr, connection.token);
      return true;
    },
  );
  assert.equal(
    await fs.readFile(
      path.join(
        assignedConnectionDirectory(root, connection.computerId),
        `${connection.connectionId}.json`,
      ),
      'utf8',
    ),
    'existing grant',
  );
  assert.equal(
    requests.at(-1).path,
    `/api/owner/connections/${connection.connectionId}/revoke`,
  );
});

test('failed compensation reports only public orphan identity and an exact scoped revoke command', async (t) => {
  const { root, state, config, connection, requests } = await ownerRuntime(t, {
    revokeFails: true,
    metadata: { access: 'read' },
  });
  await assert.rejects(
    run([
      'connection',
      'create',
      'codex',
      '--name',
      'coding',
      '--access',
      'work',
      '--root',
      root,
    ]),
    (error) => {
      assert.equal(error.stdout, '');
      assert.match(error.stderr, /automatic revocation failed/);
      assert.ok(error.stderr.includes(connection.connectionId));
      assert.ok(
        error.stderr.includes(
          cliCommand('connection', [
            'revoke',
            connection.connectionId,
            '--state',
            state,
            '--root',
            root,
          ]),
        ),
      );
      noCredentials(
        error.stderr,
        connection.token,
        config.token,
        config.ownerToken,
      );
      return true;
    },
  );
  assert.equal(
    requests.at(-1).path,
    `/api/owner/connections/${connection.connectionId}/revoke`,
  );
});

test('owner list, revoke and legacy use owner routes and pinned scope; rejected PC never creates a connection', async (t) => {
  const { root, config, connection, requests } = await ownerRuntime(t);
  const listed = await run([
    'connection',
    'list',
    '--name',
    'coding',
    '--root',
    root,
  ]);
  const value = JSON.parse(listed.stdout);
  assert.equal(value.computerId, config.computerId);
  assert.equal(value.connections[0].id, connection.connectionId);
  assert.equal(value.legacyEnabled, false);
  await run([
    'connection',
    'revoke',
    connection.connectionId,
    '--name',
    'coding',
    '--root',
    root,
  ]);
  await run([
    'connection',
    'legacy',
    'enable',
    '--name',
    'coding',
    '--root',
    root,
  ]);
  assert.deepEqual(requests.at(-1), {
    path: '/api/owner/legacy',
    method: 'POST',
    body: { enabled: true },
  });
  await assert.rejects(
    run(['connection', 'legacy', 'disable', '--root', root]),
    /explicit --name/,
  );
  await assert.rejects(
    run(['connection', 'revoke', connection.connectionId, '--root', root]),
    /explicit --name/,
  );
  await assert.rejects(
    run(['connection', 'list', '--all', '--name', 'coding', '--root', root]),
    /without --name/,
  );
  const all = JSON.parse(
    (await run(['connection', 'list', '--all', '--root', root])).stdout,
  );
  assert.equal(all.computers[0].connections[0].id, connection.connectionId);
  noCredentials(
    listed.stdout + JSON.stringify(all),
    config.token,
    config.ownerToken,
    connection.token,
  );
  const foreign = await ownerRuntime(t, { wrongComputer: true });
  await assert.rejects(
    run([
      'connection',
      'create',
      'codex',
      '--name',
      'coding',
      '--access',
      'work',
      '--root',
      foreign.root,
    ]),
    /identity changed/,
  );
  assert.deepEqual(
    foreign.requests.map((request) => request.path),
    ['/api/owner/info'],
  );
});

test('owner client permits only owner routes and narrowly falls back for old observation info', async (t) => {
  const config = assigned();
  config.ownerToken = randomBytes(32).toString('hex');
  const requests = [];
  let status = 401;
  let code = 'unauthorized';
  config.port = await mockRuntime(t, (req) => {
    const expected = req.url.startsWith('/api/owner/')
      ? config.ownerToken
      : config.token;
    assert.ok(req.headers.authorization === `Bearer ${expected}`);
    requests.push(req.url);
    return req.url === '/api/info'
      ? {
          value: {
            computerId: config.computerId,
            workspaceId: config.workspaceId,
            connection: { id: config.connectionId, access: config.access },
          },
        }
      : { status, value: { code, error: config.ownerToken } };
  });
  const client = new RuntimeClient(config, { owner: true });
  await client.info();
  assert.deepEqual(requests, ['/api/owner/info', '/api/info']);
  status = 404;
  code = 'not_found';
  await client.info();
  assert.deepEqual(requests.slice(-2), ['/api/owner/info', '/api/info']);
  const count = requests.length;
  await assert.rejects(
    client.request('/api/call', { body: { name: 'terminal_run' } }),
    /only request owner/,
  );
  await assert.rejects(
    client.request('/api/owner/../call', { body: {} }),
    /only request owner/,
  );
  assert.equal(requests.length, count);
  status = 401;
  code = 'owner_required';
  await assert.rejects(client.info(), /requires owner credentials/);
  assert.equal(requests.length, count + 1);
  await assert.rejects(
    client.request('/api/owner/connections', {
      body: { label: 'codex', access: 'work' },
    }),
  );
  assert.equal(requests.at(-1), '/api/owner/connections');
});

test('named clients verify computer, workspace, connection ID and access before using legacy or foreign guests', async (t) => {
  const config = assigned();
  let info = {
    computerId: config.computerId,
    workspaceId: config.workspaceId,
    connection: { id: config.connectionId, access: config.access },
  };
  config.port = await mockRuntime(t, (req) => {
    assert.ok(req.headers.authorization === `Bearer ${config.token}`);
    assert.equal(req.headers['x-connection-id'], config.connectionId);
    return { value: info };
  });
  const client = new RuntimeClient(config);
  await client.info();
  for (const override of [
    { computerId: randomUUID() },
    { workspaceId: randomUUID() },
    { connection: { id: randomUUID(), access: 'work' } },
    { connection: { id: config.connectionId, access: 'read' } },
    { connection: undefined },
  ]) {
    const original = info;
    info = { ...info, ...override };
    await assert.rejects(
      client.info(),
      (error) => error.code === 'identity_mismatch',
    );
    info = original;
  }
});

for (const access of ['work', 'read'])
  test(`actual named ${access} MCP bridge starts with a damaged default catalog and uses its scoped credential`, async (t) => {
    const root = await temporary(t);
    const config = assigned({ access });
    const paths = [];
    config.port = await mockRuntime(t, (req) => {
      assert.ok(req.headers.authorization === `Bearer ${config.token}`);
      assert.equal(req.headers['x-connection-id'], config.connectionId);
      paths.push(req.url);
      return {
        value:
          req.url === '/api/info'
            ? {
                computerId: config.computerId,
                workspaceId: config.workspaceId,
                connection: { id: config.connectionId, access: config.access },
                lease: null,
              }
            : { ended: true },
      };
    });
    const file = await persistAssignedConnection(root, config);
    const home = path.join(root, 'home');
    await fs.mkdir(path.join(home, '.computer-mcp'), { recursive: true });
    await fs.writeFile(
      path.join(home, '.computer-mcp', 'registry.json'),
      '{damaged',
    );
    const client = new Client({ name: 'named-bridge-test', version: '0.1.0' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [cli, 'mcp', '--connection', file],
      env: { ...process.env, HOME: home, USERPROFILE: home },
      stderr: 'pipe',
    });
    let stderr = '';
    transport.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    t.after(() => client.close());
    await client.connect(transport);
    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === 'computer_info'));
    assert.equal(tools.tools.length, access === 'work' ? 20 : 9);
    for (const name of ['task_list', 'task_get'])
      assert.ok(tools.tools.some((tool) => tool.name === name));
    assert.equal(
      tools.tools.some((tool) => tool.name === 'task_start'),
      access === 'work',
    );
    assert.equal(
      tools.tools.some((tool) => tool.name === 'terminal_run'),
      access === 'work',
    );
    const prompts = await client.listPrompts();
    assert.equal(
      prompts.prompts.some((prompt) => prompt.name === 'assigned-task'),
      access === 'work',
    );
    await client.close();
    assert.ok(paths.includes('/api/info'));
    assert.ok(
      paths.every((request) =>
        ['/api/info', '/api/session/end'].includes(request),
      ),
    );
    noCredentials(stderr, config.token);
  });
