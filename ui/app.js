import RFB from '/vendor/rfb.js';
const $ = (id) => document.getElementById(id);
let actor,
  info,
  view = 'desktop',
  rfb,
  mode,
  locked = false,
  busy = false;
function notice(text, error = false) {
  $('notice').textContent = text;
  $('notice').classList.toggle('error', error);
}
async function request(path, body) {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}
async function call(name, args = {}) {
  return (await request('/api/call', { name, args })).result;
}
const own = () => info?.lease?.owner === actor;
function guarded(fn) {
  return async (event) => {
    event?.preventDefault();
    if (busy) return;
    busy = true;
    notice('');
    try {
      await fn(event);
    } catch (error) {
      notice(error.message, true);
    } finally {
      busy = false;
      await refresh().catch(() => {});
    }
  };
}
function stream() {
  const next = own() ? 'control' : 'view';
  if (view !== 'desktop') {
    rfb?.disconnect();
    rfb = null;
    mode = null;
    return;
  }
  if (rfb && mode === next) return;
  rfb?.disconnect();
  mode = next;
  $('screen-status').textContent = 'Connecting to the desktop…';
  const connection = new RFB(
    $('screen'),
    `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/desktop/${next}`,
  );
  rfb = connection;
  rfb.scaleViewport = true;
  rfb.resizeSession = false;
  rfb.viewOnly = next === 'view';
  rfb.addEventListener('connect', () => {
    if (rfb !== connection) return;
    $('screen-status').textContent =
      next === 'control' ? 'You’re in control' : 'Live view · read only';
  });
  rfb.addEventListener('disconnect', () => {
    if (rfb !== connection) return;
    $('screen-status').textContent =
      'Desktop disconnected · switch views to reconnect';
  });
}
async function refresh() {
  info = await request('/api/info');
  if ($('connection').textContent !== '● Computer online') notice('');
  $('connection').textContent = '● Computer online';
  $('identity').textContent =
    `Computer ${info.computerId.slice(0, 8)} · Workspace ${info.workspaceId.slice(0, 8)}`;
  $('owner').textContent = own()
    ? 'You’re in control'
    : info.lease
      ? info.lease.kind === 'agent'
        ? 'Agent is in control'
        : 'Another owner is in control'
      : 'Ready · no session in control';
  $('take').disabled = own();
  $('release').disabled = !own() || info.teach.active;
  $('run').disabled = !own() || busy;
  $('file-save').disabled = !own() || busy;
  $('demo').disabled = !own() || busy;
  $('teach-start').disabled = !own() || info.teach.active;
  $('teach-stop').hidden = !info.teach.active;
  $('teach-stop').disabled = !own();
  $('teach-form').hidden = info.teach.active;
  $('record-dot').hidden = !info.teach.active;
  $('desktop-mode').textContent = own()
    ? 'Control enabled · your actions are visible to the agent'
    : 'Live view · take control to interact';
  stream();
  if (view === 'teach') {
    const recording = await request('/api/teach');
    $('teach-status').textContent = recording.active
      ? `Recording “${recording.name}” · ${recording.stepCount} steps${recording.limitReached ? ' · step limit reached' : ''}`
      : 'Ready when you are.';
    $('steps').replaceChildren(
      ...recording.steps.map((s) => {
        const li = document.createElement('li');
        li.textContent = `${s.type} ${s.selector || s.url || s.path || ''}`;
        return li;
      }),
    );
    await workflows();
  }
}
async function browse() {
  const data = await call('files_list', { path: $('directory').value });
  $('entries').replaceChildren();
  if (!data.entries.length) {
    const p = document.createElement('p');
    p.textContent = 'This folder is empty.';
    $('entries').append(p);
  }
  for (const entry of data.entries) {
    const button = document.createElement('button');
    button.textContent = `${entry.type === 'directory' ? '▸' : '·'} ${entry.name}`;
    button.disabled = entry.type.startsWith('blocked');
    button.onclick = guarded(async () => {
      const base = $('directory').value.replace(/\/$/, '');
      const path = base === '.' ? entry.name : `${base}/${entry.name}`;
      if (entry.type === 'directory') {
        $('directory').value = path;
        await browse();
      } else {
        $('file-path').value = path;
        $('file-text').value = (await call('files_read', { path })).text;
      }
    });
    $('entries').append(button);
  }
}
async function workflows() {
  const data = await call('workflow_list');
  $('workflows').replaceChildren();
  if (!data.workflows.length) {
    const p = document.createElement('p');
    p.className = 'caption';
    p.textContent = 'Your first recording will appear here.';
    $('workflows').append(p);
  }
  for (const workflow of data.workflows) {
    const button = document.createElement('button');
    button.textContent = `${workflow.name} · ${workflow.stepCount} steps · ${workflow.status}`;
    button.onclick = guarded(async () => {
      const value = await call('workflow_get', { id: workflow.id });
      $('workflow-text').textContent = value.instructions;
      $('workflow-text').hidden = false;
    });
    $('workflows').append(button);
  }
}
for (const tab of document.querySelectorAll('.tab'))
  tab.onclick = guarded(async () => {
    view = tab.dataset.view;
    for (const el of document.querySelectorAll('.view'))
      el.hidden = el.id !== view;
    for (const item of document.querySelectorAll('.tab')) {
      item.classList.toggle('active', item === tab);
      if (item === tab) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    }
    stream();
    if (view === 'files') await browse();
  });
$('take').onclick = guarded(async () => {
  await request('/api/control/take', {});
  notice('You have control. Agent mutations are paused until you release it.');
});
$('release').onclick = guarded(async () => {
  await call('control_release');
  notice('Control released. The agent can acquire its own lease.');
});
$('demo').onclick = guarded(async () => {
  await call('browser_action', {
    action: 'navigate',
    url: 'http://127.0.0.1:7070/demo',
  });
  notice('Teaching sandbox opened in the guest browser.');
});
$('browse-form').onsubmit = guarded(browse);
$('file-read').onclick = guarded(async () => {
  $('file-text').value = (
    await call('files_read', { path: $('file-path').value })
  ).text;
  notice('File loaded.');
});
$('file-form').onsubmit = guarded(async () => {
  await call('files_write', {
    path: $('file-path').value,
    text: $('file-text').value,
  });
  notice('File saved in the guest workspace.');
  await browse();
});
$('terminal-form').onsubmit = guarded(async () => {
  $('terminal-output').textContent = 'Running…';
  const result = await call('terminal_run', {
    command: $('command').value,
    cwd: $('cwd').value,
    timeoutMs: Number($('timeout').value) * 1000,
  });
  $('terminal-output').textContent =
    `${result.stdout}${result.stderr}\n[exit ${result.exitCode ?? result.signal}${result.stopped ? ` · ${result.stopped}` : ''}]`;
});
$('teach-form').onsubmit = guarded(async () => {
  await request('/api/teach/start', {
    name: $('teach-name').value,
    goal: $('teach-goal').value,
  });
  notice(
    'Recording started. Use the Desktop view, then return here to save. Values are omitted.',
  );
});
$('teach-stop').onclick = guarded(async () => {
  const workflow = await request('/api/teach/stop', {});
  $('workflow-text').textContent = workflow.instructions;
  $('workflow-text').hidden = false;
  notice('Workflow saved. Connected agents can read it through MCP.');
});
async function connect() {
  if (locked) return;
  try {
    if (!actor) {
      const session = await request('/api/ui/session', {
        ticket: window.__computerUITicket,
      });
      actor = session.actor;
      delete window.__computerUITicket;
    }
    await refresh();
  } catch (error) {
    if (error.status === 401) {
      actor = undefined;
      info = undefined;
      locked = true;
      rfb?.disconnect();
      rfb = null;
      mode = null;
      $('owner').textContent = 'Authorize to connect';
      $('screen-status').textContent = 'Open this console from the CLI';
      for (const id of [
        'release',
        'run',
        'file-save',
        'demo',
        'teach-start',
        'teach-stop',
      ])
        $(id).disabled = true;
    }
    $('connection').textContent =
      error.status === 401 ? 'Owner access required' : 'Offline';
    $('take').disabled = true;
    notice(error.message, true);
  }
}
await connect();
setInterval(() => {
  void connect();
}, 4000);
setInterval(() => {
  if (own()) void call('control_renew').catch(() => {});
}, 20000);
