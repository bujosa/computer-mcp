import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Files, MAX_FILE } from '../runtime/files.js';
import { Lease } from '../runtime/lease.js';
import { execute } from '../runtime/process.js';
import { Store } from '../runtime/store.js';
import { Teach, publicURL } from '../runtime/teach.js';
import { safeURL } from '../runtime/browser.js';
import { compose, localEndpoint } from '../src/docker.js';
import { setup, readConfig, statePath } from '../src/config.js';
import { tools } from '../src/catalog.js';
import { randomUUID } from 'node:crypto';

async function temporary(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}
test('files contain paths, reject symlinks/hardlinks, enforce byte and directory limits', async (t) => {
  const root = await temporary(t),
    files = new Files(root);
  await files.write('note.txt', 'hello');
  assert.equal((await files.read('note.txt')).text, 'hello');
  for (const invalid of [
    '../escape',
    'folder/../../escape',
    '/etc/passwd',
    'x\\y',
    'bad\0name',
  ])
    await assert.rejects(files.write(invalid, 'no'));
  await fs.mkdir(path.join(root, 'nested'));
  await files.write('nested/note', 'nested');
  assert.equal((await files.read('nested/note')).text, 'nested');
  if (process.platform !== 'win32') {
    await fs.symlink('/etc', path.join(root, 'escape'));
    await assert.rejects(files.read('escape/passwd'), {
      code: 'symlink_denied',
    });
    await fs.symlink('note.txt', path.join(root, 'link'));
    await assert.rejects(files.write('link', 'overwrite'), {
      code: 'symlink_denied',
    });
    await fs.link(path.join(root, 'note.txt'), path.join(root, 'hardlink'));
    await assert.rejects(files.write('hardlink', 'overwrite'), {
      code: 'invalid_file',
    });
  }
  await assert.rejects(files.write('large', 'é'.repeat(MAX_FILE)), {
    code: 'file_limit',
  });
  await fs.writeFile(path.join(root, 'oversized'), 'x'.repeat(MAX_FILE + 1));
  await assert.rejects(files.read('oversized'), { code: 'file_limit' });
  assert.equal((await files.read('note.txt')).text, 'hello');
  await fs.mkdir(path.join(root, 'many'));
  await Promise.all(
    Array.from({ length: 1001 }, (_, i) =>
      fs.writeFile(path.join(root, 'many', String(i)), ''),
    ),
  );
  await assert.rejects(files.list('many'), { code: 'directory_limit' });
});
test('leases reject a second agent, expire, cannot be resurrected and abort on human takeover', async () => {
  let now = 0;
  const lease = new Lease({ ttl: 100, now: () => now });
  const first = lease.claim('agent:a', 'agent');
  assert.throws(() => lease.claim('agent:b', 'agent'), {
    code: 'computer_busy',
  });
  assert.throws(() => lease.release('agent:b'), { code: 'lease_required' });
  const operation = lease.run(
    'agent:a',
    (signal) =>
      new Promise((resolve) =>
        signal.addEventListener('abort', () => resolve('aborted'), {
          once: true,
        }),
      ),
  );
  lease.claim('human:a', 'human', { takeover: true });
  await assert.rejects(operation, { code: 'lease_lost' });
  assert.notEqual(lease.status().generation, first.generation);
  now = 101;
  assert.equal(lease.status(), null);
  assert.throws(() => lease.renew('human:a'), { code: 'lease_required' });
  assert.ok(lease.claim('agent:b', 'agent'));
});
test('only one mutation can run even in the same session', async () => {
  const lease = new Lease();
  lease.claim('a', 'agent');
  let resolve;
  const running = lease.run(
    'a',
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  await assert.rejects(
    lease.run('a', () => true),
    { code: 'operation_busy' },
  );
  resolve('ok');
  assert.equal(await running, 'ok');
});
test(
  'terminal bounds output, deadlines, cancellation and command environment',
  { skip: process.platform === 'win32' },
  async (t) => {
    const cwd = await temporary(t);
    const result = await execute(
      'printf "hello"; printf "warning" >&2; exit 7',
      { cwd },
    );
    assert.equal(result.stdout, 'hello');
    assert.equal(result.stderr, 'warning');
    assert.equal(result.exitCode, 7);
    const timeout = await execute('sleep 3', { cwd, timeoutMs: 100 });
    assert.equal(timeout.stopped, 'timeout');
    const limit = await execute('yes line', { cwd, maxBytes: 1000 });
    assert.equal(limit.stopped, 'output_limit');
    assert.ok(limit.stdout.length <= 1000);
    const controller = new AbortController();
    const running = execute('sleep 10', { cwd, signal: controller.signal });
    setTimeout(() => controller.abort(), 50);
    assert.equal((await running).stopped, 'cancelled');
    const env = await execute('env', { cwd });
    assert.ok(!env.stdout.includes('COMPUTER_TOKEN'));
    await assert.rejects(
      async () => execute('echo no', { cwd, timeoutMs: 30001 }),
      { code: 'invalid_timeout' },
    );
  },
);
test('store pins computer/workspace and persists teach without values or query credentials', async (t) => {
  const root = await temporary(t),
    computerId = randomUUID(),
    store = new Store(root);
  const identity = await store.init(computerId);
  assert.equal(
    (await new Store(root).init(computerId)).workspaceId,
    identity.workspaceId,
  );
  await assert.rejects(new Store(root).init(randomUUID()), {
    code: 'identity_mismatch',
  });
  const teach = new Teach(store, computerId);
  await teach.start('human:a', { name: 'Note', goal: 'Save a note' });
  await teach.append({
    type: 'navigate',
    url: 'https://example.org/task?token=not-a-real-credential#private',
  });
  await teach.append({
    type: 'fill',
    selector: '#title',
    url: 'https://example.org/task',
    value: 'omitted-value',
  });
  await teach.append({ type: 'terminal', command: 'omitted-command' });
  await assert.rejects(teach.stop('human:b'), { code: 'teach_owner' });
  const workflow = await teach.stop('human:a');
  assert.equal(workflow.status, 'ready');
  assert.equal(workflow.steps[1].parameter, 'input_2');
  const restored = await new Store(root).get(workflow.id);
  assert.ok(restored.instructions.includes('input_2'));
  assert.ok(!JSON.stringify(restored).includes('omitted-value'));
  assert.ok(!JSON.stringify(restored).includes('omitted-command'));
  assert.ok(!JSON.stringify(restored).includes('not-a-real-credential'));
  assert.equal((await store.list()).length, 1);
  assert.equal(publicURL('file:///etc/passwd'), null);
  await assert.rejects(store.get('../../elsewhere'), {
    code: 'invalid_workflow',
  });
  await teach.start('human:a', { name: 'Bounded recording', goal: '' });
  for (let i = 0; i < 201; i++)
    await teach.append({
      type: 'click',
      selector: `#step-${i}`,
      url: 'https://example.org/task',
    });
  assert.equal(teach.status().stepCount, 200);
  const checkpoint = store.save(teach.active);
  const capped = await teach.stop('human:a');
  await checkpoint;
  assert.equal(capped.status, 'interrupted');
  assert.equal((await store.get(capped.id)).status, 'interrupted');
});
test('schema rejects unknown arguments, oversized payloads and unsafe browser URLs', () => {
  assert.equal(
    tools.terminal_run.schema.safeParse({ command: 'ls', timeoutMs: 31000 })
      .success,
    false,
  );
  assert.equal(
    tools.files_read.schema.safeParse({ path: 'ok', computerId: 'another' })
      .success,
    false,
  );
  assert.equal(
    tools.browser_action.schema.safeParse({
      action: 'evaluate',
      code: 'anything',
    }).success,
    false,
  );
  for (const url of [
    'file:///etc/passwd',
    'javascript:alert(1)',
    'http://user:password@example.org',
    'invalid',
  ])
    assert.throws(() => safeURL(url), { code: 'invalid_url' });
  assert.equal(safeURL('https://example.org'), 'https://example.org/');
});
test('CLI state never overwrites an existing computer; compose is local, owned and scoped', async (t) => {
  const state = await temporary(t);
  const config = await setup(state, {
    name: 'test',
    context: 'desktop-linux',
    port: 18001,
  });
  await assert.rejects(
    setup(state, { name: 'test', context: 'desktop-linux' }),
    { code: 'EEXIST' },
  );
  assert.equal((await readConfig(state)).computerId, config.computerId);
  assert.throws(() => statePath('../escape'));
  const spec = compose(config),
    service = spec.services.computer;
  assert.equal(service.ports, undefined);
  assert.deepEqual(spec.services.console.ports, ['127.0.0.1:18001:7070']);
  assert.deepEqual(service.networks, ['owned']);
  assert.equal(spec.services.console.volumes, undefined);
  assert.equal(
    compose({ ...config, network: 'internet' }).services.computer.ports[0],
    '127.0.0.1:18001:7070',
  );
  assert.equal(service.labels['computer-mcp.owner'], config.computerId);
  assert.ok(service.volumes.every((v) => v.type === 'volume'));
  assert.equal(service.pids_limit, 192);
  assert.equal(spec.networks.owned.internal, true);
  assert.equal(localEndpoint('ssh://real-machine'), false);
  assert.equal(localEndpoint('tcp://127.0.0.1:2375'), false);
  assert.equal(localEndpoint('unix:///var/run/docker.sock'), true);
  assert.equal(localEndpoint('npipe:////./pipe/docker_engine'), true);
});

test('owner connection configuration has exact state/access without embedding credentials', async (t) => {
  const {
    connectionEntry,
    formatConnection,
    ownerConnection,
    connectionSchema,
  } = await import('../src/connection.js');
  const state = path.join(await temporary(t), "David's computer state");
  const config = {
    name: 'review',
    token: 'do-not-export-work',
    ownerToken: 'do-not-export-owner',
  };
  const connection = ownerConnection(state, config);
  assert.equal(connection.work.args[3], state);
  assert.equal(connection.work.args.at(-1), 'work');
  assert.equal(connection.read.args.at(-1), 'read');
  assert.equal(
    JSON.parse(formatConnection(connection.work)).mcpServers.computer.command,
    process.execPath,
  );
  assert.ok(
    formatConnection(connection.read, 'codex').includes(JSON.stringify(state)),
  );
  assert.ok(!JSON.stringify(connection).includes(config.token));
  assert.ok(!JSON.stringify(connection).includes(config.ownerToken));
  assert.equal(
    connectionSchema.safeParse({ ...connection, extra: true }).success,
    false,
  );
  assert.throws(() => connectionEntry(state, 'admin'));
  assert.throws(() => formatConnection(connection.work, 'unsupported'));
});

test('skill export retains identity and missing parameters and refuses interrupted recordings', async () => {
  const { exportSkill } = await import('../runtime/skill.js');
  const computerId = randomUUID();
  const id = randomUUID();
  const workflow = {
    id,
    computerId,
    name: 'Écrire une note',
    goal: 'Save the requested project note.',
    status: 'ready',
    instructions: '1. fill #project with {{input_1}}',
    steps: [
      { type: 'fill', selector: '#project', parameter: 'input_1' },
      { type: 'terminal', parameter: 'command_2' },
    ],
  };
  const skill = exportSkill(workflow);
  assert.equal(skill.filename, 'SKILL.md');
  assert.ok(skill.name.startsWith('sendtry-ecrire-une-note-'));
  assert.match(skill.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(skill.content.includes(computerId));
  assert.ok(
    skill.content.includes('input_1') && skill.content.includes('command_2'),
  );
  assert.ok(skill.content.includes(workflow.instructions));
  const longName = exportSkill({ ...workflow, name: 'a'.repeat(80) });
  assert.ok(longName.name.length <= 64);
  const unicode = exportSkill({ ...workflow, name: '任务' });
  assert.match(unicode.name, /^sendtry-task-/);
  assert.throws(() => exportSkill({ ...workflow, status: 'interrupted' }), {
    code: 'skill_not_ready',
  });
});
