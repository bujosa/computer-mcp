import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { randomUUID } from 'node:crypto';
import {
  DesktopInput,
  runX11,
  resetGuestInput,
} from '../runtime/desktop-input.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Lease } from '../runtime/lease.js';
import { Browser } from '../runtime/browser.js';
import { desktopActionSchema, desktopTrace } from '../src/desktop-contract.js';
import { activityAction } from '../runtime/audit-http.js';
import { Teach, reviewWorkflow } from '../runtime/teach.js';
import { exportSkill } from '../runtime/skill.js';

function child() {
  const process = new EventEmitter();
  process.stdin = new PassThrough();
  process.stdout = new PassThrough();
  process.stderr = new PassThrough();
  const signals = [];
  process.kill = (signal) => {
    signals.push(signal);
    queueMicrotask(() => process.emit('close', null));
    return true;
  };
  return { process, signals };
}

test(
  'cleanup ignores hostile Python user-site customization in the guest home',
  { skip: process.platform === 'win32' },
  async (t) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-input-python-'));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    const env = { PATH: process.env.PATH, HOME: root };
    const run = (args) => {
      const result = spawnSync('python3', args, {
        env,
        cwd: root,
        encoding: 'utf8',
        timeout: 5000,
      });
      assert.equal(
        result.status,
        0,
        'Python isolation contract requires python3 on this POSIX QA host.',
      );
      return result.stdout.trim();
    };
    const site = run([
      '-B',
      '-c',
      'import site; print(site.getusersitepackages())',
    ]);
    assert.ok(
      site.startsWith(root + path.sep),
      'User site must belong to the temporary test home.',
    );
    await fs.mkdir(site, { recursive: true });
    const marker = path.join(root, 'customization-loaded');
    await fs.writeFile(
      // Some distributions import their own sitecustomize before user-site.
      // usercustomize still proves writable-home code runs without isolation.
      path.join(site, 'usercustomize.py'),
      `from pathlib import Path\nPath(${JSON.stringify(marker)}).write_text('loaded')\n`,
    );
    run(['-B', '-c', 'pass']);
    assert.equal(await fs.readFile(marker, 'utf8'), 'loaded');
    await fs.unlink(marker);
    let args;
    const fake = child();
    await resetGuestInput({
      launch: (bin, argv, options) => {
        assert.equal(bin, '/usr/bin/python3');
        assert.equal(options.uid, 1000);
        args = argv;
        queueMicrotask(() => fake.process.emit('close', 0));
        return fake.process;
      },
    });
    assert.equal(args.at(-1), '/opt/computer-mcp/runtime/reset-input.py');
    run([...args.slice(0, -1), '-c', 'pass']);
    await assert.rejects(fs.stat(marker), { code: 'ENOENT' });
  },
);

test('takeover revokes old authority and denies new claims until input cleanup completes', async () => {
  const lease = new Lease();
  lease.claim('agent:a', 'agent');
  let finishCleanup;
  const cleanup = new Promise((resolve) => {
    finishCleanup = resolve;
  });
  const input = new DesktopInput({
    run: (_args, { signal }) =>
      new Promise((_, reject) =>
        signal.addEventListener(
          'abort',
          () =>
            reject(
              Object.assign(new Error('cancelled'), { code: 'cancelled' }),
            ),
          { once: true },
        ),
      ),
    cleanup: () => cleanup,
  });
  const operation = lease.run('agent:a', (signal) =>
    input.perform({ action: 'type', text: 'dummy' }, signal),
  );
  const rejected = assert.rejects(operation, { code: 'cancelled' });
  let disconnected = false,
    granted = false;
  const taking = lease
    .take('human:b', () => {
      disconnected = true;
    })
    .then((result) => {
      granted = true;
      return result;
    });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(disconnected, true);
  assert.equal(
    lease.status(),
    null,
    'No actor may open authorized RFB control during cleanup.',
  );
  assert.equal(granted, false);
  assert.throws(() => lease.claim('agent:c', 'agent'), {
    code: 'operation_busy',
  });
  await assert.rejects(lease.take('human:c'), { code: 'operation_busy' });
  finishCleanup();
  await rejected;
  assert.equal((await taking).owner, 'human:b');
  assert.equal(lease.active, null);
  assert.equal(granted, true);
});

test('desktop Teach correlation brackets input and restores browser recording on cancellation', async () => {
  const browser = new Browser('/unused', () => {}),
    marks = [];
  browser.pages.set('1', {
    isClosed: () => false,
    evaluate: async (_fn, value) => marks.push(value),
  });
  await assert.rejects(
    browser.withDesktopRecording(async () => {
      assert.equal(browser.desktopRecording, true);
      assert.deepEqual(marks, [true]);
      throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
    }),
    { code: 'cancelled' },
  );
  assert.deepEqual(marks, [true, false]);
  assert.equal(browser.desktopRecording, false);
  browser.pages.set('1', {
    isClosed: () => false,
    evaluate: async () => {
      throw Error('page closed');
    },
  });
  let performed = false;
  await assert.rejects(
    browser.withDesktopRecording(async () => {
      performed = true;
    }),
    { code: 'recording_unavailable' },
  );
  assert.equal(performed, false);
  assert.equal(browser.desktopRecording, false);
});

test('desktop Teach preserves delivered input across navigation/close and marks genuine cleanup failure incomplete', async () => {
  const browser = new Browser('/unused', () => {});
  let closed = false,
    clears = 0,
    incomplete = 0;
  browser.pages.set('1', {
    isClosed: () => closed,
    evaluate: async (_fn, value) => {
      if (!value && ++clears === 1)
        throw Error(
          'Execution context was destroyed, most likely because of a navigation.',
        );
    },
  });
  assert.deepEqual(
    await browser.withDesktopRecording(
      async () => ({ inputSent: true }),
      () => incomplete++,
    ),
    { inputSent: true },
  );
  assert.equal(clears, 2);
  assert.equal(incomplete, 0);
  assert.deepEqual(
    await browser.withDesktopRecording(
      async () => {
        closed = true;
        return { inputSent: true };
      },
      () => incomplete++,
    ),
    { inputSent: true },
  );
  assert.equal(incomplete, 0);
  closed = false;
  browser.pages.set('1', {
    isClosed: () => false,
    evaluate: async (_fn, value) => {
      if (!value) throw Error('page unreachable');
    },
  });
  assert.deepEqual(
    await browser.withDesktopRecording(
      async () => ({ inputSent: true }),
      () => incomplete++,
    ),
    { inputSent: true },
  );
  assert.equal(incomplete, 1);
  assert.equal(browser.desktopRecording, false);
});

test('desktop contract contains coordinates, keys, literal single-line text and repeats', () => {
  for (const input of [
    { action: 'click', x: 1279, y: 799 },
    { action: 'move', x: 0, y: 0 },
    { action: 'scroll', x: 800, y: 500, direction: 'down', steps: 10 },
    { action: 'type', text: '--window $(dummy); café' },
    ...['Ctrl+l', 'Ctrl+Shift+z', 'Return', 'F12'].map((key) => ({
      action: 'key',
      key,
    })),
  ])
    assert.equal(desktopActionSchema.safeParse(input).success, true);
  for (const input of [
    { action: 'click', x: 1280, y: 0 },
    { action: 'click', x: 0, y: -1 },
    { action: 'click', x: 0.5, y: 0 },
    { action: 'click', x: 0, y: 0, clicks: 3 },
    { action: 'scroll', x: 0, y: 0, direction: 'down', steps: 11 },
    { action: 'type', text: 'line\nReturn' },
    { action: 'type', text: 'x'.repeat(1025) },
    { action: 'key', key: 'Ctrl+Ctrl+l' },
    { action: 'key', key: 'a exec sh' },
    { action: 'key', key: '--window' },
    { action: 'keydown', key: 'Ctrl' },
    { action: 'move', x: 0, y: 0, display: ':0' },
    { action: 'type', text: 'test', window: 1 },
  ])
    assert.equal(desktopActionSchema.safeParse(input).success, false);
  assert.deepEqual(desktopTrace({ action: 'type', text: 'private dummy' }), {
    action: 'type',
  });
  assert.deepEqual(desktopTrace({ action: 'key', key: 'a' }), {
    action: 'key',
  });
});

test('desktop input never interpolates text into argv and cleans keys before completing', async () => {
  const calls = [];
  const input = new DesktopInput({
    run: async (args, options) => calls.push({ args, options }),
    cleanup: async (...args) => {
      assert.deepEqual(args, []);
      calls.push({ cleanup: true });
    },
  });
  const result = await input.perform({
    action: 'type',
    text: '--window $(dummy); café',
  });
  assert.equal(result.inputSent, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.text, '--window $(dummy); café');
  assert.ok(!calls[0].args.join(' ').includes('dummy'));
  assert.ok(calls[0].args.includes('--file'));
  assert.equal(calls[1].cleanup, true);
  const aborted = new AbortController();
  aborted.abort();
  await assert.rejects(
    input.perform({ action: 'key', key: 'Tab' }, aborted.signal),
    { code: 'cancelled' },
  );
  await assert.rejects(input.perform({ action: 'click', x: 1280, y: 0 }), {
    code: 'invalid_arguments',
  });
  assert.equal(calls.length, 2);
});

test('X11 runner uses fixed guest authority, excludes inherited credentials and suppresses error payloads', async () => {
  const fake = child();
  let received = '',
    options,
    command;
  fake.process.stdin.on('data', (data) => {
    received += data.toString();
  });
  const running = runX11(['type', '--file', '-'], {
    text: 'private dummy',
    launch: (bin, _args, config) => {
      command = bin;
      options = config;
      queueMicrotask(() => {
        fake.process.stderr.emit('data', Buffer.from('private dummy'));
        fake.process.emit('close', 1);
      });
      return fake.process;
    },
  });
  await assert.rejects(
    running,
    (error) =>
      error.code === 'desktop_input_failed' &&
      !error.message.includes('private dummy'),
  );
  assert.equal(command, '/usr/bin/xdotool');
  assert.equal(options.uid, 1000);
  assert.equal(options.gid, 1000);
  assert.deepEqual(Object.keys(options.env).sort(), [
    'DISPLAY',
    'HOME',
    'LANG',
    'PATH',
  ]);
  assert.equal(options.env.DISPLAY, ':1');
  assert.equal(received, 'private dummy');
});

test('X11 deadlines, output and cancellation kill only the bounded input child', async () => {
  for (const cause of ['desktop_timeout', 'output_limit', 'cancelled']) {
    const fake = child(),
      controller = new AbortController();
    const running = runX11(['key', 'Tab'], {
      signal: controller.signal,
      timeoutMs: 10,
      launch: () => fake.process,
    });
    if (cause === 'output_limit')
      fake.process.stdout.emit('data', Buffer.alloc(4097));
    if (cause === 'cancelled') controller.abort();
    await assert.rejects(running, { code: cause });
    assert.deepEqual(fake.signals, ['SIGKILL']);
  }
});

test('cancelled input still releases held keys/buttons; failed cleanup blocks further input and notifies runtime', async () => {
  const calls = [];
  const input = new DesktopInput({
    run: async (args) => {
      calls.push(args);
      throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
    },
    cleanup: async () => calls.push('reset'),
  });
  await assert.rejects(input.perform({ action: 'key', key: 'Ctrl+l' }), {
    code: 'cancelled',
  });
  assert.equal(calls.length, 2);
  assert.equal(input.healthy, true);
  let failures = 0;
  const broken = new DesktopInput({
    run: async () => {},
    cleanup: async () => {
      throw Error('X11 unavailable');
    },
    onFailure: () => failures++,
  });
  await assert.rejects(broken.perform({ action: 'key', key: 'Tab' }), {
    code: 'desktop_reset_failed',
  });
  await assert.rejects(broken.perform({ action: 'key', key: 'Tab' }), {
    code: 'desktop_unavailable',
  });
  assert.equal(failures, 1);
});

test('Teach stores desktop geometry with supplied text/key parameters and audited actions exclude input', async () => {
  const saved = [];
  const teach = new Teach(
    { list: async () => [], save: async (w) => saved.push(structuredClone(w)) },
    randomUUID(),
  );
  await teach.start('human:test', { name: 'Desktop task', goal: '' });
  for (const input of [
    { action: 'click', x: 20, y: 30 },
    { action: 'type', text: 'private dummy' },
    { action: 'key', key: 'a' },
    { action: 'scroll', x: 20, y: 30, direction: 'down', steps: 3 },
  ])
    await teach.append({ type: 'desktop', input });
  await teach.append({
    type: 'desktop',
    input: { action: 'move', x: 1280, y: 0 },
  });
  const workflow = await teach.stop('human:test');
  assert.equal(workflow.steps.length, 4);
  assert.equal(workflow.steps[1].parameter, 'input_2');
  assert.equal(workflow.steps[2].parameter, 'input_3');
  assert.equal(workflow.steps[2].desktop.key, undefined);
  assert.ok(!JSON.stringify(saved).includes('private dummy'));
  const reviewed = reviewWorkflow(workflow, {
    expectedRevision: workflow.revision,
    expectedResult: 'Inspect the resulting guest window.',
  });
  const skill = exportSkill(reviewed).content;
  assert.ok(
    skill.includes('single-line text') &&
      skill.includes('supported desktop key/chord') &&
      skill.includes('1280×800'),
  );
  assert.equal(
    activityAction({
      path: '/call',
      body: {
        name: 'desktop_action',
        args: { action: 'type', text: 'private dummy' },
      },
    }),
    'tool.desktop_action.type',
  );
  assert.equal(
    activityAction({
      path: '/call',
      body: { name: 'desktop_action', args: { action: 'private dummy' } },
    }),
    'tool.desktop_action',
  );
});
