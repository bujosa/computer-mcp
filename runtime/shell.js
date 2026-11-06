import { execFile, execFileSync } from 'node:child_process';
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';

// Desktop apps beyond the browser (Files, Terminal) are owner tools. A guest
// terminal would let an agent run commands outside terminal_run's limits and
// Activity records, so the runtime publishes who holds control in a root-owned
// file the dock launchers read, and closes those apps when an agent gets it.
export const ownerApps = ['thunar', 'xfce4-terminal'];
export const shellState = '/run/computer-mcp/desktop-apps';

export function desktopAppsMode(current) {
  if (!current) return 'free';
  return current.kind === 'human' ? 'owner' : 'agent';
}

let sweep;

export function publishDesktopApps(
  current,
  { file = shellState, kill = closeOwnerApps, interval = 1000 } = {},
) {
  const mode = desktopAppsMode(current);
  // Close first: an agent must never find an owner terminal on screen. While
  // the agent holds control, keep closing them: terminal_run could otherwise
  // start the GUI terminal binary directly and bypass the dock launcher.
  clearInterval(sweep);
  sweep = undefined;
  if (mode === 'agent') {
    kill();
    sweep = setInterval(() => kill({ sync: false }), interval);
    sweep.unref?.();
  }
  try {
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, `${mode}\n`, { mode: 0o644 });
    renameSync(tmp, file);
    return mode;
  } catch {
    // Fail closed: launchers treat a missing file as "not the owner".
    rmSync(file, { force: true });
    return 'unknown';
  }
}

export function closeOwnerApps({ sync = true } = {}) {
  for (const name of ownerApps) {
    const args = ['-KILL', '-u', '1000', '-x', name];
    if (!sync) {
      execFile('pkill', args, { timeout: 2000 }, () => {});
      continue;
    }
    try {
      execFileSync('pkill', args, { stdio: 'ignore', timeout: 2000 });
    } catch {
      /* exit 1: nothing to close */
    }
  }
}

export function stopDesktopApps() {
  clearInterval(sweep);
  sweep = undefined;
}

export function initDesktopApps(file = shellState) {
  try {
    mkdirSync(file.slice(0, file.lastIndexOf('/')), {
      recursive: true,
      mode: 0o755,
    });
    publishDesktopApps(null, { file, kill: closeOwnerApps });
    return true;
  } catch {
    return false;
  }
}
