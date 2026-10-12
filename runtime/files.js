import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Fault, requireThat } from './errors.js';

export const MAX_FILE = 256 * 1024;
export class Files {
  constructor(root, { uid, gid } = {}) {
    this.root = path.resolve(root);
    this.uid = uid;
    this.gid = gid;
  }
  async resolve(input = '.', { create = false, directory = false } = {}) {
    this.root = await fs.realpath(this.root);
    requireThat(
      typeof input === 'string' &&
        input.length <= 1024 &&
        !/[\x00-\x1f\\]/.test(input) &&
        !path.isAbsolute(input),
      'invalid_path',
      'Use a relative workspace path.',
    );
    const parts = input.split('/').filter((p) => p && p !== '.');
    requireThat(
      !parts.includes('..'),
      'path_escape',
      'Parent traversal is not allowed.',
    );
    let target = this.root;
    for (let i = 0; i < parts.length; i++) {
      target = path.join(target, parts[i]);
      let stat;
      try {
        stat = await fs.lstat(target);
      } catch (error) {
        if (create && i === parts.length - 1 && error.code === 'ENOENT')
          return target;
        throw error;
      }
      requireThat(
        !stat.isSymbolicLink(),
        'symlink_denied',
        'Symlinks are not accessible through the files API.',
      );
      if (i < parts.length - 1 || directory)
        requireThat(
          stat.isDirectory(),
          'not_directory',
          'Expected a directory.',
        );
    }
    const real = await fs.realpath(target);
    requireThat(
      real === this.root || real.startsWith(this.root + path.sep),
      'path_escape',
      'Path is outside the workspace.',
    );
    return target;
  }
  async list(input = '.') {
    const target = await this.resolve(input, { directory: true });
    const entries = await fs.readdir(target, { withFileTypes: true });
    requireThat(
      entries.length <= 1000,
      'directory_limit',
      'Directory exceeds the 1000-entry limit.',
    );
    return entries
      .map((e) => ({
        name: e.name,
        type: e.isSymbolicLink()
          ? 'blocked-symlink'
          : e.isDirectory()
            ? 'directory'
            : e.isFile()
              ? 'file'
              : 'blocked-special',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  async read(input) {
    const target = await this.resolve(input);
    const file = await fs.open(
      target,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      const stat = await file.stat();
      requireThat(
        stat.isFile() && stat.size <= MAX_FILE,
        'file_limit',
        'Read a regular UTF-8 file no larger than 256 KiB.',
      );
      const buffer = Buffer.alloc(MAX_FILE + 1);
      const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
      requireThat(
        bytesRead <= MAX_FILE,
        'file_limit',
        'File grew beyond the read limit.',
      );
      return {
        path: input,
        text: buffer.subarray(0, bytesRead).toString('utf8'),
      };
    } finally {
      await file.close();
    }
  }
  async write(input, text) {
    requireThat(
      typeof text === 'string' && Buffer.byteLength(text) <= MAX_FILE,
      'file_limit',
      'Write UTF-8 text no larger than 256 KiB.',
    );
    const target = await this.resolve(input, { create: true });
    requireThat(target !== this.root, 'invalid_path', 'Choose a file path.');
    // Check write access without truncating or creating the destination.
    const existing = await this.writable(target);
    const staging = path.join(
      path.dirname(target),
      `.computer-mcp-write-${randomUUID()}.tmp`,
    );
    let file,
      created = false;
    try {
      file = await fs.open(
        staging,
        constants.O_WRONLY |
          constants.O_CREAT |
          constants.O_EXCL |
          constants.O_NOFOLLOW,
        0o600,
      );
      created = true;
      await file.writeFile(text);
      if (this.uid !== undefined) await file.chown(this.uid, this.gid);
      else if (existing && process.platform !== 'win32')
        await file.chown(existing.uid, existing.gid);
      if (existing) await file.chmod(existing.mode & 0o777);
      await file.sync();
      await file.close();
      file = undefined;
      await this.resolve(input, { create: true });
      const current = await this.writable(target);
      requireThat(
        existing
          ? current &&
              ['dev', 'ino', 'size', 'mtimeMs', 'ctimeMs'].every(
                (key) => current[key] === existing[key],
              )
          : !current,
        'file_changed',
        'File changed while preparing the write. Read it before trying again.',
        409,
      );
      await fs.rename(staging, target);
      created = false;
    } catch (error) {
      if (['ENOSPC', 'EDQUOT'].includes(error.code))
        throw new Fault(
          'storage_full',
          'Computer storage is full. Inspect capacity before trying again; the destination was not replaced.',
          507,
        );
      throw error;
    } finally {
      await file?.close();
      if (created) await fs.unlink(staging);
    }
    return { path: input, bytes: Buffer.byteLength(text) };
  }
  async writable(target) {
    let file;
    try {
      file = await fs.open(
        target,
        constants.O_WRONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
      );
      const stat = await file.stat();
      requireThat(
        stat.isFile() && stat.nlink === 1,
        'invalid_file',
        'Write only a regular file with one link.',
      );
      return stat;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    } finally {
      await file?.close();
    }
  }
}
