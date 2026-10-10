import express from 'express';
import http from 'node:http';
import { Desktop } from './desktop.js';
import fs from 'node:fs/promises';
import {
  timingSafeEqual,
  randomUUID,
  randomBytes,
  createHmac,
} from 'node:crypto';
import { spawn } from 'node:child_process';
import { Store } from './store.js';
import { Lease } from './lease.js';
import { FileService } from './file-service.js';
import { execute } from './process.js';
import { Browser } from './browser.js';
import { Teach } from './teach.js';
import { Fault, requireThat } from './errors.js';
import { tools } from '../src/catalog.js';

const computerId = process.env.COMPUTER_ID;
const expectedHost = `127.0.0.1:${process.env.PUBLIC_PORT || '17670'}`;
const token = process.env.COMPUTER_TOKEN;
const ownerToken = process.env.OWNER_TOKEN;
requireThat(
  /^[0-9a-f-]{36}$/.test(computerId || '') &&
    /^[0-9a-f]{64}$/.test(token || '') &&
    /^[0-9a-f]{64}$/.test(ownerToken || ''),
  'setup_required',
  'Start through computer-mcp setup/start.',
);
const readToken = createHmac('sha256', token)
  .update('computer-mcp:read:v1')
  .digest('hex');
delete process.env.COMPUTER_TOKEN;
delete process.env.OWNER_TOKEN;
const store = new Store('/data/control');
const identity = await store.init(computerId);
const lease = new Lease();
const files = new FileService('/data/workspace');
const teach = new Teach(store, computerId);
const desktop = new Desktop();
const sessions = new Map();
const tickets = new Map();
const cookieName = `computer_ui_${computerId}`;
const browser = new Browser('/data/home', (_page, event) => {
  if (teach.active && lease.status()?.owner === teach.active.owner)
    void teach.append(event);
});
let ready = false;
const bootId = randomUUID();
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'no-referrer');
  res.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' ws://127.0.0.1:*; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  if (
    req.get('host') !== expectedHost &&
    !(req.path === '/health' && req.get('host') === '127.0.0.1:7070') &&
    !(req.path.startsWith('/demo') && req.get('host') === '127.0.0.1:7070')
  )
    return res.status(403).json({ error: 'Host not allowed.' });
  if (req.get('origin') && req.get('origin') !== `http://${expectedHost}`)
    return res.status(403).json({ error: 'Origin not allowed.' });
  next();
});
app.use(express.json({ limit: '400kb' }));
function equal(a, b) {
  if (typeof a !== 'string') return false;
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function human(req) {
  const id = req.headers.cookie
    ?.split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  const session = sessions.get(id);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(id);
    return null;
  }
  session.expiresAt = Date.now() + 12 * 3600000;
  return session.actor;
}
function sameOrigin(req) {
  return req.get('origin') === `http://${expectedHost}`;
}
app.get('/health', (_req, res) =>
  res
    .status(ready ? 200 : 503)
    .json({ ready, computerId, workspaceId: identity.workspaceId, bootId }),
);
// Only the host CLI has owner authority; agent credentials cannot create a UI session.
app.post('/api/owner/ticket', (req, res) => {
  requireThat(
    equal(req.get('authorization'), `Bearer ${ownerToken}`),
    'owner_required',
    'Owner credential required.',
    401,
  );
  for (const [ticket, expiresAt] of tickets)
    if (expiresAt < Date.now()) tickets.delete(ticket);
  requireThat(
    tickets.size < 12,
    'ticket_limit',
    'Try opening the console again shortly.',
    429,
  );
  const ticket = randomBytes(32).toString('hex');
  tickets.set(ticket, Date.now() + 30000);
  res.json({ ticket });
});
app.post('/api/ui/session', (req, res) => {
  requireThat(
    sameOrigin(req) && req.is('application/json'),
    'origin_required',
    'Open the local computer console.',
    403,
  );
  let actor = human(req);
  if (!actor) {
    const ticket = req.body?.ticket;
    const expiresAt =
      typeof ticket === 'string' ? tickets.get(ticket) : undefined;
    if (typeof ticket === 'string') tickets.delete(ticket);
    requireThat(
      expiresAt && expiresAt >= Date.now(),
      'owner_required',
      'Run computer-mcp open to authorize this owner console.',
      401,
    );
    for (const [id, session] of sessions)
      if (session.expiresAt < Date.now()) sessions.delete(id);
    requireThat(
      sessions.size < 100,
      'session_limit',
      'UI session limit reached. Restart the computer.',
      429,
    );
    const id = randomBytes(32).toString('hex');
    actor = `human:${randomUUID()}`;
    sessions.set(id, { actor, expiresAt: Date.now() + 12 * 3600000 });
    res.cookie(cookieName, id, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 12 * 3600000,
    });
  }
  res.json({ actor, identity });
});
app.use('/api', (req, res, next) => {
  if (
    equal(req.get('authorization'), `Bearer ${token}`) ||
    equal(req.get('authorization'), `Bearer ${readToken}`)
  ) {
    const session = req.get('x-session-id');
    requireThat(
      /^[0-9a-f-]{36}$/.test(session || ''),
      'session_required',
      'Valid session identity required.',
      401,
    );
    requireThat(
      req.get('x-computer-id') === computerId,
      'computer_mismatch',
      'Computer identity mismatch.',
      409,
    );
    requireThat(
      req.get('x-workspace-id') === identity.workspaceId ||
        (req.path === '/info' && !req.get('x-workspace-id')),
      'workspace_mismatch',
      'Workspace identity mismatch.',
      409,
    );
    req.actor = `agent:${session}`;
    req.kind = 'agent';
    req.readOnly = equal(req.get('authorization'), `Bearer ${readToken}`);
  } else {
    req.actor = human(req);
    req.kind = 'human';
    requireThat(
      req.actor && (req.method === 'GET' || sameOrigin(req)),
      'unauthorized',
      'Local owner session or computer credential required.',
      401,
    );
  }
  requireThat(ready, 'not_ready', 'Computer is still starting.', 503);
  next();
});
function info() {
  return {
    ...identity,
    bootId,
    guestOS: 'Linux (Debian)',
    adapter: 'docker-linux',
    isolation: 'dedicated-container',
    hostControl: false,
    network: process.env.COMPUTER_NETWORK || 'isolated',
    lease: lease.status(),
    teach: teach.status(),
    capabilities: Object.keys(tools),
    limits: {
      commandMs: 30000,
      outputBytes: 65536,
      fileBytes: 262144,
      directoryEntries: 1000,
      recordingSteps: 200,
      leaseMs: lease.ttl,
    },
    desktop: { width: 1280, height: 800 },
    policy:
      'Local trusted owner console. Terminal has unprivileged guest access. Internet-mode networking also permits access to reachable LAN/host services. Container is not a VM or hostile-code sandbox.',
  };
}
function syncSockets() {
  desktop.sync(lease.status()?.owner);
}

async function screenshot() {
  const file = `/tmp/computer-shot-${randomUUID()}.png`;
  try {
    await new Promise((resolve, reject) => {
      const child = spawn('scrot', ['-z', file], {
        env: { PATH: '/usr/bin:/bin', DISPLAY: ':1' },
        stdio: 'ignore',
      });
      const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('close', (code) => {
        clearTimeout(timer);
        code === 0
          ? resolve()
          : reject(
              new Fault(
                'screenshot_failed',
                'Could not capture the guest desktop.',
              ),
            );
      });
    });
    const data = await fs.readFile(file);
    requireThat(
      data.length <= 3 * 1024 * 1024,
      'screenshot_limit',
      'Screenshot exceeds 3 MiB.',
    );
    return { mimeType: 'image/png', data: data.toString('base64') };
  } finally {
    await fs.unlink(file).catch(() => {});
  }
}
async function call(req, name, args) {
  const tool = tools[name];
  requireThat(tool, 'unknown_tool', 'Unknown tool.', 404);
  const parsed = tool.schema.safeParse(args);
  requireThat(parsed.success, 'invalid_arguments', 'Invalid tool arguments.');
  requireThat(
    !req.readOnly || tool.read,
    'read_only',
    'This connection has read-only access.',
    403,
  );
  const input = parsed.data;
  if (name === 'computer_info') return info();
  if (name === 'control_acquire') {
    const result = lease.claim(req.actor, req.kind);
    syncSockets();
    return result;
  }
  if (name === 'control_renew') return lease.renew(req.actor);
  if (name === 'control_release') {
    requireThat(
      !teach.active || teach.active.owner !== req.actor,
      'teach_active',
      'Save the teaching session before releasing control.',
      409,
    );
    lease.release(req.actor);
    syncSockets();
    return { released: true };
  }
  if (name === 'files_list') return { entries: await files.list(input.path) };
  if (name === 'files_read') return files.read(input.path);
  if (name === 'workflow_list') return { workflows: await store.list() };
  if (name === 'workflow_get') return store.get(input.id);
  if (name === 'browser_snapshot') return browser.snapshot(input.pageId);
  if (name === 'desktop_screenshot') return screenshot();
  return lease.run(
    req.actor,
    async (signal) => {
      if (name === 'browser_action') return browser.action(input, signal);
      if (name === 'files_write') {
        const result = await files.write(input.path, input.text);
        if (req.kind === 'human')
          await teach.append({ type: 'file_write', path: input.path });
        return result;
      }
      if (name === 'terminal_run') {
        const cwd = await files.resolve(input.cwd, { directory: true });
        const result = await execute(input.command, {
          cwd,
          timeoutMs: input.timeoutMs,
          signal,
          uid: 1000,
          gid: 1000,
          home: '/data/home',
        });
        if (req.kind === 'human') await teach.append({ type: 'terminal' });
        return result;
      }
      throw new Fault('unknown_tool', 'Unknown tool.');
    },
    req.get('x-operation-id'),
  );
}
app.post('/api/cancel', (req, res) => {
  requireThat(
    !req.readOnly,
    'read_only',
    'Read-only connections cannot cancel operations.',
    403,
  );
  if (
    lease.active?.owner === req.actor &&
    lease.active.operationId === req.body?.operationId
  )
    lease.active.controller.abort();
  res.json({ cancelled: true });
});
app.get('/api/info', (_req, res) => res.json(info()));
app.post('/api/call', async (req, res) =>
  res.json({ result: await call(req, req.body?.name, req.body?.args) }),
);
app.post('/api/control/take', async (req, res) => {
  requireThat(
    req.kind === 'human',
    'human_only',
    'Only the local owner can take over control.',
    403,
  );
  if (teach.active && teach.active.owner !== req.actor)
    await teach.stop(teach.active.owner, { interrupted: true });
  const pending = lease.active?.done;
  const result = lease.claim(req.actor, 'human', { takeover: true });
  syncSockets();
  if (pending) await pending;
  res.json(result);
});
app.post('/api/teach/start', async (req, res) => {
  requireThat(
    req.kind === 'human',
    'human_only',
    'Teaching is controlled by the local owner.',
    403,
  );
  lease.assert(req.actor);
  const result = await lease.run(req.actor, () =>
    teach.start(req.actor, req.body),
  );
  await teach.append({ type: 'navigate', url: browser.page().url() });
  res.json(result);
});
app.post('/api/teach/stop', async (req, res) => {
  requireThat(
    req.kind === 'human',
    'human_only',
    'Teaching is controlled by the local owner.',
    403,
  );
  lease.assert(req.actor);
  res.json(await lease.run(req.actor, () => teach.stop(req.actor)));
});
app.get('/api/teach', (_req, res) =>
  res.json({ ...teach.status(), steps: teach.active?.steps || [] }),
);
app.get('/api/workflows/:id', async (req, res) =>
  res.json(await store.get(req.params.id)),
);
app.use(
  '/novnc',
  express.static('/opt/computer-mcp/node_modules/@novnc/novnc', {
    dotfiles: 'deny',
  }),
);
app.use('/demo', express.static('/opt/computer-mcp/ui/demo'));
app.use(express.static('/opt/computer-mcp/ui', { dotfiles: 'deny' }));
app.use((error, _req, res, _next) => {
  const known = error instanceof Fault;
  res
    .status(
      known
        ? error.status
        : error.type === 'entity.too.large'
          ? 413
          : error.type === 'entity.parse.failed'
            ? 400
            : 500,
    )
    .json({
      code: known ? error.code : 'operation_failed',
      error: known
        ? error.message
        : 'Operation failed. Inspect the computer before retrying.',
    });
});
const server = http.createServer(app);
server.on('upgrade', (req, socket, head) => {
  const actor = human(req),
    control = req.url === '/desktop/control';
  if (
    !ready ||
    !actor ||
    req.headers.host !== expectedHost ||
    req.headers.origin !== `http://${expectedHost}` ||
    !['/desktop/view', '/desktop/control'].includes(req.url) ||
    (control && lease.status()?.owner !== actor)
  )
    return socket.destroy();
  desktop.upgrade(req, socket, head, { actor, control });
});
server.listen(7070, '0.0.0.0', async () => {
  try {
    // Recovery keeps partial recordings reviewable instead of marking them successful.
    for (const summary of await store.list())
      if (summary.status === 'recording') {
        const workflow = await store.get(summary.id);
        workflow.status = 'interrupted';
        const { instructions } = await import('./teach.js');
        workflow.instructions = instructions(workflow);
        await store.save(workflow);
      }
    await browser.init();
    ready = true;
    process.stderr.write('computer-mcp guest ready\n');
  } catch (error) {
    process.stderr.write(
      'Guest startup failed: ' +
        error.message
          .replaceAll(token, '[redacted]')
          .replaceAll(ownerToken, '[redacted]') +
        '\n',
    );
    process.exit(1);
  }
});
let saving = false;
const tick = setInterval(async () => {
  syncSockets();
  if (saving) return;
  saving = true;
  try {
    if (
      teach.active &&
      (lease.status()?.owner !== teach.active.owner ||
        teach.active.limitReached ||
        Date.now() - Date.parse(teach.active.createdAt) > 10 * 60000)
    )
      await teach.stop(teach.active.owner, { interrupted: true });
    else if (teach.active?.status === 'recording')
      await store.save(teach.active);
  } catch {
    process.stderr.write('Teaching checkpoint failed.\n');
  } finally {
    saving = false;
  }
}, 1000);
async function shutdown() {
  clearInterval(tick);
  lease.revoke();
  syncSockets();
  if (teach.active)
    await teach.stop(teach.active.owner, { interrupted: true }).catch(() => {});
  await browser.context?.close().catch(() => {});
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
