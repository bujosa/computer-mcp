// Real CLI → Docker guest → stdio MCP lifecycle. UI appearance is reviewed manually.
// Always creates a new private catalog; never adopts an existing state or resource.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readConfig } from '../src/config.js';
import { readRegistry } from '../src/computers.js';
import { RuntimeClient } from '../src/client.js';
import { checkDocker, runDocker, projectName } from '../src/docker.js';

const { values } = parseArgs({ options: { context: { type: 'string' } } });
assert.ok(
  values.context,
  'Usage: npm run test:e2e -- --context <explicit-local-context>',
);
const source = fileURLToPath(new URL('../', import.meta.url));
const exec = promisify(execFile);
const docker = { context: values.context };
// Read-only endpoint/engine validation must precede creating any QA resources.
const engine = await checkDocker(docker);
const currentContext = async () =>
  (await exec('docker', ['context', 'show'])).stdout.trim();
const defaultContext = await currentContext();
const unrelated = async () => {
  const containers = await runDocker(
    docker,
    ['ps', '-a', '--format', '{{json .}}'],
    { capture: true },
  );
  return containers
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter(
      (row) =>
        !owned.some(
          (pc) =>
            row.Names === projectName(pc.config) ||
            row.Names === `${projectName(pc.config)}-console`,
        ),
    )
    .map((row) => `${row.ID}:${row.Names}:${row.State}`)
    .sort();
};
const artifactParent = path.join(source, 'artifacts');
await fs.mkdir(artifactParent, { recursive: true, mode: 0o700 });
const directory = await fs.mkdtemp(path.join(artifactParent, 'e2e-'));
const root = path.join(directory, 'catalog');
const owned = [];
const before = await unrelated();
const report = {
  startedAt: new Date().toISOString(),
  result: 'running',
  directory,
  host: {
    platform: process.platform,
    architecture: process.arch,
    release: os.release(),
    node: process.version,
  },
  engine,
  defaultContext,
  sourceHash: '',
  phases: [],
  computers: [],
  cleanup: [],
};
// Fingerprint tracked source (including local fixes) without archiving private state.
const tracked = (
  await exec(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: source },
  )
).stdout
  .split('\0')
  .filter(Boolean)
  .sort();
const hash = createHash('sha256');
for (const file of tracked)
  hash.update(file).update(await fs.readFile(path.join(source, file)));
report.sourceHash = hash.digest('hex');
report.commit = (
  await exec('git', ['rev-parse', 'HEAD'], { cwd: source })
).stdout.trim();
const redact = (value) => String(value).replace(/[0-9a-f]{64}/g, '[redacted]');
async function phase(name, fn) {
  const startedAt = Date.now();
  try {
    const value = await fn();
    report.phases.push({
      name,
      result: 'passed',
      durationMs: Date.now() - startedAt,
    });
    process.stdout.write(`Passed: ${name}\n`);
    return value;
  } catch (error) {
    report.phases.push({
      name,
      result: 'failed',
      durationMs: Date.now() - startedAt,
      error: redact(error.message).slice(-3000),
    });
    throw error;
  }
}
const node = async (file, args, timeout = 120000) =>
  (
    await exec(process.execPath, [path.join(source, file), ...args], {
      cwd: source,
      timeout,
      maxBuffer: 2 * 1024 * 1024,
    })
  ).stdout;
const cli = (args) => node('src/cli.js', [...args, '--root', root], 16 * 60000);
const status = async (name) =>
  JSON.parse(await cli(['status', '--name', name]));
try {
  await phase('empty catalog and invalid CLI options', async () => {
    assert.deepEqual(JSON.parse(await cli(['list', '--json'])).computers, []);
    await assert.rejects(cli(['use', 'missing']));
    await assert.rejects(cli(['list', '--access', 'read']));
  });
  for (const [name, network] of [
    ['qa-internet', 'internet'],
    ['qa-offline', 'isolated'],
  ]) {
    await phase(`create ${name} without implicit startup`, async () => {
      await cli([
        'init',
        '--name',
        name,
        '--context',
        docker.context,
        '--network',
        network,
      ]);
      const entry = (await readRegistry(root)).computers.find(
        (pc) => pc.name === name,
      );
      const config = await readConfig(entry.state);
      owned.push({ state: entry.state, config });
      report.computers.push({
        name,
        computerId: config.computerId,
        context: config.context,
        port: config.port,
        network,
        state: entry.state,
      });
      assert.equal((await status(name)).status, 'unreachable');
      await assert.rejects(
        cli(['init', '--name', name, '--context', docker.context]),
      );
    });
    await phase(`start and doctor ${name}`, async () => {
      await cli(['start', '--name', name]);
      const pc = owned.at(-1);
      pc.config = await readConfig(pc.state);
      assert.equal((await status(name)).status, 'ready');
      assert.equal(
        JSON.parse(await cli(['doctor', '--name', name])).context,
        docker.context,
      );
    });
    await phase(
      `real MCP/auth/files/terminal/browser/Teach on ${network}`,
      async () => {
        const pc = owned.at(-1);
        const result = JSON.parse(
          await node('scripts/integration.mjs', [
            pc.state,
            path.join(directory, name),
          ]),
        );
        pc.workflowId = result.workflowId;
        pc.browserProof = result.browserProof;
        pc.api = new RuntimeClient(pc.config);
        pc.identity = await pc.api.info();
        assert.equal(result.result, 'passed');
        assert.equal(result.tools, 15);
      },
    );
  }
  await phase(
    'two computers, default switching, pinned stdio and independent leases/files',
    () =>
      node('scripts/catalog-integration.mjs', [
        root,
        'qa-internet',
        'qa-offline',
      ]),
  );
  await phase(
    'reviewed Teach skills and private guest video capture/decode/deletion',
    async () => {
      const result = JSON.parse(
        await node('scripts/teach-integration.mjs', [
          owned[0].state,
          path.join(directory, 'teaching'),
        ]),
      );
      assert.equal(result.result, 'passed');
      report.teachingVideo = result;
    },
  );
  await phase(
    'persistent owner-only activity, MCP identity, durations and read scope',
    async () => {
      const result = JSON.parse(
        await node('scripts/audit-integration.mjs', [
          owned[0].state,
          path.join(directory, 'activity'),
        ]),
      );
      assert.equal(result.result, 'passed');
      report.activity = result;
      owned[0].activityProof = result.retainedOperationId;
    },
  );
  await phase(
    'credential-free generic/read/Codex configurations and idempotent registration',
    async () => {
      const first = owned[0];
      const connection = JSON.parse(await cli(['config', '--access', 'read']))
        .mcpServers.computer;
      assert.ok(connection.args.includes(first.state));
      assert.equal(connection.args.at(-1), 'read');
      const codex = await cli(['config', '--client', 'codex']);
      assert.ok(codex.includes('[mcp_servers.computer]'));
      for (const pc of owned)
        for (const secret of [pc.config.token, pc.config.ownerToken]) {
          assert.ok(!JSON.stringify(connection).includes(secret));
          assert.ok(!codex.includes(secret));
        }
      await cli(['register', '--state', first.state]);
      assert.equal((await readRegistry(root)).computers.length, 2);
    },
  );
  for (const pc of owned) {
    await phase(`${pc.config.network} guest egress policy`, async () => {
      await pc.api.call('control_acquire');
      try {
        const result = await pc.api.call('terminal_run', {
          timeoutMs: 15000,
          command:
            pc.config.network === 'internet'
              ? 'python3 -c \'import urllib.request; r=urllib.request.urlopen("https://example.com",timeout=10); print(r.status)\''
              : 'python3 -c \'import socket,sys;\ntry: socket.create_connection(("1.1.1.1",443),timeout=2); sys.exit(1)\nexcept OSError: print("egress blocked")\'',
        });
        assert.equal(result.exitCode, 0, result.stderr);
        assert.ok(
          result.stdout.includes(
            pc.config.network === 'internet' ? '200' : 'egress blocked',
          ),
        );
      } finally {
        await pc.api.call('control_release');
      }
    });
    await phase(
      `${pc.config.name} restart retains identity/files/profile/Teach/activity and clears lease`,
      async () => {
        const marker = `restart-${randomUUID()}.txt`;
        await pc.api.call('control_acquire');
        await pc.api.call('files_write', { path: marker, text: marker });
        const workflow = await pc.api.call('workflow_get', {
          id: pc.workflowId,
        });
        await cli(['stop', '--name', pc.config.name]);
        assert.equal((await status(pc.config.name)).status, 'unreachable');
        await cli(['start', '--name', pc.config.name]);
        const after = await pc.api.info();
        assert.equal(after.workspaceId, pc.identity.workspaceId);
        assert.equal(after.computerId, pc.identity.computerId);
        assert.notEqual(after.bootId, pc.identity.bootId);
        assert.equal(after.lease, null);
        if (pc.activityProof) {
          const base = pc.api.base;
          const ticket = await fetch(base + '/api/owner/ticket', {
            method: 'POST',
            headers: {
              authorization: `Bearer ${pc.config.ownerToken}`,
              'content-type': 'application/json',
            },
            body: '{}',
          });
          assert.equal(ticket.status, 200);
          const session = await fetch(base + '/api/ui/session', {
            method: 'POST',
            headers: { origin: base, 'content-type': 'application/json' },
            body: JSON.stringify(await ticket.json()),
          });
          assert.equal(session.status, 200);
          const response = await fetch(
            base + '/api/activity?days=1&limit=100',
            {
              headers: {
                cookie: session.headers.get('set-cookie').split(';')[0],
              },
            },
          );
          assert.equal(response.status, 200);
          const retained = (await response.json()).events.find(
            (event) => event.operationId === pc.activityProof,
          );
          assert.ok(
            retained,
            'Owned volume must retain the exact completed activity operation across guest restart.',
          );
          assert.equal(retained.outcome, 'success');
          assert.notEqual(retained.bootId, after.bootId);
        }
        assert.equal(
          (await pc.api.call('files_read', { path: marker })).text,
          marker,
        );
        assert.deepEqual(
          await pc.api.call('workflow_get', { id: pc.workflowId }),
          workflow,
        );
        const restoredPage = await pc.api.call('browser_snapshot');
        assert.ok(
          restoredPage.text.includes(`Reused teaching task ${pc.browserProof}`),
          'Saved project must be restored by the same persistent browser.',
        );
        assert.ok(
          restoredPage.text.includes(
            `Explicit parameter supplied by the MCP client ${pc.browserProof}`,
          ),
          'Saved note must survive restart.',
        );
        await pc.api.call('control_acquire');
        try {
          const profile = await pc.api.call('terminal_run', {
            command: 'test -d /data/home/browser/Default',
          });
          assert.equal(profile.exitCode, 0);
        } finally {
          await pc.api.call('control_release');
        }
      },
    );
  }
  await phase(
    'closed guest browser reopens under a lease without restarting computer',
    async () => {
      const pc = owned[1];
      const before = await pc.api.info();
      await pc.api.call('control_acquire');
      try {
        const closed = await pc.api.call('terminal_run', {
          command:
            "python3 - <<'PY'\nimport os,glob,signal\nfor filename in glob.glob('/proc/[0-9]*/cmdline'):\n try:\n  with open(filename,'rb') as stream: args=stream.read().split(b'\\0')\n  if args and args[0].endswith(b'/chrome') and not any(arg.startswith(b'--type=') for arg in args):\n   os.kill(int(filename.split('/')[2]),signal.SIGTERM)\n except (PermissionError,FileNotFoundError,ProcessLookupError): pass\nPY",
        });
        assert.equal(closed.exitCode, 0);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await assert.rejects(pc.api.call('browser_snapshot'), {
          code: 'browser_closed',
        });
        await pc.api.call('browser_action', {
          action: 'navigate',
          url: 'http://127.0.0.1:7070/demo',
        });
        assert.ok(
          (await pc.api.call('browser_snapshot')).text.includes(
            'Make a project note',
          ),
        );
        assert.equal((await pc.api.info()).bootId, before.bootId);
      } finally {
        await pc.api.call('control_release');
      }
    },
  );
  report.result = 'passed';
} catch (error) {
  report.result = 'failed';
  process.stderr.write(redact(error.message).slice(-3000) + '\n');
  process.exitCode = 1;
} finally {
  for (const pc of owned) {
    try {
      await cli(['stop', '--state', pc.state]);
      report.cleanup.push({
        computerId: pc.config.computerId,
        stopped: true,
        volumeRetained: true,
      });
    } catch (error) {
      report.cleanup.push({
        computerId: pc.config.computerId,
        stopped: false,
        error: redact(error.message).slice(-1000),
      });
      report.result = 'failed';
      process.exitCode = 1;
    }
  }
  try {
    assert.equal(
      await currentContext(),
      defaultContext,
      'Default Docker context changed.',
    );
    assert.deepEqual(
      await unrelated(),
      before,
      'Unrelated container identities/running states changed during QA.',
    );
    report.unrelatedResourcesPreserved = true;
  } catch (error) {
    report.unrelatedResourcesPreserved = false;
    report.result = 'failed';
    report.environmentError = redact(error.message).slice(-1000);
    process.exitCode = 1;
  }
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(
    path.join(directory, 'report.json'),
    JSON.stringify(report, null, 2) + '\n',
    { mode: 0o600 },
  );
  process.stdout.write(
    `E2E ${report.result}. Report: ${path.join(directory, 'report.json')}\nOwned guests stopped; private data volumes retained.\n`,
  );
}
