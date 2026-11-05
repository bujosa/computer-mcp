import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  desktopAppsMode,
  publishDesktopApps,
  stopDesktopApps,
} from '../runtime/shell.js';

const shell = new URL('../runtime/shell/', import.meta.url);

test('only a human lease opens the owner desktop apps', () => {
  assert.equal(desktopAppsMode(null), 'free');
  assert.equal(desktopAppsMode({ kind: 'human' }), 'owner');
  assert.equal(desktopAppsMode({ kind: 'agent' }), 'agent');
});

test('agent control closes owner apps first and keeps closing them', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-shell-'));
  t.after(() => {
    stopDesktopApps();
    return fs.rm(dir, { recursive: true, force: true });
  });
  const file = path.join(dir, 'desktop-apps');
  const calls = [];
  const kill = (options) => {
    calls.push(options?.sync === false ? 'sweep' : 'now');
    return undefined;
  };
  assert.equal(publishDesktopApps({ kind: 'human' }, { file, kill }), 'owner');
  assert.equal(await fs.readFile(file, 'utf8'), 'owner\n');
  assert.deepEqual(calls, []);
  assert.equal(
    publishDesktopApps({ kind: 'agent' }, { file, kill, interval: 5 }),
    'agent',
  );
  assert.deepEqual(calls, ['now']);
  assert.equal(await fs.readFile(file, 'utf8'), 'agent\n');
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.ok(calls.includes('sweep'));
  publishDesktopApps(null, { file, kill });
  const settled = calls.length;
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(calls.length, settled, 'the sweep stops when control is free');
  assert.equal(await fs.readFile(file, 'utf8'), 'free\n');
});

test('an unwritable holder file fails closed for the launchers', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-shell-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'missing', 'desktop-apps');
  assert.equal(publishDesktopApps({ kind: 'human' }, { file }), 'unknown');
  await assert.rejects(fs.access(file));
});

test('the dock and window manager launch only the reviewed apps', async () => {
  const tint2 = await fs.readFile(new URL('tint2rc', shell), 'utf8');
  const apps = [...tint2.matchAll(/^launcher_item_app = (.+)$/gm)].map((m) =>
    path.basename(m[1]),
  );
  assert.deepEqual(apps, [
    'home.desktop',
    'browser.desktop',
    'files.desktop',
    'terminal.desktop',
  ]);
  for (const app of apps) {
    const entry = await fs.readFile(new URL(`apps/${app}`, shell), 'utf8');
    const exec = entry.match(/^Exec=(.+)$/m)[1];
    const icon = entry.match(/^Icon=(.+)$/m)[1];
    await fs.access(new URL(`bin/${path.basename(exec)}`, shell));
    await fs.access(new URL(`icons/${path.basename(icon)}`, shell));
  }
  for (const owner of ['sendtry-files', 'sendtry-terminal']) {
    const script = await fs.readFile(new URL(`bin/${owner}`, shell), 'utf8');
    assert.match(script.split('\n')[1], /owner-only \w+ \|\| exit 0$/);
  }
  const guard = await fs.readFile(new URL('bin/owner-only', shell), 'utf8');
  assert.match(guard, /\/run\/computer-mcp\/desktop-apps/);
  assert.match(guard, /"\$state" != owner/);
  const openbox = await fs.readFile(new URL('openbox-rc.xml', shell), 'utf8');
  assert.doesNotMatch(openbox, /Execute|ShowMenu/);
});
