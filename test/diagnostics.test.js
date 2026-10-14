import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setup } from '../src/config.js';
import { diagnostics, parseDisk } from '../src/diagnostics.js';
import { buildPathAdvice } from '../src/docker.js';

const config = {
  name: 'review',
  context: 'desktop-linux',
  computerId: '3ab5e9c8-b48f-4b58-92a1-0dbff45aa54f',
  workspaceId: null,
};
const options = { context: config.context, root: '/private/unused-catalog' };
const deps = {
  node: 'v22.13.0',
  platform: 'darwin',
  sourceRoot: '/private/source with spaces',
  statfs: async () => ({ bavail: 100000, bsize: 4096 }),
  dockerCheck: async () => ({
    guestOS: 'linux',
    engine: '29.2.1',
    architecture: 'arm64',
  }),
};

test('source-path diagnostics warn about BuildKit Unicode independently of catalog/state paths', async () => {
  for (const [platform, sourceRoot] of [
    ['linux', '/home/owner/source with é'],
    ['win32', 'C:\\Users\\owner\\source with é'],
  ]) {
    const report = await diagnostics(options, {
      ...deps,
      platform,
      sourceRoot,
      run: async () => 'v2.35.0',
    });
    assert.equal(report.result, 'warning');
    const check = report.checks.find((x) => x.id === 'source-path');
    assert.equal(check.status, 'warning');
    assert.match(check.message, /ASCII-only checkout/);
    assert.ok(!JSON.stringify(report).includes(sourceRoot));
  }
  const report = await diagnostics(
    { ...options, root: '/catalog with é' },
    {
      ...deps,
      run: async () => 'v2.35.0',
    },
  );
  assert.equal(report.result, 'ok');
  assert.equal(
    report.checks.find((x) => x.id === 'source-path').status,
    'info',
  );
});

test('known BuildKit path transport rejection gets recovery advice without leaking its payload', () => {
  const message =
    'header key "x-docker-expose-session-sharedkey" contains value with non-printable ASCII characters';
  const advice = buildPathAdvice(message + ' private-path-payload');
  assert.match(advice, /same explicit private state/);
  assert.match(advice, /Do not delete or recreate/);
  assert.ok(!advice.includes('private-path-payload'));
  assert.equal(buildPathAdvice('permission denied'), '');
  assert.equal(buildPathAdvice('non-printable ASCII in another header'), '');
});

test('pre-creation diagnostic reads prerequisites without needing or creating a computer', async () => {
  const calls = [];
  const report = await diagnostics(options, {
    ...deps,
    owns: async () => assert.fail('No computer to inspect'),
    run: async (target, args) => {
      assert.deepEqual(target, { context: 'desktop-linux' });
      calls.push(args);
      return 'v2.35.0\n';
    },
  });
  assert.equal(report.result, 'ok');
  assert.equal(report.nativeHostControl, false);
  assert.equal(report.storage.guest.status, 'not-measured');
  assert.equal(report.storage.host.scope, 'host-filesystem');
  assert.equal(report.computerId, undefined);
  assert.deepEqual(calls, [['compose', 'version', '--short']]);
});

test('unavailable/nonlocal engine is reported without raw stderr or further Docker calls', async () => {
  const sentinel = 'private-error-payload';
  const report = await diagnostics(options, {
    ...deps,
    dockerCheck: async () => {
      throw new Error('Remote/SSH/TCP contexts: ' + sentinel);
    },
    run: async () => assert.fail('No daemon calls after rejection'),
  });
  assert.equal(report.result, 'blocked');
  assert.match(
    report.checks.find((x) => x.id === 'docker').message,
    /Remote Docker contexts are refused/,
  );
  assert.ok(!JSON.stringify(report).includes(sentinel));
});

test('full host filesystem blocks pre-creation diagnostics independently of guest storage', async () => {
  const report = await diagnostics(options, {
    ...deps,
    statfs: async () => ({ bavail: 0, bsize: 4096 }),
    run: async () => 'v2.35.0',
  });
  assert.equal(report.result, 'blocked');
  assert.equal(
    report.checks.find((x) => x.id === 'host-storage').status,
    'blocked',
  );
  assert.equal(report.storage.guest.status, 'not-measured');
});

test('unverified ownership prevents reading another container filesystem', async () => {
  const calls = [];
  const report = await diagnostics(
    { ...options, config, state: '/private/state' },
    {
      ...deps,
      owns: async () => {
        throw new Error('foreign container');
      },
      run: async (_target, args) => {
        calls.push(args);
        return '2.35.0';
      },
    },
  );
  assert.equal(report.result, 'blocked');
  assert.deepEqual(calls, [['compose', 'version', '--short']]);
});

test('stopped owned guest is inspected without being started or measured', async () => {
  const calls = [];
  const report = await diagnostics(
    { ...options, config, state: '/private/state' },
    {
      ...deps,
      owns: async () => true,
      run: async (_target, args) => {
        calls.push(args);
        return args[0] === 'compose' ? 'v2.35.0' : 'false';
      },
    },
  );
  assert.equal(report.storage.guest.status, 'stopped');
  assert.ok(calls.every((args) => ['compose', 'inspect'].includes(args[0])));
  assert.ok(
    !calls.some((args) => args.includes('up') || args.includes('exec')),
  );
});

test('real guest measurement is distinct from host capacity and blocks critically low storage', async () => {
  const calls = [];
  const report = await diagnostics(
    { ...options, config, state: '/private/state' },
    {
      ...deps,
      owns: async () => true,
      run: async (target, args) => {
        assert.equal(target.context, 'desktop-linux');
        calls.push(args);
        return args[0] === 'compose'
          ? 'v10.0.0'
          : args[0] === 'inspect'
            ? 'true'
            : 'Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/vda1 1000000 999900 100 100% /data\n';
      },
    },
  );
  assert.equal(report.result, 'blocked');
  assert.equal(report.storage.guest.availableBytes, 102400);
  assert.notEqual(
    report.storage.guest.availableBytes,
    report.storage.host.availableBytes,
  );
  assert.deepEqual(calls[2], [
    'exec',
    'cmcp-' + config.computerId,
    'df',
    '-Pk',
    '/data/workspace',
  ]);
});

test('invalid measurement and missing Compose never become a false prerequisite pass', async () => {
  for (const invalid of [
    '',
    'not a report',
    'Filesystem\n/dev/vda1 10 5 5 50% /',
    'Filesystem\n/dev/vda1 10 5 -5 50% /data',
    'Filesystem\n/dev/vda1 10 5 5 500% /data',
  ])
    assert.throws(() => parseDisk(invalid), /Invalid disk/);
  const report = await diagnostics(options, {
    ...deps,
    run: async () => {
      throw new Error('plugin not found');
    },
  });
  assert.equal(report.result, 'blocked');
  assert.equal(report.checks.find((x) => x.id === 'compose').status, 'blocked');
});

test('older Node is blocked and unavailable guest measurement remains a warning', async () => {
  const report = await diagnostics(
    { ...options, config, state: '/private/state' },
    {
      ...deps,
      node: 'v22.12.0',
      owns: async () => true,
      run: async (_target, args) =>
        args[0] === 'compose'
          ? 'v2.35.0'
          : args[0] === 'inspect'
            ? 'true'
            : 'invalid',
    },
  );
  assert.equal(report.result, 'blocked');
  assert.equal(report.checks.find((x) => x.id === 'node').status, 'blocked');
  assert.equal(report.storage.guest.status, 'unavailable');
  assert.equal(
    report.checks.find((x) => x.id === 'guest-storage').status,
    'warning',
  );
});

test('explicit-state doctor bypasses a damaged catalog and rejects a saved-context override before Docker', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-doctor-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const state = path.join(directory, 'state');
  await setup(state, { name: 'review', context: 'desktop-linux' });
  const damaged = '{ damaged catalog }';
  await fs.writeFile(path.join(directory, 'registry.json'), damaged);
  await assert.rejects(
    promisify(execFile)(process.execPath, [
      path.resolve('src/cli.js'),
      'doctor',
      '--root',
      directory,
      '--state',
      state,
      '--context',
      'different-local',
    ]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /cannot override a selected computer/);
      assert.equal(error.stdout, '');
      return true;
    },
  );
  assert.equal(
    await fs.readFile(path.join(directory, 'registry.json'), 'utf8'),
    damaged,
  );
});
