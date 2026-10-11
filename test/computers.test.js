import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setup, readConfig, saveConfig } from '../src/config.js';
import {
  readRegistry,
  createComputer,
  registerComputer,
  useComputer,
  resolveComputer,
  listComputers,
  computerStatus,
} from '../src/computers.js';
import {
  connectionEntry,
  ownerConnection,
  connectionSchema,
  cliCommand,
} from '../src/connection.js';

const exec = promisify(execFile);
const cli = path.resolve('src/cli.js');
async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-catalog-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
async function runtime(t, state, options = {}) {
  let response = { lease: null };
  const server = http.createServer((req, res) => {
    assert.equal(req.headers.authorization, `Bearer ${config.token}`);
    res.writeHead(options.status || 200, {
      'content-type': 'application/json',
    });
    res.end(
      JSON.stringify({
        computerId: config.computerId,
        workspaceId: config.workspaceId,
        ...response,
      }),
    );
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const config = await setup(state, {
    name: options.name || 'demo',
    context: 'desktop-linux',
    port: server.address().port,
  });
  config.workspaceId = randomUUID();
  await saveConfig(state, config);
  return {
    config,
    update: (value) => {
      response = value;
    },
  };
}

test('catalog selects first computer, allocates distinct ports and pins explicit/MCP selections', async (t) => {
  const root = await temporary(t);
  const first = await createComputer(root, {
    name: 'coding',
    context: 'desktop-linux',
  });
  const second = await createComputer(root, {
    name: 'research',
    context: 'desktop-linux',
  });
  assert.ok(first.isDefault);
  assert.ok(!second.isDefault);
  assert.notEqual(first.config.port, second.config.port);
  assert.equal(
    (await resolveComputer(root)).config.computerId,
    first.config.computerId,
  );
  const fixed = connectionEntry(first.state);
  await useComputer(root, 'research');
  assert.equal(
    (await resolveComputer(root)).config.computerId,
    second.config.computerId,
  );
  assert.equal(
    (await resolveComputer(root, { name: 'coding' })).state,
    first.state,
  );
  assert.equal(
    (await resolveComputer(root, { state: first.state })).config.computerId,
    first.config.computerId,
  );
  assert.equal(fixed.args[3], first.state);
  await assert.rejects(
    resolveComputer(root, { name: 'research', state: first.state }),
    /does not match/,
  );
  const data = JSON.stringify(await readRegistry(root));
  for (const config of [first.config, second.config]) {
    assert.ok(!data.includes(config.token));
    assert.ok(!data.includes(config.ownerToken));
  }
  if (process.platform !== 'win32') {
    assert.equal(
      (await fs.stat(path.join(root, 'registry.json'))).mode & 0o777,
      0o600,
    );
    assert.equal(
      (await fs.stat(path.dirname(first.state))).mode & 0o777,
      0o700,
    );
  }
});

test('creation respects occupied and reserved ports and never overwrites another computer', async (t) => {
  const root = await temporary(t);
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await assert.rejects(
    createComputer(root, {
      name: 'occupied',
      context: 'desktop-linux',
      port: server.address().port,
    }),
    /reserved or in use/,
  );
  const first = await createComputer(root, {
    name: 'coding',
    context: 'desktop-linux',
  });
  await assert.rejects(
    createComputer(root, {
      name: 'other',
      context: 'desktop-linux',
      port: first.config.port,
    }),
    /reserved or in use/,
  );
  await assert.rejects(
    createComputer(root, { name: 'coding', context: 'desktop-linux' }),
    /already exists/,
  );
  await assert.rejects(
    createComputer(root, { name: '../escape', context: 'desktop-linux' }),
  );
  assert.deepEqual(await readConfig(first.state), first.config);
  assert.equal((await readRegistry(root)).computers.length, 1);
});

test('registration is canonical/idempotent, preserves data and refuses duplicate or replaced identities', async (t) => {
  const root = await temporary(t),
    external = path.join(root, 'external');
  const config = await setup(external, {
    name: 'existing',
    context: 'desktop-linux',
    port: 18100,
  });
  const before = await fs.readFile(
    path.join(external, 'computer.json'),
    'utf8',
  );
  await registerComputer(root, external);
  await registerComputer(root, external);
  assert.equal((await readRegistry(root)).computers.length, 1);
  assert.equal(
    await fs.readFile(path.join(external, 'computer.json'), 'utf8'),
    before,
  );
  const conflicting = path.join(root, 'conflicting');
  await setup(conflicting, {
    name: 'existing',
    context: 'desktop-linux',
    port: 18101,
  });
  await assert.rejects(
    registerComputer(root, conflicting),
    /already registered/,
  );
  await saveConfig(external, { ...config, computerId: randomUUID() });
  await assert.rejects(resolveComputer(root), /identity\/path changed/);
  await assert.rejects(useComputer(root, 'existing'), /identity\/path changed/);
  assert.equal((await listComputers(root))[0].status, 'error');
});

test('invalid catalogs and crash locks fail closed; explicit pinned state remains usable', async (t) => {
  const root = await temporary(t);
  const pc = await createComputer(root, {
    name: 'coding',
    context: 'desktop-linux',
  });
  await fs.mkdir(path.join(root, 'registry.lock'));
  await assert.rejects(useComputer(root, 'coding'), /Another catalog command/);
  await fs.rmdir(path.join(root, 'registry.lock'));
  const registry = await readRegistry(root);
  await fs.writeFile(
    path.join(root, 'registry.json'),
    JSON.stringify({ ...registry, defaultComputerId: randomUUID() }),
  );
  await assert.rejects(resolveComputer(root), /default does not identify/);
  assert.equal(
    (await resolveComputer(root, { state: pc.state })).config.computerId,
    pc.config.computerId,
  );
  await fs.writeFile(
    path.join(root, 'registry.json'),
    JSON.stringify({
      ...registry,
      computers: [...registry.computers, ...registry.computers],
    }),
  );
  await assert.rejects(readRegistry(root), /Duplicate identities/);
  await fs.writeFile(path.join(root, 'registry.json'), '{bad JSON');
  await assert.rejects(readRegistry(root), /will not be reset/);
});

test('legacy unregistered state works without creating a default or scanning other directories', async (t) => {
  const root = await temporary(t),
    state = path.join(root, 'computers', 'my-computer');
  const config = await setup(state, {
    name: 'my-computer',
    context: 'desktop-linux',
  });
  assert.equal(
    (await resolveComputer(root)).config.computerId,
    config.computerId,
  );
  assert.equal((await readRegistry(root)).computers.length, 0);
  await assert.rejects(resolveComputer(root, { name: 'missing' }));
  await saveConfig(state, { ...config, workspaceId: 'invalid' });
  await assert.rejects(
    readConfig(state),
    /Invalid local computer configuration/,
  );
});

test('concurrent creation has one catalog writer and no duplicate port reservation', async (t) => {
  const root = await temporary(t);
  const results = await Promise.allSettled([
    createComputer(root, { name: 'first', context: 'desktop-linux' }),
    createComputer(root, { name: 'second', context: 'desktop-linux' }),
  ]);
  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  assert.match(
    results.find((result) => result.status === 'rejected').reason.message,
    /Another catalog command/,
  );
  assert.equal((await readRegistry(root)).computers.length, 1);
});

test('authenticated startup is reported separately from rejected identity', async (t) => {
  const root = await temporary(t),
    state = path.join(root, 'runtime');
  const { config, update } = await runtime(t, state, { status: 503 });
  update({ code: 'not_ready', error: 'Computer is still starting.' });
  assert.equal((await computerStatus(state, config)).status, 'starting');
});

test('availability reports ready/busy/rejected/unreachable without acquiring or leaking credentials', async (t) => {
  const root = await temporary(t),
    state = path.join(root, 'runtime');
  const { config, update } = await runtime(t, state);
  await registerComputer(root, state);
  assert.equal((await listComputers(root))[0].status, 'ready');
  update({ lease: { kind: 'agent', owner: randomUUID() } });
  const busy = (await listComputers(root))[0];
  assert.equal(busy.status, 'busy');
  assert.equal(busy.control, 'agent');
  assert.equal(
    (await computerStatus(state, { ...config, workspaceId: null })).status,
    'needs-start',
  );
  update({ computerId: randomUUID(), lease: null });
  assert.equal((await listComputers(root))[0].status, 'error');
  update({ workspaceId: randomUUID(), lease: null });
  assert.equal((await listComputers(root))[0].status, 'error');
  update({ workspaceId: 'invalid', lease: null });
  assert.equal(
    (await computerStatus(state, { ...config, workspaceId: null })).status,
    'error',
  );
  assert.equal(
    (await computerStatus(state, { ...config, port: 1 })).status,
    'unreachable',
  );
  const serialized = JSON.stringify(busy);
  assert.ok(!serialized.includes(config.token));
  assert.ok(!serialized.includes(config.ownerToken));
});

test('CLI defaults/config/strict options work through the real executable without Docker mutations', async (t) => {
  const root = await temporary(t);
  const pc = await createComputer(root, {
    name: 'coding',
    context: 'desktop-linux',
  });
  const run = (args) => exec(process.execPath, [cli, ...args, '--root', root]);
  const configured = JSON.parse((await run(['config'])).stdout);
  assert.equal(configured.mcpServers.computer.args[3], pc.state);
  const listed = JSON.parse((await run(['list', '--json'])).stdout);
  assert.equal(listed.computers[0].name, 'coding');
  assert.equal(listed.computers[0].status, 'unreachable');
  assert.ok(listed.computers[0].isDefault);
  await assert.rejects(run(['list', '--name', 'coding']), /not supported/);
  await assert.rejects(run(['nonsense']), /Unknown command/);
  await assert.rejects(run(['use']), /registered-name/);
  await assert.rejects(run(['config', '--access', 'admin']), /Choose --access/);
  await assert.rejects(run(['mcp', '--access', 'admin']), /Choose --access/);
});

test('owner catalog contract contains commands and identity only; no lifecycle API is introduced', async (t) => {
  const root = await temporary(t);
  const pc = await createComputer(root, {
    name: 'coding',
    context: 'desktop-linux',
  });
  const management = {
    defaultName: 'coding',
    listCommand: cliCommand('list', ['--root', root]),
    createCommand: cliCommand('init', ['--name', 'new-computer']),
    computers: [
      {
        name: 'coding',
        computerId: pc.config.computerId,
        isCurrent: true,
        isDefault: true,
        openCommand: cliCommand('open', ['--state', pc.state]),
        startCommand: cliCommand('start', ['--state', pc.state, '--open']),
        useCommand: cliCommand('use', ['coding', '--root', root]),
      },
    ],
  };
  const connection = ownerConnection(pc.state, pc.config, management);
  assert.deepEqual(connection.management, management);
  assert.ok(!JSON.stringify(connection).includes(pc.config.token));
  assert.ok(!JSON.stringify(connection).includes(pc.config.ownerToken));
  assert.ok(
    !connectionSchema.safeParse({
      ...connection,
      management: { ...management, token: pc.config.token },
    }).success,
  );
  assert.ok(
    !connectionSchema.safeParse({
      ...connection,
      management: {
        ...management,
        computers: [{ ...management.computers[0], computerId: 'bad' }],
      },
    }).success,
  );
});
