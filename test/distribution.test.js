import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ESLint } from 'eslint';
import {
  requiredPackageFiles,
  validatePackageInventory,
  validatePackageDocumentation,
} from '../scripts/package-contract.mjs';
import { setup } from '../src/config.js';
import { version } from '../src/metadata.js';

const exec = promisify(execFile);
const cli = path.resolve('src/cli.js');
test('package documentation links resolve to shipped assets and reject omitted local references', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-package-docs-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'docs'));
  await fs.writeFile(
    path.join(root, 'README.md'),
    '[Setup](docs/SETUP.md#install) [Web](https://example.com) [Here](#here)',
  );
  await fs.writeFile(
    path.join(root, 'docs/SETUP.md'),
    '[CLI](../src/cli.js) [Home](../README.md)',
  );
  const files = ['README.md', 'docs/SETUP.md', 'src/cli.js'].map((path) => ({
    path,
  }));
  assert.equal(
    (await validatePackageDocumentation(root, files)).documentationLinks,
    3,
  );
  await assert.rejects(
    validatePackageDocumentation(root, files.slice(0, 2)),
    /Missing package documentation target/,
  );
});

test('lint matcher selects source and browser rules while excluding generated and private artifacts', async () => {
  const lint = new ESLint();
  for (const file of ['src/cli.js', 'runtime/server.js', 'ui/app.js'])
    assert.equal(await lint.isPathIgnored(file), false);
  for (const file of ['artifacts/proof.js', 'ui/vendor/rfb.js'])
    assert.equal(await lint.isPathIgnored(file), true);
  const [unused] = await lint.lintText('const unused = 1;\n', {
    filePath: 'src/lint-proof.js',
  });
  assert.ok(unused.messages.some((item) => item.ruleId === 'no-unused-vars'));
  const [browser] = await lint.lintText('document.title;\n', {
    filePath: 'ui/lint-proof.js',
  });
  assert.equal(browser.errorCount, 0);
  const [server] = await lint.lintText('document.title;\n', {
    filePath: 'runtime/lint-proof.js',
  });
  assert.ok(server.messages.some((item) => item.ruleId === 'no-undef'));
});

test('private package inventory rejects state, media, env, development and generated assets', () => {
  const pkg = { private: true, license: 'MIT' };
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
    entry.packageArguments.find((x) => x.name === '--connection').isRequired,
    true,
  );
  assert.deepEqual(entry.packageArguments.map((x) => x.name).filter(Boolean), [
    '--connection',
  ]);
  assert.equal(draft.remotes, undefined);
});
