// Trusted-host private grant files. This module never reads owner configuration.
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import * as z from 'zod';
import { connectionLabelSchema } from './operations-contract.js';

export const assignedConnectionSchema = z.strictObject({
  version: z.literal(1),
  kind: z.literal('named-connection'),
  name: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
  computerId: z.uuid(),
  workspaceId: z.uuid(),
  connectionId: z.uuid(),
  label: connectionLabelSchema,
  port: z.number().int().min(1024).max(65535),
  access: z.enum(['read', 'work']),
  token: z.string().regex(/^[0-9a-f]{64}$/),
});

function absoluteFile(file) {
  if (
    typeof file !== 'string' ||
    !path.isAbsolute(file) ||
    file.length > 4096 ||
    /[\0\r\n]/.test(file)
  )
    throw new Error('Use --connection with an absolute private file path.');
  return file;
}

export async function readAssignedConnection(file) {
  absoluteFile(file);
  let handle;
  try {
    if ((await fs.lstat(file)).isSymbolicLink()) throw new Error();
    handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = await handle.stat();
    if (
      !stat.isFile() ||
      stat.size > 16384 ||
      (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)
    )
      throw new Error();
    const parsed = assignedConnectionSchema.safeParse(
      JSON.parse(await handle.readFile('utf8')),
    );
    if (!parsed.success) throw new Error();
    return parsed.data;
  } catch {
    // Parser and filesystem errors can contain private data or uncontrolled text.
    throw new Error(
      'Cannot read a valid private named connection file. Inspect its format and permissions (0600).',
    );
  } finally {
    await handle?.close();
  }
}

export function assignedConnectionDirectory(root, computerId) {
  if (!path.isAbsolute(root) || !z.uuid().safeParse(computerId).success)
    throw new Error('Invalid connection directory or computer identity.');
  const directory = path.join(root, 'connections', computerId);
  absoluteFile(
    path.join(directory, '00000000-0000-4000-8000-000000000000.json'),
  );
  return directory;
}

async function privateDirectory(directory) {
  try {
    await fs.mkdir(directory, { mode: 0o700 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  const stat = await fs.lstat(directory);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)
  )
    throw new Error(
      'Connection directories must be private directories (0700).',
    );
  await fs.access(directory, constants.W_OK | constants.X_OK);
}

export async function prepareConnectionDirectory(root, computerId) {
  const directory = assignedConnectionDirectory(root, computerId);
  // Root belongs to the host catalog; only our new credential directories are
  // required to be private, and existing directories are never chmodded silently.
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  await privateDirectory(path.join(root, 'connections'));
  await privateDirectory(directory);
  return directory;
}

async function syncDirectory(directory) {
  // Node/Windows does not expose a portable directory fsync. The file itself is
  // always synced, and exclusive link publication still prevents replacement.
  if (process.platform === 'win32') return;
  const handle = await fs.open(directory, constants.O_RDONLY);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function persistAssignedConnection(root, connection) {
  const parsed = assignedConnectionSchema.safeParse(connection);
  if (!parsed.success) throw new Error('Invalid named connection response.');
  const directory = await prepareConnectionDirectory(
    root,
    connection.computerId,
  );
  const file = path.join(directory, `${connection.connectionId}.json`);
  const temporary = path.join(directory, `.${randomUUID()}.tmp`);
  let handle;
  let published = false;
  try {
    handle = await fs.open(temporary, 'wx', 0o600);
    await handle.writeFile(JSON.stringify(parsed.data, null, 2) + '\n');
    await handle.sync();
    await handle.close();
    handle = undefined;
    // rename() can overwrite an existing grant. An exclusive hard link gives
    // atomic publication of the synced inode and fails if the target exists.
    await fs.link(temporary, file);
    published = true;
    await fs.unlink(temporary);
    await syncDirectory(directory);
    return file;
  } catch {
    if (published) await fs.unlink(file).catch(() => {});
    throw new Error('Could not save the private named connection file.');
  } finally {
    await handle?.close();
    await fs.unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT')
        throw new Error(
          'Could not clean up a private connection temporary file.',
        );
    });
  }
}

export function namedConnectionKey(connection) {
  const parsed = assignedConnectionSchema.safeParse(connection);
  if (!parsed.success)
    throw new Error('Invalid named connection configuration.');
  return `computer-${connection.name.slice(0, 8)}-${connection.connectionId.replaceAll('-', '').slice(0, 12)}`;
}
