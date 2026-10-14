import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  requiredPackageFiles,
  validatePackageInventory,
} from '../scripts/package-contract.mjs';
import { setup } from '../src/config.js';
import { version } from '../src/metadata.js';

const exec = promisify(execFile);
const cli = path.resolve('src/cli.js');
test('private package inventory rejects state, media, env, development and generated assets', () => {
  const pkg = { private: true, license: 'UNLICENSED' };
  const files = requiredPackageFiles.map((path) => ({ path }));
  assert.equal(validatePackageInventory(pkg, files).files, files.length);
  for (const path of [
    '.computer-mcp/computer.json',
    'artifacts/demo.webm',
    'ui/assets/screenshot.png',
    'src/.env',
    'src/customer.json',
    'ui/vendor/rfb.js',
    'test/security.test.js',
    '../computer.json',
  ])
    assert.throws(() => validatePackageInventory(pkg, [...files, { path }]));
  assert.throws(() =>
    validatePackageInventory({ ...pkg, private: false }, files),
  );
  assert.throws(() => validatePackageInventory(pkg, files.slice(1)));
});

test('installed-version CLI runs before setup and rejects unrelated options without creating state', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-version-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const absent = path.join(root, 'absent with é');
  for (const flag of ['--version', '-v']) {
    const result = await exec(process.execPath, [cli, flag], {
      cwd: root,
      env: { ...process.env, HOME: absent, USERPROFILE: absent },
    });
    assert.equal(result.stdout, version + '\n');
    assert.equal(result.stderr, '');
  }
  await assert.rejects(
    exec(process.execPath, [cli, '--version', '--root', absent]),
  );
  await assert.rejects(exec(process.execPath, [cli, 'mcp', '--version']));
  await assert.rejects(fs.stat(absent), { code: 'ENOENT' });
});

test('VS Code config from the executable preserves absolute pinned read/work entries without credentials', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-vscode-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const state = path.join(root, 'state with é');
  const config = await setup(state, {
    name: 'vscode',
    context: 'desktop-linux',
  });
  for (const access of ['read', 'work']) {
    const result = await exec(process.execPath, [
      cli,
      'config',
      '--state',
      state,
      '--client',
      'vscode',
      '--access',
      access,
    ]);
    const value = JSON.parse(result.stdout);
    assert.deepEqual(Object.keys(value), ['servers']);
    const entry = value.servers.computer;
    assert.equal(entry.type, 'stdio');
    assert.equal(entry.command, process.execPath);
    assert.deepEqual(entry.args, [
      cli,
      'mcp',
      '--state',
      await fs.realpath(state),
      '--access',
      access,
    ]);
    for (const secret of [config.token, config.ownerToken])
      assert.ok(!result.stdout.includes(secret));
    assert.equal(result.stderr, '');
  }
});

test('unpublished registry template matches package identity/version and explicit scoped CLI setup', async () => {
  const pkg = JSON.parse(await fs.readFile('package.json'));
  const draft = JSON.parse(
    await fs.readFile('docs/registry/server.template.json'),
  );
  assert.equal(draft.name, pkg.mcpName);
  assert.equal(draft.version, pkg.version);
  const [entry] = draft.packages;
  assert.equal(entry.identifier, pkg.name);
  assert.equal(entry.version, pkg.version);
  assert.deepEqual(entry.transport, { type: 'stdio' });
  assert.equal(entry.packageArguments[0].value, 'mcp');
  assert.equal(
    entry.packageArguments.find((x) => x.name === '--state').isRequired,
    true,
  );
  assert.equal(
    entry.packageArguments.find((x) => x.name === '--access').default,
    'read',
  );
  assert.equal(draft.remotes, undefined);
});
