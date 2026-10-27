import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { validateSkillDirectory } from '../scripts/skill-contract.mjs';

const source = path.resolve('skills/sendtry-computer');
const license = await fs.readFile('LICENSE', 'utf8');
async function copy(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-skill-package-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'sendtry-computer');
  await fs.cp(source, directory, { recursive: true });
  return directory;
}
test('operator package is self-contained, licensed and discoverable with optional harness metadata', async () => {
  const result = await validateSkillDirectory(source, license);
  assert.equal(result.name, 'sendtry-computer');
  assert.equal(result.license, 'MIT');
  assert.equal(result.files.length, 3);
});
test('skill package rejects missing attribution, private files and symlinks without exposing their data', async (t) => {
  const directory = await copy(t);
  const privateFile = path.join(directory, '.env');
  await fs.writeFile(privateFile, 'synthetic private payload');
  await assert.rejects(
    validateSkillDirectory(directory, license),
    (error) =>
      !error.message.includes('synthetic private payload') &&
      /Unexpected/.test(error.message),
  );
  await fs.unlink(privateFile);
  await fs.writeFile(path.join(directory, 'LICENSE.txt'), 'wrong notice');
  await assert.rejects(
    validateSkillDirectory(directory, license),
    /canonical MIT/,
  );
  await fs.writeFile(path.join(directory, 'LICENSE.txt'), license);
  if (process.platform !== 'win32') {
    await fs.symlink('SKILL.md', path.join(directory, 'linked.md'));
    await assert.rejects(
      validateSkillDirectory(directory, license),
      /symlinks/,
    );
  }
});
test('invalid naming, duplicate YAML and non-string metadata cannot masquerade as a valid public skill', async (t) => {
  const directory = await copy(t);
  const file = path.join(directory, 'SKILL.md');
  const original = await fs.readFile(file, 'utf8');
  for (const text of [
    original.replace('name: sendtry-computer', 'name: wrong-directory'),
    original.replace('name: sendtry-computer', 'name: sendtry--computer'),
    original.replace(
      'name: sendtry-computer',
      'name: sendtry-computer\nname: duplicate',
    ),
    original.replace("version: '10'", 'version: 10'),
  ]) {
    await fs.writeFile(file, text);
    await assert.rejects(validateSkillDirectory(directory, license));
  }
});
