import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as z from 'zod';
import { formatCommandEntry } from './command-line.js';
import { assignedConnectionDirectory } from './assigned-connections.js';

const entry = z
  .object({
    command: z.string().min(1).max(4096),
    args: z.array(z.string().max(4096)).min(1).max(20),
  })
  .strict();
const templateEntry = (placeholders) =>
  entry.refine(
    (value) =>
      placeholders.every(
        (placeholder) =>
          value.args.filter((arg) => arg === placeholder).length === 1,
      ) &&
      value.args.every(
        (arg) =>
          !/__(?:AGENT_LABEL|ACCESS|CLIENT|CONNECTION_FILE)__/.test(arg) ||
          placeholders.includes(arg),
      ),
    'Use each standalone connection placeholder exactly once.',
  );
const assignedSchema = z
  .object({
    platform: z.enum(['posix', 'win32']),
    create: templateEntry(['__AGENT_LABEL__', '__ACCESS__', '__CLIENT__']),
    config: templateEntry(['__CONNECTION_FILE__', '__CLIENT__']),
    directory: z.string().max(4096),
    separator: z.enum(['/', '\\']),
    listCommand: z.string().max(16000),
  })
  .strict()
  .refine(
    (value) =>
      (value.platform === 'win32'
        ? path.win32.isAbsolute(value.directory) && value.separator === '\\'
        : path.posix.isAbsolute(value.directory) && value.separator === '/') &&
      !/[\0\r\n]/.test(value.directory),
    'Connection directory must match the host platform.',
  );
export const connectionSchema = z
  .object({
    computerName: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
    work: entry,
    read: entry,
    assigned: assignedSchema.optional(),
    openCommand: z.string().max(16000),
    management: z
      .object({
        listCommand: z.string().max(16000),
        createCommand: z.string().max(16000),
        defaultName: z
          .string()
          .regex(/^[a-z][a-z0-9-]{0,39}$/)
          .nullable(),
        computers: z
          .array(
            z
              .object({
                name: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
                computerId: z.uuid(),
                isDefault: z.boolean(),
                isCurrent: z.boolean(),
                openCommand: z.string().max(16000),
                startCommand: z.string().max(16000),
                useCommand: z.string().max(16000),
              })
              .strict(),
          )
          .max(100),
      })
      .strict()
      .optional(),
  })
  .strict();

export function connectionEntry(state, access = 'work') {
  if (!['work', 'read'].includes(access))
    throw new Error('Choose --access work or read.');
  return {
    command: process.execPath,
    args: [
      fileURLToPath(new URL('./cli.js', import.meta.url)),
      'mcp',
      '--state',
      state,
      '--access',
      access,
    ],
  };
}
export function connectionEntryFromFile(file) {
  if (!path.isAbsolute(file) || /[\0\r\n]/.test(file))
    throw new Error('Use --connection with an absolute private file path.');
  return {
    command: process.execPath,
    args: [
      fileURLToPath(new URL('./cli.js', import.meta.url)),
      'mcp',
      '--connection',
      file,
    ],
  };
}
export function validateConnectionClient(client = 'generic') {
  if (!['generic', 'codex', 'vscode'].includes(client))
    throw new Error('Choose generic, codex or vscode configuration.');
  return client;
}
export function formatConnection(
  entry,
  client = 'generic',
  serverName = 'computer',
) {
  validateConnectionClient(client);
  if (
    typeof serverName !== 'string' ||
    !serverName ||
    serverName.length > 120 ||
    /[\0\r\n]/.test(serverName)
  )
    throw new Error('Invalid MCP server name.');
  if (client === 'codex')
    return `[mcp_servers.${/^[A-Za-z0-9_-]+$/.test(serverName) ? serverName : JSON.stringify(serverName)}]\ncommand = ${JSON.stringify(entry.command)}\nargs = ${JSON.stringify(entry.args)}\n`;
  if (client === 'generic')
    return (
      JSON.stringify({ mcpServers: { [serverName]: entry } }, null, 2) + '\n'
    );
  if (client === 'vscode')
    return (
      JSON.stringify(
        { servers: { [serverName]: { type: 'stdio', ...entry } } },
        null,
        2,
      ) + '\n'
    );
}
export function cliCommand(command, args = []) {
  return formatCommandEntry(
    {
      command: process.execPath,
      args: [
        fileURLToPath(new URL('./cli.js', import.meta.url)),
        command,
        ...args,
      ],
    },
    process.platform === 'win32' ? 'win32' : 'posix',
  );
}
export function catalogManagement(root, registry, config) {
  return {
    defaultName:
      registry.computers.find(
        (entry) => entry.computerId === registry.defaultComputerId,
      )?.name || null,
    listCommand: cliCommand('list', ['--root', root]),
    createCommand: cliCommand('init', [
      '--name',
      'new-computer',
      '--context',
      config.context,
      '--root',
      root,
    ]),
    computers: registry.computers.map((entry) => ({
      name: entry.name,
      computerId: entry.computerId,
      isDefault: entry.computerId === registry.defaultComputerId,
      isCurrent: entry.computerId === config.computerId,
      openCommand: cliCommand('open', ['--state', entry.state, '--root', root]),
      startCommand: cliCommand('start', [
        '--state',
        entry.state,
        '--root',
        root,
        '--open',
      ]),
      useCommand: cliCommand('use', [entry.name, '--root', root]),
    })),
  };
}
export function ownerConnection(state, config, management, root) {
  const work = connectionEntry(state);
  return connectionSchema.parse({
    computerName: config.name,
    work,
    read: connectionEntry(state, 'read'),
    ...(root
      ? {
          assigned: {
            platform: process.platform === 'win32' ? 'win32' : 'posix',
            create: {
              command: process.execPath,
              args: [
                fileURLToPath(new URL('./cli.js', import.meta.url)),
                'connection',
                'create',
                '__AGENT_LABEL__',
                '--state',
                state,
                '--root',
                root,
                '--access',
                '__ACCESS__',
                '--client',
                '__CLIENT__',
              ],
            },
            config: {
              command: process.execPath,
              args: [
                fileURLToPath(new URL('./cli.js', import.meta.url)),
                'config',
                '--connection',
                '__CONNECTION_FILE__',
                '--client',
                '__CLIENT__',
              ],
            },
            directory: assignedConnectionDirectory(root, config.computerId),
            separator: process.platform === 'win32' ? '\\' : '/',
            listCommand: cliCommand('connection', [
              'list',
              '--state',
              state,
              '--root',
              root,
            ]),
          },
        }
      : {}),
    openCommand: cliCommand('open', [
      '--state',
      state,
      ...(root ? ['--root', root] : []),
    ]),
    ...(management ? { management } : {}),
  });
}
