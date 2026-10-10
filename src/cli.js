#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { statePath, setup, readConfig, saveConfig } from './config.js';
import {
  runDocker,
  checkDocker,
  checkOwned,
  checkVolume,
  checkNetwork,
  checkRelay,
  composeFile,
  projectName,
} from './docker.js';
import { RuntimeClient } from './client.js';
import { serveMCP } from './mcp.js';
import {
  connectionEntry,
  formatConnection,
  ownerConnection,
} from './connection.js';

const help = `Sendtry Computer (computer-mcp) — give an MCP agent its own Linux desktop\n\n  setup [--name my-computer] [--context desktop-linux] [--port 17670]\n  start [--name my-computer]      Build/start only this owned computer\n  status | doctor | stop | open   Inspect, check, stop or open its console\n  mcp                            Serve MCP on stdio (computer must be started)\n  config [--client generic|codex] Print credential-free harness configuration\n\nAll commands accept --state /absolute/directory. Docker contexts must be local.\nDefault context: desktop-linux on macOS/Windows; default on Linux.\nDefault network is isolated/offline; setup --network internet enables guest egress.\nNo host desktop permissions, host workspace mounts, remote contexts or cloud.\n`;
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: 'string', default: 'my-computer' },
    context: { type: 'string' },
    port: { type: 'string' },
    network: { type: 'string' },
    state: { type: 'string' },
    client: { type: 'string', default: 'generic' },
    access: { type: 'string', default: 'work' },
    help: { type: 'boolean', short: 'h' },
  },
});
async function lifecycleLock(state, fn) {
  const lock = path.join(state, 'lifecycle.lock');
  try {
    await fs.mkdir(lock, { mode: 0o700 });
  } catch (error) {
    if (error.code === 'EEXIST')
      throw new Error(
        'A lifecycle command is already running. If it crashed, inspect the computer then remove its lifecycle.lock directory manually.',
        { cause: error },
      );
    throw error;
  }
  try {
    return await fn();
  } finally {
    await fs.rmdir(lock);
  }
}
async function main() {
  const command = positionals[0];
  if (values.help || !command) {
    process.stdout.write(help);
    return;
  }
  const state = statePath(values.name, values.state);
  if (command === 'setup') {
    const context =
      values.context ||
      (process.platform === 'darwin' || process.platform === 'win32'
        ? 'desktop-linux'
        : 'default');
    await checkDocker({ context });
    const config = await setup(state, {
      name: values.name,
      context,
      port: values.port ? Number(values.port) : 17670,
      network: values.network || 'isolated',
    });
    process.stdout.write(
      `Created ${config.name} (${config.computerId}).\nState: ${state}\nNext: computer-mcp start --state ${JSON.stringify(state)}\n`,
    );
    return;
  }
  const config = await readConfig(state);
  if (values.network && values.network !== config.network)
    throw new Error(
      'Network policy belongs to setup. Create a new computer to change it.',
    );
  if (
    (values.context && values.context !== config.context) ||
    (values.port && Number(values.port) !== config.port)
  )
    throw new Error(
      'Context/port belong to setup. Use a new computer name for another configuration.',
    );
  const client = new RuntimeClient(config);
  if (command === 'doctor') {
    process.stdout.write(
      JSON.stringify(
        {
          node: process.version,
          hostOS: process.platform,
          ...(await checkDocker(config)),
          nativeHostControl: false,
        },
        null,
        2,
      ) + '\n',
    );
    return;
  }
  if (command === 'start') {
    await lifecycleLock(state, async () => {
      await checkDocker(config);
      await checkOwned(config);
      await checkVolume(config);
      await checkNetwork(config);
      await checkRelay(config);
      const file = await composeFile(state, config);
      await runDocker(
        config,
        [
          'compose',
          '--project-name',
          projectName(config),
          '-f',
          file,
          'up',
          '--build',
          '--detach',
        ],
        {
          timeoutMs: 15 * 60000,
          extraEnv: {
            COMPUTER_TOKEN: config.token,
            OWNER_TOKEN: config.ownerToken,
          },
        },
      );
      const deadline = Date.now() + 90000;
      let info;
      while (Date.now() < deadline) {
        try {
          info = await client.info();
          break;
        } catch (error) {
          if (
            error.message.includes('identity changed') ||
            ['workspace_mismatch', 'computer_mismatch'].includes(error.code)
          )
            throw error;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      if (!info)
        throw new Error(
          'Computer did not become ready within 90 seconds. Inspect only this owned container’s logs.',
        );
      if (!config.workspaceId) {
        config.workspaceId = info.workspaceId;
        await saveConfig(state, config);
      }
      process.stdout.write(
        `Ready: ${config.name}\nComputer: ${info.computerId}\nWorkspace: ${info.workspaceId}\nConsole: ${client.base}\nGuest: ${info.guestOS}\n`,
      );
    });
    return;
  }
  if (command === 'stop') {
    await lifecycleLock(state, async () => {
      await checkDocker(config);
      const hasRelay = await checkRelay(config);
      if (await checkOwned(config))
        await runDocker(
          config,
          [
            'stop',
            '--timeout',
            '10',
            projectName(config),
            ...(hasRelay ? [`${projectName(config)}-console`] : []),
          ],
          {
            timeoutMs: 20000,
          },
        );
    });
    process.stdout.write(
      'Owned computer stopped. Its data volume is preserved.\n',
    );
    return;
  }
  if (command === 'status') {
    process.stdout.write(JSON.stringify(await client.info(), null, 2) + '\n');
    return;
  }
  if (command === 'mcp') {
    if (!['work', 'read'].includes(values.access))
      throw new Error('Choose --access work or read.');
    await serveMCP({ ...config, access: values.access });
    return;
  }
  if (command === 'config') {
    process.stdout.write(
      formatConnection(connectionEntry(state, values.access), values.client),
    );
    return;
  }
  if (command === 'open') {
    await client.info();
    const response = await fetch(client.base + '/api/owner/ticket', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.ownerToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ connection: ownerConnection(state, config) }),
    });
    if (!response.ok) throw new Error('Could not authorize the owner console.');
    const { ticket } = await response.json();
    const consoleURL = `${client.base}/#ticket=${ticket}`;
    const [binary, args] =
      process.platform === 'darwin'
        ? ['open', [consoleURL]]
        : process.platform === 'win32'
          ? ['rundll32', ['url.dll,FileProtocolHandler', consoleURL]]
          : ['xdg-open', [consoleURL]];
    await new Promise((resolve, reject) => {
      const child = spawn(binary, args, { stdio: 'ignore' });
      child.once('error', reject);
      child.once('close', (code) =>
        code === 0
          ? resolve()
          : reject(
              new Error(
                'Browser launch failed. Configure the default browser and run open again.',
              ),
            ),
      );
    });
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}
main().catch((error) => {
  process.stderr.write(`computer-mcp: ${error.message}\n`);
  process.exitCode = 1;
});
