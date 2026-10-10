import { spawn } from 'node:child_process';
import { requireThat } from './errors.js';

export function execute(
  command,
  { cwd, timeoutMs = 10000, signal, uid, gid, home, maxBytes = 64 * 1024 } = {},
) {
  requireThat(
    typeof command === 'string' && command.trim() && command.length <= 8192,
    'invalid_command',
    'Provide a command up to 8192 characters.',
  );
  requireThat(
    Number.isInteger(timeoutMs) && timeoutMs >= 100 && timeoutMs <= 30000,
    'invalid_timeout',
    'Timeout must be 100–30000 ms.',
  );
  requireThat(!signal?.aborted, 'cancelled', 'Operation was cancelled.');
  return new Promise((resolve, reject) => {
    const child = spawn('/bin/bash', ['--noprofile', '--norc', '-c', command], {
      cwd,
      uid,
      gid,
      detached: true,
      env: {
        PATH: '/usr/local/bin:/usr/bin:/bin',
        LANG: 'C.UTF-8',
        HOME: home || cwd,
        DISPLAY: ':1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '',
      stderr = '',
      bytes = 0,
      reason = null;
    const kill = () => {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        /* already exited */
      }
    };
    const stop = (cause) => {
      reason ||= cause;
      kill();
    };
    const collect = (stream) => (data) => {
      const left = Math.max(0, maxBytes - bytes);
      bytes += data.length;
      if (stream === 'stdout') stdout += data.subarray(0, left).toString();
      else stderr += data.subarray(0, left).toString();
      if (bytes > maxBytes) stop('output_limit');
    };
    child.stdout.on('data', collect('stdout'));
    child.stderr.on('data', collect('stderr'));
    const abort = () => stop('cancelled');
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => stop('timeout'), timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      kill();
    };
    child.once('error', (error) => {
      cleanup();
      reject(error);
    });
    child.once('close', (exitCode, exitSignal) => {
      cleanup();
      resolve({
        stdout,
        stderr,
        exitCode,
        signal: exitSignal,
        stopped: reason,
        truncated: bytes > maxBytes,
      });
    });
  });
}
