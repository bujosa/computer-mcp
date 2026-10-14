import { fileURLToPath } from 'node:url';
import * as z from 'zod';

const entry = z
  .object({
    command: z.string().min(1).max(4096),
    args: z.array(z.string().max(4096)).min(1).max(12),
  })
  .strict();
export const connectionSchema = z
  .object({
    computerName: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
    work: entry,
    read: entry,
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
export function formatConnection(entry, client = 'generic') {
  if (client === 'codex')
    return `[mcp_servers.computer]\ncommand = ${JSON.stringify(entry.command)}\nargs = ${JSON.stringify(entry.args)}\n`;
  if (client === 'generic')
    return JSON.stringify({ mcpServers: { computer: entry } }, null, 2) + '\n';
  if (client === 'vscode')
    return (
      JSON.stringify(
        { servers: { computer: { type: 'stdio', ...entry } } },
        null,
        2,
      ) + '\n'
    );
  throw new Error('Choose generic, codex or vscode configuration.');
}
export function cliCommand(command, args = []) {
  const quote = (value) =>
    process.platform === 'win32'
      ? `'${value.replaceAll("'", "''")}'`
      : `'${value.replaceAll("'", "'\\''")}'`;
  return (
    (process.platform === 'win32' ? '& ' : '') +
    [
      process.execPath,
      fileURLToPath(new URL('./cli.js', import.meta.url)),
      command,
      ...args,
    ]
      .map(quote)
      .join(' ')
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
    openCommand: cliCommand('open', [
      '--state',
      state,
      ...(root ? ['--root', root] : []),
    ]),
    ...(management ? { management } : {}),
  });
}
