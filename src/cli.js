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
  checkSubnetAvailability,
} from './docker.js';
import { RuntimeClient } from './client.js';
import { serveMCP } from './mcp.js';
import { diagnostics } from './diagnostics.js';
import { version } from './metadata.js';
import {
  connectionEntry,
  formatConnection,
  ownerConnection,
  cliCommand,
  catalogManagement,
  connectionEntryFromFile,
  validateConnectionClient,
} from './connection.js';
import {
  assignedConnectionSchema,
  readAssignedConnection,
  prepareConnectionDirectory,
  persistAssignedConnection,
  namedConnectionKey,
} from './assigned-connections.js';
import {
  connectionCreateSchema,
  connectionPublicSchema,
} from './operations-contract.js';
import * as z from 'zod';
import {
  catalogRoot,
  readRegistry,
  createComputer,
  registerComputer,
  useComputer,
  resolveComputer,
  listComputers,
  computerStatus,
  pinnedConfig,
} from './computers.js';

const help = `Sendtry Computer — an agent's own Linux desktop, managed locally

  init [--name my-computer]       Create/register a computer (setup is an alias)
       [--context desktop-linux] [--port 17670] [--network isolated|internet]
       [--subnet unused-private-/24] Explicit owned IPAM when default pools are full
       [--legacy-access] Opt in to shared legacy MCP credentials for this new PC
  list [--json]                  Check registered PCs; * marks the default
  use <name>                     Select the default for future CLI commands
  register --state /private/path Add an existing computer without copying data
  start [--open] [--rebuild]      Start selected PC; ready PCs keep their sessions
  status                         Report availability, control and identity (JSON)
  doctor [--context local]      Read-only setup/Compose/capacity checks; no PC required
  stop | open                   Stop with data retained, or authorize owner console
  config [--client generic|codex|vscode] Print pinned, credential-free MCP configuration
         --connection /absolute/private/file.json (recommended named connection)
         [--access work|read] Legacy shared configuration for the selected PC
  connection create <label> --name PC --access work|read [--client generic|codex|vscode]
  connection list [--name PC|--state STATE] [--all]
  connection revoke <UUID> --name PC
  connection legacy enable|disable --name PC
  skill                          Print the operator SKILL.md; no PC/setup required
  --version | -v                 Print the installed package version; no setup required
  mcp --connection /absolute/private/file.json  Serve one scoped named connection
  mcp [--access work|read]        Legacy stdio bridge when the owner enables it

Selection: --state /absolute/path > --name <registered-name> > saved default.
Catalog: ~/.computer-mcp; --root /private/catalog isolates all catalog commands.
Connection files supply their own PC, workspace and access. They cannot be combined
with --name, --state, --root or --access. Named configuration never reads the catalog.
Connection create/revoke/legacy require explicit --name or --state; labels are lowercase slugs.
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
    subnet: { type: 'string' },
    state: { type: 'string' },
    root: { type: 'string' },
    client: { type: 'string' },
    access: { type: 'string' },
    connection: { type: 'string' },
    all: { type: 'boolean' },
    'legacy-access': { type: 'boolean' },
    open: { type: 'boolean' },
    rebuild: { type: 'boolean' },
    json: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
  },
});
const allowedOptions = {
  init: [
    'name',
    'context',
    'port',
    'network',
    'subnet',
    'state',
    'legacy-access',
  ],
  setup: [
    'name',
    'context',
    'port',
    'network',
    'subnet',
    'state',
    'legacy-access',
  ],
  list: ['json'],
  use: [],
  register: ['state'],
  start: ['name', 'state', 'open', 'rebuild'],
  status: ['name', 'state'],
  doctor: ['name', 'state', 'context'],
  stop: ['name', 'state'],
  open: ['name', 'state'],
  config: ['name', 'state', 'client', 'access', 'connection'],
  connection: ['name', 'state', 'access', 'client', 'all'],
  skill: [],
  mcp: ['name', 'state', 'access', 'connection'],
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
  const client = new RuntimeClient(config, { owner: true });
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
      'x-computer-id': config.computerId,
      ...(config.workspaceId ? { 'x-workspace-id': config.workspaceId } : {}),
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
function validateConnectionCommand() {
  const action = positionals[1];
  const options = {
    create: ['name', 'state', 'access', 'client'],
    list: ['name', 'state', 'all'],
    revoke: ['name', 'state'],
    legacy: ['name', 'state'],
  };
  if (!Object.hasOwn(options, action || ''))
    throw new Error(
      'Use connection create, list, revoke, or legacy. Run --help.',
    );
  if (positionals.length !== (action === 'list' ? 2 : 3))
    throw new Error('Unexpected connection arguments. Run --help.');
  for (const key of Object.keys(values))
    if (!['root', 'help', ...options[action]].includes(key))
      throw new Error(`--${key} is not supported by connection ${action}.`);
  if (action !== 'list' && !values.name && !values.state)
    throw new Error(
      'Connection changes require explicit --name PC or --state STATE.',
    );
  if (values.all && (values.name || values.state))
    throw new Error('Use connection list --all without --name or --state.');
  if (action === 'create') {
    if (
      !connectionCreateSchema.safeParse({
        label: positionals[2],
        access: values.access,
      }).success
    )
      throw new Error(
        'Use a lowercase label (letter, digits or hyphens; max 40) and --access work or read.',
      );
    validateConnectionClient(values.client);
  }
  if (action === 'revoke' && !z.uuid().safeParse(positionals[2]).success)
    throw new Error('Use connection revoke with a valid connection UUID.');
  if (action === 'legacy' && !['enable', 'disable'].includes(positionals[2]))
    throw new Error('Use connection legacy enable or disable.');
  return action;
}
async function connectionList(state, config, isDefault = false) {
  const client = new RuntimeClient(config, { owner: true });
  await client.info();
  const value = await client.request('/api/owner/connections');
  const parsed = z
    .strictObject({
      connections: z.array(connectionPublicSchema).max(1000),
      legacyEnabled: z.boolean(),
    })
    .safeParse(value);
  if (!parsed.success)
    throw new Error('Runtime returned an invalid connection list.');
  return {
    name: config.name,
    computerId: config.computerId,
    workspaceId: config.workspaceId,
    state,
    isDefault,
    status: 'ready',
    ...parsed.data,
  };
}
async function manageConnections(root) {
  const action = positionals[1];
  if (action === 'list' && values.all) {
    const registry = await readRegistry(root);
    const computers = [];
    for (const entry of registry.computers) {
      try {
        computers.push(
          await connectionList(
            entry.state,
            await pinnedConfig(entry),
            registry.defaultComputerId === entry.computerId,
          ),
        );
      } catch (error) {
        computers.push({
          ...entry,
          isDefault: registry.defaultComputerId === entry.computerId,
          status:
            error.status || error.code === 'identity_mismatch'
              ? 'error'
              : 'unavailable',
          connections: [],
          reason:
            'Could not inspect this PC. Check its saved identity, owner credentials and runtime availability.',
        });
      }
    }
    process.stdout.write(JSON.stringify({ root, computers }, null, 2) + '\n');
    return;
  }
  const { state, config } = await resolveComputer(root, values);
  if (!z.uuid().safeParse(config.workspaceId).success)
    throw new Error(
      'Start the selected computer to pin its workspace before managing connections.',
    );
  if (action === 'list') {
    process.stdout.write(
      JSON.stringify(await connectionList(state, config), null, 2) + '\n',
    );
    return;
  }
  const client = new RuntimeClient(config, { owner: true });
  if (action === 'create') {
    const label = positionals[2];
    const access = values.access;
    // Validate client and local persistence before creating a remote credential.
    const outputClient = validateConnectionClient(values.client);
    await prepareConnectionDirectory(root, config.computerId);
    await client.info();
    const response = await client.request('/api/owner/connections', {
      body: { label, access },
    });
    const connectionId = response?.connection?.id;
    let connection;
    let file;
    try {
      const metadata = connectionPublicSchema.safeParse(response?.connection);
      const parsed = assignedConnectionSchema.safeParse({
        version: 1,
        kind: 'named-connection',
        name: config.name,
        computerId: config.computerId,
        workspaceId: config.workspaceId,
        connectionId,
        label,
        port: config.port,
        access,
        token: response?.secret,
      });
      if (
        !metadata.success ||
        !parsed.success ||
        metadata.data.label !== label ||
        metadata.data.access !== access ||
        metadata.data.revokedAt !== null
      )
        throw new Error(
          'Runtime returned an invalid named connection response.',
        );
      connection = parsed.data;
      file = await persistAssignedConnection(root, connection);
    } catch {
      if (!z.uuid().safeParse(connectionId).success)
        throw new Error(
          'Runtime returned an invalid named connection response. Inspect the selected owner console before retrying.',
        );
      try {
        await client.request(`/api/owner/connections/${connectionId}/revoke`, {
          body: {},
        });
      } catch {
        throw new Error(
          `Could not save the named connection, and automatic revocation failed. Orphan connection: ${connectionId}. Revoke: ${cliCommand('connection', ['revoke', connectionId, '--state', state, '--root', root])}`,
        );
      }
      throw new Error(
        'Could not save a valid private named connection file. The new connection was revoked; inspect local paths and permissions before retrying.',
      );
    }
    process.stdout.write(
      formatConnection(
        connectionEntryFromFile(file),
        outputClient,
        namedConnectionKey(connection),
      ),
    );
    process.stderr.write(
      `Created connection ${label}.\nPrivate file: ${file}\nAdd the printed MCP configuration to your harness, then start a fresh session.\n`,
    );
    return;
  }
  await client.info();
  if (action === 'revoke') {
    await client.request(`/api/owner/connections/${positionals[2]}/revoke`, {
      body: {},
    });
    process.stdout.write(
      `Revoked connection ${positionals[2]} on ${config.name}.\n`,
    );
    return;
  }
  await client.request('/api/owner/legacy', {
    body: { enabled: positionals[2] === 'enable' },
  });
  process.stdout.write(
    `Legacy shared access ${positionals[2] === 'enable' ? 'enabled' : 'disabled'} on ${config.name}.\n`,
  );
}
async function main() {
  const command = positionals[0];
  if (values.version) {
    if (
      positionals.length ||
      Object.keys(values).some((key) => key !== 'version')
    )
      throw new Error('Use --version without other commands or options.');
    process.stdout.write(version + '\n');
    return;
  }
  if (values.help || !command) {
    process.stdout.write(help);
    return;
  }
  if (!Object.hasOwn(allowedOptions, command))
    throw new Error(`Unknown command: ${command}. Run --help.`);
  if (command === 'connection') validateConnectionCommand();
  else if (positionals.length !== (command === 'use' ? 2 : 1))
    throw new Error(
      command === 'use'
        ? 'Use: computer-mcp use <registered-name>'
        : 'Unexpected positional arguments. Run --help.',
    );
  for (const key of Object.keys(values))
    if (!['root', 'help', ...allowedOptions[command]].includes(key))
      throw new Error(`--${key} is not supported by ${command}. Run --help.`);
  if (command === 'skill') {
    process.stdout.write(
      await fs.readFile(
        new URL('../ui/skills/sendtry-computer/SKILL.md', import.meta.url),
        'utf8',
      ),
    );
    return;
  }
  if (values.connection !== undefined) {
    if (
      ['name', 'state', 'root', 'access'].some(
        (key) => values[key] !== undefined,
      )
    )
      throw new Error(
        '--connection cannot be combined with --name, --state, --root or --access.',
      );
    validateConnectionClient(values.client);
    const config = await readAssignedConnection(values.connection);
    if (command === 'mcp') await serveMCP(config);
    else
      process.stdout.write(
        formatConnection(
          connectionEntryFromFile(values.connection),
          values.client,
          namedConnectionKey(config),
        ),
      );
    return;
  }
  const root = catalogRoot(values.root);
  if (command === 'connection') {
    await manageConnections(root);
    return;
  }
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
    await checkSubnetAvailability({
      context,
      subnet: values.subnet,
      network: values.network || 'isolated',
    });
    const { config, state, isDefault } = await createComputer(
      root,
      {
        name: values.name || 'my-computer',
        context,
        ...(values.port !== undefined ? { port: Number(values.port) } : {}),
        network: values.network || 'isolated',
        legacyAccess: values['legacy-access'] || false,
        ...(values.subnet === undefined ? {} : { subnet: values.subnet }),
      },
      values.state,
    );
    process.stdout.write(
      `Created ${config.name}${isDefault ? ' · default' : ''} (${config.computerId}).\nState: ${state}\nConsole port: ${config.port}\nNext: ${cliCommand('start', ['--state', state, '--root', root, '--open'])}\n`,
    );
    return;
  }
  if (command === 'doctor') {
    const explicit = values.name || values.state;
    const registry = explicit ? undefined : await readRegistry(root);
    const selected =
      explicit || registry?.defaultComputerId
        ? await resolveComputer(root, values)
        : undefined;
    if (
      selected &&
      values.context &&
      values.context !== selected.config.context
    )
      throw new Error(
        'Doctor cannot override a selected computer’s saved context. Use its saved context or a separate empty --root for setup diagnostics.',
      );
    const context =
      selected?.config.context ||
      values.context ||
      (['darwin', 'win32'].includes(process.platform)
        ? 'desktop-linux'
        : 'default');
    const report = await diagnostics({ root, context, ...selected });
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (report.result === 'blocked') process.exitCode = 1;
    return;
  }
  const { state, config } = await resolveComputer(root, values);
  const client = new RuntimeClient(config, { owner: true });
  if (command === 'start') {
    await lifecycleLock(state, async () => {
      await checkDocker(config);
      const exists = await checkOwned(config);
      await checkVolume(config);
      await checkNetwork(config);
      await checkRelay(config);
      let info;
      if (exists && config.workspaceId && !values.rebuild) {
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
