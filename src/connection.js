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
  throw new Error('Choose generic or codex configuration.');
}
export function ownerConnection(state, config) {
  const work = connectionEntry(state);
  const quote = (value) =>
    process.platform === 'win32'
      ? `'${value.replaceAll("'", "''")}'`
      : `'${value.replaceAll("'", "'\\''")}'`;
  return connectionSchema.parse({
    computerName: config.name,
    work,
    read: connectionEntry(state, 'read'),
    openCommand:
      (process.platform === 'win32' ? '& ' : '') +
      [work.command, work.args[0], 'open', '--state', state]
        .map(quote)
        .join(' '),
  });
}
