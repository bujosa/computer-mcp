import { spawn } from 'node:child_process';
import { Fault, requireThat } from './errors.js';
import {
  desktopActionSchema,
  desktopInputLimits,
  desktopSize,
} from '../src/desktop-contract.js';

export function runX11(args, options = {}) {
  return runChild('/usr/bin/xdotool', args, options);
}
export function resetGuestInput({ launch } = {}) {
  return runChild(
    '/usr/bin/python3',
    ['-I', '-S', '/opt/computer-mcp/runtime/reset-input.py'],
    { timeoutMs: desktopInputLimits.cleanupMs, launch },
  );
}
function runChild(
  command,
  args,
  {
    text,
    signal,
    timeoutMs = desktopInputLimits.timeoutMs,
    launch = spawn,
  } = {},
) {
  requireThat(
    !signal?.aborted,
    'cancelled',
    'Desktop input was cancelled. Inspect before retrying.',
  );
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = launch(command, args, {
        uid: 1000,
        gid: 1000,
        cwd: '/data/workspace',
        env: {
          PATH: '/usr/bin:/bin',
          HOME: '/data/home',
          DISPLAY: ':1',
          LANG: 'C.UTF-8',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      reject(
        new Fault('desktop_unavailable', 'Guest desktop input is unavailable.'),
      );
      return;
    }
    let settled = false,
      bytes = 0,
      failure;
    const stop = (code) => {
      failure ||= code;
      if (!settled) child.kill('SIGKILL');
    };
    const abort = () => stop('cancelled');
    const timer = setTimeout(() => stop('desktop_timeout'), timeoutMs);
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      error ? reject(error) : resolve();
    };
    const collect = (data) => {
      bytes += data.length;
      if (bytes > desktopInputLimits.outputBytes) stop('output_limit');
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.stdin.on('error', () => stop('desktop_input_failed'));
    child.once('error', () =>
      finish(
        new Fault('desktop_unavailable', 'Guest desktop input is unavailable.'),
      ),
    );
    child.once('close', (code) =>
      finish(
        failure || code !== 0
          ? new Fault(
              failure || 'desktop_input_failed',
              'Guest desktop input did not complete. Inspect the screen before retrying.',
            )
          : undefined,
      ),
    );
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    child.stdin.end(failure ? undefined : text);
  });
}

export class DesktopInput {
  constructor({
    run = runX11,
    cleanup = resetGuestInput,
    onFailure = () => {},
  } = {}) {
    this.run = run;
    this.cleanup = cleanup;
    this.onFailure = onFailure;
    this.healthy = true;
  }
  async perform(input, signal) {
    requireThat(
      this.healthy,
      'desktop_unavailable',
      'Restart this owned computer after desktop input cleanup failed.',
      503,
    );
    const parsed = desktopActionSchema.safeParse(input);
    requireThat(parsed.success, 'invalid_arguments', 'Invalid desktop action.');
    requireThat(!signal?.aborted, 'cancelled', 'Desktop input was cancelled.');
    input = parsed.data;
    // X11 orders commands on this connection. Avoid --sync: older xdotool
    // builds can wait for a move event when the pointer is already at x/y.
    const move = ['mousemove', String(input.x), String(input.y)];
    const buttons = { left: 1, middle: 2, right: 3 };
    let args;
    if (input.action === 'move') args = move;
    if (input.action === 'click')
      args = [
        ...move,
        'click',
        '--clearmodifiers',
        '--repeat',
        String(input.clicks),
        '--delay',
        '80',
        String(buttons[input.button]),
      ];
    if (input.action === 'scroll')
      args = [
        ...move,
        'click',
        '--clearmodifiers',
        '--repeat',
        String(input.steps),
        '--delay',
        '20',
        String({ up: 4, down: 5, left: 6, right: 7 }[input.direction]),
      ];
    if (input.action === 'type')
      args = ['type', '--clearmodifiers', '--delay', '1', '--file', '-'];
    if (input.action === 'key')
      args = [
        'key',
        '--clearmodifiers',
        '--delay',
        '0',
        input.key
          .replace(/Ctrl/g, 'ctrl')
          .replace(/Alt/g, 'alt')
          .replace(/Shift/g, 'shift')
          .replace(/Super/g, 'super'),
      ];
    let failure;
    try {
      await this.run(args, {
        text: input.action === 'type' ? input.text : undefined,
        signal,
      });
    } catch (error) {
      failure = error;
    }
    // Cleanup has its own small deadline and is not aborted by the old lease.
    // It finishes before lease.run lets another mutation start.
    try {
      await this.cleanup();
    } catch {
      this.healthy = false;
      this.onFailure();
      failure ||= new Fault(
        'desktop_reset_failed',
        'Guest input cleanup failed. Restart this owned computer before further work.',
        503,
      );
    }
    if (failure) throw failure;
    return { inputSent: true, action: input.action, desktop: desktopSize };
  }
}
