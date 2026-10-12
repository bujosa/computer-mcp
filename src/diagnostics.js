// Trusted host diagnostics only. Never create a computer, change context or clean resources.
import fs from 'node:fs/promises';
import path from 'node:path';
import { checkDocker, checkOwned, projectName, runDocker } from './docker.js';

const MiB = 1024 * 1024;
export function parseDisk(output) {
  const lines = output.trim().split(/\r?\n/);
  if (lines.length !== 2) throw new Error('Invalid disk report.');
  const fields = lines[1].trim().split(/\s+/);
  const [total, used, available] = fields.slice(1, 4).map(Number);
  const capacity = Number(fields[4]?.replace('%', ''));
  if (
    fields.length !== 6 ||
    fields[5] !== '/data' ||
    ![total, used, available, capacity].every(Number.isSafeInteger) ||
    total <= 0 ||
    used < 0 ||
    available < 0 ||
    used > total ||
    available > total ||
    capacity < 0 ||
    capacity > 100 ||
    ![total, used, available].every((n) => Number.isSafeInteger(n * 1024))
  )
    throw new Error('Invalid disk report.');
  return {
    totalBytes: total * 1024,
    usedBytes: used * 1024,
    availableBytes: available * 1024,
    usedPercent: capacity,
  };
}
async function hostSpace(directory, statfs) {
  let current = path.resolve(directory);
  for (let i = 0; i < 32; i++) {
    try {
      const data = await statfs(current);
      const availableBytes = Number(data.bavail) * Number(data.bsize);
      if (!Number.isSafeInteger(availableBytes) || availableBytes < 0)
        throw new Error('Invalid host disk report.');
      return { availableBytes, scope: 'host-filesystem' };
    } catch (error) {
      if (error.code !== 'ENOENT' || path.dirname(current) === current)
        throw error;
      current = path.dirname(current);
    }
  }
  throw new Error('Host filesystem unavailable.');
}
export async function diagnostics(
  { context, config, state, root },
  {
    dockerCheck = checkDocker,
    owns = checkOwned,
    run = runDocker,
    statfs = fs.statfs,
    node = process.version,
    platform = process.platform,
  } = {},
) {
  const report = {
    version: 1,
    checkedAt: new Date().toISOString(),
    node,
    hostOS: platform,
    context,
    nativeHostControl: false,
    ...(config
      ? {
          computer: config.name,
          computerId: config.computerId,
          workspaceId: config.workspaceId,
          state,
        }
      : {}),
    checks: [],
    storage: { guest: { status: 'not-measured' } },
  };
  const add = (id, status, message) =>
    report.checks.push({ id, status, message });
  const version = /^v?(\d+)\.(\d+)\./.exec(node);
  const nodeOK =
    version && (+version[1] > 22 || (+version[1] === 22 && +version[2] >= 13));
  add(
    'node',
    nodeOK ? 'ok' : 'blocked',
    nodeOK
      ? 'Node meets the 22.13+ requirement.'
      : 'Install Node 22.13 or newer before setup.',
  );
  try {
    report.storage.host = await hostSpace(state || root, statfs);
    add(
      'host-storage',
      report.storage.host.availableBytes === 0
        ? 'blocked'
        : report.storage.host.availableBytes < 256 * MiB
          ? 'warning'
          : 'info',
      report.storage.host.availableBytes === 0
        ? 'Host filesystem has no available space for computer state. Inspect capacity before setup; no cleanup is performed.'
        : report.storage.host.availableBytes < 256 * MiB
          ? 'Host filesystem space is low. Inspect capacity before setup or building. Host free space is not Docker guest free space.'
          : 'Host free space is not Docker guest free space.',
    );
  } catch {
    add(
      'host-storage',
      'warning',
      'Could not measure host free space. Inspect capacity before a build.',
    );
  }
  const target = config || { context };
  let dockerOK = false;
  try {
    const engine = await dockerCheck(target);
    report.guestOS = engine.guestOS;
    report.engine = engine.engine;
    report.architecture = engine.architecture;
    dockerOK = true;
    add(
      'docker',
      'ok',
      'Selected context is a local Linux engine, version 28+.',
    );
  } catch (error) {
    const message = String(error.message);
    add(
      'docker',
      'blocked',
      message.includes('Remote/SSH/TCP')
        ? 'Remote Docker contexts are refused. Choose an explicit local Unix socket or Windows named-pipe context.'
        : message.includes('Windows containers')
          ? 'Select Docker’s Linux container engine; this product supplies a Linux guest.'
          : message.includes('Engine 28+')
            ? 'Upgrade the selected local Docker engine to 28 or newer.'
            : 'Docker is unavailable. Check installation, start the local engine and verify the selected context.',
    );
  }
  if (dockerOK) {
    try {
      const compose = (
        await run(target, ['compose', 'version', '--short'], {
          capture: true,
          timeoutMs: 10000,
        })
      ).trim();
      const composeVersion = /^v?(\d+)\.\d+\.\d+(?:[-+][\w.-]+)?$/.exec(
        compose,
      );
      if (!composeVersion || +composeVersion[1] < 2)
        throw new Error('Unsupported Compose.');
      report.compose = compose;
      add('compose', 'ok', 'Docker Compose plugin meets the v2+ requirement.');
    } catch {
      add(
        'compose',
        'blocked',
        'Install or update the Docker Compose v2+ plugin for the selected local engine.',
      );
    }
    if (config) {
      let owned = false;
      try {
        owned = await owns(config);
        add(
          'ownership',
          'ok',
          owned
            ? 'Selected container has the expected owner, mounts and loopback ports.'
            : 'No container exists yet for this computer.',
        );
      } catch {
        add(
          'ownership',
          'blocked',
          'Selected container ownership, mounts or ports could not be verified. Inspect it before lifecycle changes.',
        );
      }
      if (owned) {
        try {
          const running = (
            await run(
              config,
              [
                'inspect',
                '--format',
                '{{.State.Running}}',
                projectName(config),
              ],
              { capture: true, timeoutMs: 10000 },
            )
          ).trim();
          if (!['true', 'false'].includes(running))
            throw new Error('Unknown container state.');
          report.storage.guest.status =
            running === 'true' ? 'unavailable' : 'stopped';
          if (running === 'true') {
            const disk = parseDisk(
              await run(
                config,
                ['exec', projectName(config), 'df', '-Pk', '/data/workspace'],
                { capture: true, timeoutMs: 10000 },
              ),
            );
            report.storage.guest = { status: 'measured', ...disk };
            add(
              'guest-storage',
              disk.availableBytes < 256 * MiB
                ? 'blocked'
                : disk.availableBytes < 2048 * MiB || disk.usedPercent >= 98
                  ? 'warning'
                  : 'ok',
              disk.availableBytes < 256 * MiB
                ? 'Guest storage is critically low. Preserve data; inspect owned capacity before writes or rebuilding.'
                : disk.availableBytes < 2048 * MiB || disk.usedPercent >= 98
                  ? 'Guest storage is low. Inspect capacity before recording or rebuilding; no cleanup is performed.'
                  : 'Guest free space measured. This does not guarantee that a build or task will fit.',
            );
          } else
            add(
              'guest-storage',
              'info',
              'Guest is stopped; its filesystem was not measured or started.',
            );
        } catch {
          add(
            'guest-storage',
            'warning',
            'Could not measure the selected guest filesystem. No helper computer was started.',
          );
        }
      }
    } else
      add(
        'guest-storage',
        'info',
        'No computer selected. Guest capacity can be measured after starting an owned computer.',
      );
  }
  report.result = report.checks.some((check) => check.status === 'blocked')
    ? 'blocked'
    : report.checks.some((check) => check.status === 'warning')
      ? 'warning'
      : 'ok';
  report.purpose =
    'Read-only prerequisites and capacity. This is not runtime readiness, harness connection or task verification.';
  return report;
}
