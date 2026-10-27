import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { atomicJSON } from '../runtime/store.js';

for (const phase of ['writeFile', 'sync', 'close', 'rename'])
  test(`failed JSON checkpoint ${phase} preserves the published state and leaves no staged content`, async (t) => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'cmcp-checkpoint-'),
    );
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const target = path.join(directory, 'state.json');
    await atomicJSON(target, { revision: 'previous' });
    const failure = Object.assign(new Error('Synthetic capacity failure'), {
      code: 'ENOSPC',
    });
    if (phase === 'rename')
      t.mock.method(fs, 'rename', async () => {
        throw failure;
      });
    else {
      const open = fs.open.bind(fs);
      t.mock.method(fs, 'open', async (...args) => {
        const handle = await open(...args);
        const write = handle.writeFile.bind(handle);
        const close = handle.close.bind(handle);
        t.mock.method(handle, phase, async () => {
          if (phase === 'writeFile') await write('incomplete unpublished data');
          if (phase === 'close') await close();
          throw failure;
        });
        return handle;
      });
    }
    await assert.rejects(atomicJSON(target, { revision: 'replacement' }), {
      code: 'ENOSPC',
    });
    assert.deepEqual(JSON.parse(await fs.readFile(target, 'utf8')), {
      revision: 'previous',
    });
    assert.deepEqual(await fs.readdir(directory), ['state.json']);
  });

test('successful JSON checkpoint replaces complete content with private permissions', async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'cmcp-checkpoint-'),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const target = path.join(directory, 'state.json');
  await atomicJSON(target, { revision: 'first' });
  await atomicJSON(target, { revision: 'complete', text: 'literal UTF-8 é' });
  assert.deepEqual(JSON.parse(await fs.readFile(target, 'utf8')), {
    revision: 'complete',
    text: 'literal UTF-8 é',
  });
  assert.deepEqual(await fs.readdir(directory), ['state.json']);
  if (process.platform !== 'win32')
    assert.equal((await fs.stat(target)).mode & 0o777, 0o600);
});
