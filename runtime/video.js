import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { requireThat } from './errors.js';

export const videoLimits = {
  durationMs: 5 * 60000,
  bytes: 20 * 1024 * 1024,
  storageBytes: 200 * 1024 * 1024,
  fps: 8,
};

// The unprivileged encoder sees only Xvfb. Its stdout goes to root-private
// storage; neither a host path nor a recording filename is accepted from input.
export class Video {
  constructor(
    root,
    { launch = spawn, limits = videoLimits, identity = {} } = {},
  ) {
    this.root = root;
    this.launch = launch;
    this.limits = limits;
    this.active = null;
    this.identity = identity;
  }
  file(id) {
    requireThat(
      typeof id === 'string' && /^[0-9a-f-]{36}$/.test(id),
      'invalid_workflow',
      'Invalid recording identity.',
    );
    return path.join(this.root, `${id}.webm`);
  }
  async start(id, signal) {
    requireThat(
      !this.active && !this.starting,
      'video_busy',
      'A video is already recording.',
      409,
    );
    this.starting = true;
    try {
      return await this.begin(id, signal);
    } finally {
      this.starting = false;
    }
  }
  async begin(id, signal) {
    requireThat(
      !signal?.aborted,
      'cancelled',
      'Recording startup was cancelled.',
    );
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    let used = 0;
    for (const name of await fs.readdir(this.root)) {
      const stat = await fs.lstat(path.join(this.root, name));
      requireThat(
        stat.isFile() && !stat.isSymbolicLink(),
        'video_storage',
        'Inspect the private video storage.',
      );
      used += stat.size;
    }
    requireThat(
      used + this.limits.bytes <= this.limits.storageBytes,
      'video_quota',
      'Video storage is full. Delete an unneeded video in Skills or record steps only.',
      409,
    );
    requireThat(
      !signal?.aborted,
      'cancelled',
      'Recording startup was cancelled.',
    );
    const file = await fs.open(this.file(id), 'wx', 0o600);
    if (signal?.aborted) {
      await file.close();
      await fs.unlink(this.file(id));
      requireThat(false, 'cancelled', 'Recording startup was cancelled.');
    }
    const started = Date.now();
    const metadata = {
      ...this.identity,
      recordingId: id,
      status: 'recording',
      startedAt: new Date(started).toISOString(),
      bytes: 0,
      frames: 0,
      fps: this.limits.fps,
      audio: false,
    };
    let child;
    try {
      child = this.launch(
        'ffmpeg',
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-progress',
          'pipe:2',
          '-stats_period',
          '0.25',
          '-f',
          'x11grab',
          '-framerate',
          String(this.limits.fps),
          '-video_size',
          '1280x800',
          '-i',
          ':1',
          '-an',
          '-vf',
          'scale=960:600',
          '-c:v',
          'libvpx',
          '-deadline',
          'realtime',
          '-cpu-used',
          '5',
          '-threads',
          '1',
          '-b:v',
          '400k',
          '-g',
          '16',
          '-t',
          String(this.limits.durationMs / 1000),
          '-f',
          'webm',
          'pipe:1',
        ],
        {
          uid: 1000,
          gid: 1000,
          env: {
            PATH: '/usr/bin:/bin',
            DISPLAY: ':1',
            HOME: '/data/home',
            LANG: 'C.UTF-8',
          },
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );
    } catch (error) {
      await file.close();
      await fs.unlink(this.file(id));
      throw error;
    }
    let reason = null;
    let write = Promise.resolve();
    let firstFrame;
    const first = new Promise((resolve) => {
      firstFrame = resolve;
    });
    let timer;
    let stopping = false;
    const stop = (cause) => {
      reason ||= cause;
      if (stopping) return;
      stopping = true;
      child.kill('SIGINT');
      active.killTimer = setTimeout(() => {
        reason = 'forced';
        child.kill('SIGKILL');
      }, 2000);
    };
    child.stdin.on('error', () => {});
    const active = { id, metadata, stop };
    this.active = active;
    const abort = () => stop('interrupted');
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    let progress = '';
    child.stderr.on('data', (chunk) => {
      progress = (progress + chunk.toString()).slice(-4096);
      for (const match of progress.matchAll(/(?:^|\n)frame=(\d+)\n/g))
        metadata.frames = Math.max(metadata.frames, Number(match[1]));
      if (metadata.frames > 0) firstFrame(true);
    });
    child.stdout.on('data', (chunk) => {
      if (metadata.bytes + chunk.length > this.limits.bytes) {
        stop('size_limit');
        return;
      }
      metadata.bytes += chunk.length;
      write = write
        .then(async () => {
          let offset = 0;
          while (offset < chunk.length) {
            const { bytesWritten } = await file.write(chunk.subarray(offset));
            requireThat(
              bytesWritten > 0,
              'video_storage',
              'Video storage stopped accepting data.',
            );
            offset += bytesWritten;
          }
        })
        .catch(() => {
          stop('storage_error');
        });
    });
    let error = false;
    child.once('error', () => {
      error = true;
      firstFrame(false);
    });
    active.done = new Promise((resolve) => {
      child.once('close', async (code) => {
        clearTimeout(timer);
        clearTimeout(active.killTimer);
        await write;
        await file.close().catch(() => {
          error = true;
        });
        metadata.status =
          !error &&
          metadata.bytes > 0 &&
          metadata.frames > 0 &&
          (code === 0 || code === 255) &&
          !['size_limit', 'storage_error', 'forced'].includes(reason)
            ? 'ready'
            : 'failed';
        metadata.durationMs = Date.now() - started;
        metadata.reason =
          reason ||
          (metadata.durationMs >= this.limits.durationMs
            ? 'duration_limit'
            : 'encoder_exit');
        if (this.active === active) this.active = null;
        firstFrame(false);
        resolve(structuredClone(metadata));
      });
    });
    timer = setTimeout(
      () => stop('duration_limit'),
      this.limits.durationMs + 1000,
    );
    const startup = setTimeout(() => {
      stop('startup_timeout');
      firstFrame(false);
    }, 5000);
    const available = await first;
    clearTimeout(startup);
    signal?.removeEventListener('abort', abort);
    if (!available || signal?.aborted) {
      await this.stop(id, 'startup_timeout');
      await fs.unlink(this.file(id)).catch(() => {});
      requireThat(
        false,
        'video_failed',
        'Video could not start. Try recording steps only.',
        503,
      );
    }
    return metadata;
  }
  async stop(id, reason = 'saved') {
    const active = this.active;
    if (!active || active.id !== id) return null;
    active.stop(reason);
    return active.done;
  }
  async remove(id) {
    requireThat(
      this.active?.id !== id,
      'video_busy',
      'Save the recording first.',
      409,
    );
    await fs.unlink(this.file(id));
  }
}
