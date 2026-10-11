#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { saveConfig } from './config.js';
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
  cliCommand,
  catalogManagement,
} from './connection.js';
import {
  catalogRoot,
  readRegistry,
  createComputer,
  registerComputer,
  useComputer,
  resolveComputer,
  listComputers,
  computerStatus,
} from './computers.js';

const help = `Sendtry Computer — an agent's own Linux desktop, managed locally

  init [--name my-computer]       Create/register a computer (setup is an alias)
       [--context desktop-linux] [--port 17670] [--network isolated|internet]
  list [--json]                  Check registered PCs; * marks the default
  use <name>                     Select the default for future CLI commands
  register --state /private/path Add an existing computer without copying data
  start [--open] [--rebuild]      Start selected PC; ready PCs keep their sessions
  status                         Report availability, control and identity (JSON)
  doctor | stop | open           Check Docker, stop with data retained, open console
  config [--client generic|codex] Print pinned, credential-free MCP configuration
         [--access work|read]
  mcp [--access work|read]        Serve stdio to a harness; stdout is protocol only

Selection: --state /absolute/path > --name <registered-name> > saved default.
Catalog: ~/.computer-mcp; --root /private/catalog isolates all catalog commands.
The first init/register becomes default. No PC is created or started implicitly.
Automatic console ports start at 17670. Docker contexts must be local Linux engines.
Default context: desktop-linux on macOS/Windows; default on Linux; never switched.
Default guest network is isolated/offline. No native host control or host mounts.
`;
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: 'string' },
    context: { type: 'string' },
    port: { type: 'string' },
    network: { type: 'string' },
    state: { type: 'string' },
    root: { type: 'string' },
    client: { type: 'string' },
    access: { type: 'string' },
    open: { type: 'boolean' },
    rebuild: { type: 'boolean' },
    json: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
});
const allowedOptions = {
  init: ['name', 'context', 'port', 'network', 'state'],
  setup: ['name', 'context', 'port', 'network', 'state'],
  list: ['json'],
  use: [],
  register: ['state'],
  start: ['name', 'state', 'open', 'rebuild'],
  status: ['name', 'state'],
  doctor: ['name', 'state'],
  stop: ['name', 'state'],
  open: ['name', 'state'],
  config: ['name', 'state', 'client', 'access'],
  mcp: ['name', 'state', 'access'],
};
async function lifecycleLock(state, fn) {
  const lock = path.join(state, 'lifecycle.lock');
  try {
    await fs.mkdir(lock, { mode: 0o700 });
  } catch (error) {
    if (error.code === 'EEXIST')
      throw new Error(
        'A lifecycle command is already running. After a crash, inspect the computer before manually removing lifecycle.lock.',
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
async function openConsole(state, config, root) {
  const client = new RuntimeClient(config);
  await client.info();
  const registry = await readRegistry(root);
  const management = catalogManagement(root, registry, config);
  const response = await fetch(client.base + '/api/owner/ticket', {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
    headers: {
      authorization: `Bearer ${config.ownerToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      connection: ownerConnection(state, config, management, root),
    }),
  });
  if (response.status === 400)
    throw new Error(
      'Guest setup metadata is incompatible with this CLI. Run start --rebuild for the selected computer, then open again.',
    );
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
    child.once('error', () =>
      reject(
        new Error(
          'Browser launch failed. Configure a default browser and run open again.',
        ),
      ),
    );
    child.once('close', (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              'Browser launch failed. Configure a default browser and run open again.',
            ),
          ),
    );
  });
  process.stdout.write(`Opened owner console for ${config.name}.\n`);
}
async function main() {
  const command = positionals[0];
  if (values.help || !command) {
    process.stdout.write(help);
    return;
  }
  if (!Object.hasOwn(allowedOptions, command))
    throw new Error(`Unknown command: ${command}. Run --help.`);
  if (positionals.length !== (command === 'use' ? 2 : 1))
    throw new Error(
      command === 'use'
        ? 'Use: computer-mcp use <registered-name>'
        : 'Unexpected positional arguments. Run --help.',
    );
  for (const key of Object.keys(values))
    if (!['root', 'help', ...allowedOptions[command]].includes(key))
      throw new Error(`--${key} is not supported by ${command}. Run --help.`);
  const root = catalogRoot(values.root);
  if (command === 'list') {
    const computers = await listComputers(root);
    if (values.json)
      process.stdout.write(JSON.stringify({ root, computers }, null, 2) + '\n');
    else if (!computers.length)
      process.stdout.write(
        `No registered computers.\nCreate: ${cliCommand('init', ['--root', root])}\nExisting state: register --state /private/path\n`,
      );
    else {
      process.stdout.write(
        `${' '.repeat(2)}${'COMPUTER'.padEnd(40)} ${'STATUS'.padEnd(13)} ${'CONTROL'.padEnd(8)} CONSOLE\n`,
      );
      for (const pc of computers)
        process.stdout.write(
          `${pc.isDefault ? '*' : ' '} ${pc.name.padEnd(40)} ${pc.status.padEnd(13)} ${(pc.control || '—').padEnd(8)} ${pc.port ? `http://127.0.0.1:${pc.port}` : '—'}\n`,
        );
      process.stdout.write(
        '\n* Default for future CLI commands. MCP configurations stay pinned.\nUnreachable can mean stopped, starting, or Docker unavailable; status gives details.\n',
      );
    }
    return;
  }
  if (command === 'use') {
    const pc = await useComputer(root, positionals[1]);
    process.stdout.write(
      `Default computer: ${pc.name} (${pc.computerId}).\nExisting MCP configurations stay pinned to their own state.\n`,
    );
    return;
  }
  if (command === 'register') {
    if (!values.state)
      throw new Error('Use register --state /existing/private/state.');
    const pc = await registerComputer(root, values.state);
    process.stdout.write(
      `Registered ${pc.config.name}${pc.isDefault ? ' · default' : ''}. No guest data was copied.\n`,
    );
    return;
  }
  if (command === 'init' || command === 'setup') {
    const context =
      values.context ||
      (['darwin', 'win32'].includes(process.platform)
        ? 'desktop-linux'
        : 'default');
    await checkDocker({ context });
    const { config, state, isDefault } = await createComputer(
      root,
      {
        name: values.name || 'my-computer',
        context,
        ...(values.port !== undefined ? { port: Number(values.port) } : {}),
        network: values.network || 'isolated',
      },
      values.state,
    );
    process.stdout.write(
      `Created ${config.name}${isDefault ? ' · default' : ''} (${config.computerId}).\nState: ${state}\nConsole port: ${config.port}\nNext: ${cliCommand('start', ['--state', state, '--root', root, '--open'])}\n`,
    );
    return;
  }
  const { state, config } = await resolveComputer(root, values);
  const client = new RuntimeClient(config);
  if (command === 'doctor') {
    process.stdout.write(
      JSON.stringify(
        {
          node: process.version,
          hostOS: process.platform,
          computer: config.name,
          state,
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
      const exists = await checkOwned(config);
      await checkVolume(config);
      await checkNetwork(config);
      await checkRelay(config);
      let info;
      if (exists && config.workspaceId) {
        try {
          info = await client.info({ timeoutMs: 1500 });
        } catch (error) {
          if (
            (error.status && error.status !== 503) ||
            [
              'identity_mismatch',
              'workspace_mismatch',
              'computer_mismatch',
            ].includes(error.code)
          )
            throw error;
          // An unreachable owned computer may be started; never adopt a different identity.
        }
      }
      if (values.rebuild) info = undefined;
      if (!info) {
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
            ...(values.rebuild || !exists ? ['--build'] : ['--no-recreate']),
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
        while (Date.now() < deadline) {
          try {
            info = await client.info();
            break;
          } catch (error) {
            if (
              (error.status && error.status !== 503) ||
              [
                'identity_mismatch',
                'workspace_mismatch',
                'computer_mismatch',
              ].includes(error.code)
            )
              throw error;
            await new Promise((resolve) => setTimeout(resolve, 1000));
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
      }
      process.stdout.write(
        `Ready: ${config.name}\nComputer: ${info.computerId}\nWorkspace: ${info.workspaceId}\nConsole: ${client.base}\nGuest: ${info.guestOS}\n`,
      );
    });
    if (values.open) await openConsole(state, config, root);
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
          { timeoutMs: 20000 },
        );
    });
    process.stdout.write(
      `Owned computer ${config.name} stopped. Its data volume is preserved.\n`,
    );
    return;
  }
  if (command === 'status') {
    const registry = await readRegistry(root);
    process.stdout.write(
      JSON.stringify(
        await computerStatus(
          state,
          config,
          registry.defaultComputerId === config.computerId,
        ),
        null,
        2,
      ) + '\n',
    );
    return;
  }
  if (command === 'mcp') {
    await serveMCP({ ...config, access: values.access || 'work' });
    return;
  }
  if (command === 'config') {
    process.stdout.write(
      formatConnection(
        connectionEntry(state, values.access || 'work'),
        values.client || 'generic',
      ),
    );
    return;
  }
  if (command === 'open') await openConsole(state, config, root);
}
main().catch((error) => {
  process.stderr.write(`computer-mcp: ${error.message}\n`);
  process.exitCode = 1;
});
