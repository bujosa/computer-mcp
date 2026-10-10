import RFB from '/vendor/rfb.js';
const $ = (id) => document.getElementById(id);
const pages = {
  desktop: [
    'Computer',
    'YOUR AGENT’S OWN COMPUTER',
    'A shared screen. A dedicated space.',
    'Let your agent work. Step in whenever you need to.',
  ],
  files: [
    'Files',
    'EVERYTHING IN ITS PLACE',
    'Your workspace, within reach.',
    'Read, edit and save files in this computer.',
  ],
  terminal: [
    'Terminal',
    'A DIRECT LINE TO YOUR COMPUTER',
    'A little command goes a long way.',
    'Run focused commands and inspect what happened.',
  ],
  teach: [
    'Skills',
    'SHOW IT ONCE. USE IT AGAIN.',
    'Teach the way you work.',
    'Turn a task you demonstrate into instructions your agent can use.',
  ],
  connect: [
    'Connect agent',
    'TOOLS FOR YOUR AGENT',
    'Your computer. Connected.',
    'Bring the agent you already use. Give it a place to work.',
  ],
};
let actor, info, ownerConfig, selectedSkill, exportedSkill, rfb, mode;
let view = 'desktop',
  locked = false,
  busy = false,
  refreshing = false;
let library = [],
  libraryKey = '';
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
const own = () => !!actor && info?.lease?.owner === actor;
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
  if (view !== 'desktop' || !info) {
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
    if (rfb === connection)
      $('screen-status').textContent =
        next === 'control' ? 'You’re in control' : 'Live view · view only';
  });
  rfb.addEventListener('disconnect', () => {
    if (rfb !== connection) return;
    $('screen-status').textContent = 'Desktop disconnected · reconnecting…';
    rfb = null;
    mode = null;
  });
}
async function showView(next) {
  view = next;
  for (const el of document.querySelectorAll('.view'))
    el.hidden = el.id !== view;
  for (const tab of document.querySelectorAll('.tab')) {
    const active = tab.dataset.view === view;
    tab.classList.toggle('active', active);
    if (active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  const [label, eyebrow, title, description] = pages[view];
  $('breadcrumb').textContent = label;
  $('page-eyebrow').textContent = eyebrow;
  $('page-title').textContent = title;
  $('page-description').textContent = description;
  stream();
  if (info && view === 'files') await browse();
  if (info && view === 'teach') await recording();
}
function mutationState() {
  for (const id of ['run', 'file-save', 'demo', 'teach-start', 'teach-stop'])
    $(id).disabled = !own() || busy;
  for (const id of ['file-read', 'browse']) $(id).disabled = !info || busy;
  $('agent-copy').disabled = !ownerConfig || !info;
  $('take').disabled = !info || own() || busy;
  $('release').disabled = !own() || busy || !!info?.teach.active;
  $('teach-start').disabled ||= !!info?.teach.active;
}
async function refresh() {
  if (!actor || refreshing) return;
  refreshing = true;
  try {
    info = await request('/api/info');
    $('connection').textContent = 'Computer online';
    $('connection').classList.add('online');
    $('access-state').hidden = true;
    $('identity').textContent =
      `Computer ${info.computerId.slice(0, 8)} · Workspace ${info.workspaceId.slice(0, 8)}`;
    $('owner').textContent = own()
      ? 'You’re in control'
      : info.lease
        ? info.lease.kind === 'agent'
          ? 'Agent is in control'
          : 'Another owner is in control'
        : 'Ready to work';
    mutationState();
    const active = info.teach.active;
    $('teach-stop').hidden = !active;
    $('teach-form').hidden = active;
    $('record-dot').hidden = !active;
    $('record-banner').hidden = !active;
    $('record-summary').textContent = active
      ? `Recording · ${info.teach.stepCount} ${info.teach.stepCount === 1 ? 'step' : 'steps'} captured`
      : '';
    $('close-builder').hidden = active;
    if (active) $('teach-builder').hidden = false;
    $('desktop-mode').textContent = own()
      ? 'Control enabled · your agent can follow along'
      : 'View only · take control to interact';
    stream();
    if (view === 'teach') await recording();
  } finally {
    refreshing = false;
  }
}
async function recording() {
  const data = await request('/api/teach');
  $('teach-status').textContent = data.active
    ? `Recording “${data.name}” · ${data.stepCount} ${data.stepCount === 1 ? 'step' : 'steps'}${data.limitReached ? ' · limit reached, save this recording' : ''}`
    : own()
      ? 'Ready to record. Start, then show the task on the live desktop.'
      : 'Take control before starting a recording.';
  const key = JSON.stringify(data.steps);
  if ($('steps').dataset.key !== key) {
    $('steps').dataset.key = key;
    $('steps').replaceChildren(
      ...data.steps.map((s) => {
        const li = document.createElement('li');
        li.textContent = `${s.type} ${s.selector || s.url || s.path || ''}`;
        return li;
      }),
    );
  }
  library = (await call('workflow_list')).workflows.sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  renderLibrary();
}
function renderLibrary() {
  const search = $('skill-search').value.trim().toLowerCase();
  const filtered = library.filter((item) =>
    item.name.toLowerCase().includes(search),
  );
  const key = JSON.stringify([filtered, selectedSkill?.id]);
  if (libraryKey === key) return;
  libraryKey = key;
  const children = filtered.map((item) => {
    const button = document.createElement('button');
    button.className = 'workflow-card';
    button.classList.toggle('selected', item.id === selectedSkill?.id);
    const title = document.createElement('strong');
    title.textContent = item.name;
    const meta = document.createElement('span');
    meta.textContent = `${item.stepCount} ${item.stepCount === 1 ? 'step' : 'steps'} · ${item.status === 'ready' ? 'Ready to review' : 'Interrupted'}`;
    button.append(title, meta);
    button.onclick = guarded(() => selectSkill(item.id));
    return button;
  });
  if (!children.length) {
    const p = document.createElement('p');
    p.className = 'caption';
    p.textContent = search
      ? 'No skills match your search.'
      : 'Your first taught skill will appear here. Start with a small task.';
    children.push(p);
  }
  $('workflows').replaceChildren(...children);
}
async function selectSkill(id) {
  selectedSkill = await call('workflow_get', { id });
  exportedSkill = null;
  const ready = selectedSkill.status === 'ready';
  $('skill-empty').hidden = true;
  $('skill-selected').hidden = false;
  $('skill-title').textContent = selectedSkill.name;
  $('skill-goal').textContent = selectedSkill.goal;
  $('skill-state').textContent = ready ? 'Ready to review' : 'Interrupted';
  $('workflow-text').textContent = selectedSkill.instructions;
  $('skill-download').disabled = !ready;
  $('skill-export-hint').textContent = ready
    ? 'Review the steps and parameters before use. Export includes the owning computer’s identity.'
    : 'This recording was interrupted. Review it and teach the task again before exporting.';
  renderLibrary();
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
function configText() {
  if (!ownerConfig) return '';
  const entry = ownerConfig[$('client-access').value];
  return $('client-format').value === 'codex'
    ? `[mcp_servers.computer]\ncommand = ${JSON.stringify(entry.command)}\nargs = ${JSON.stringify(entry.args)}\n`
    : JSON.stringify({ mcpServers: { computer: entry } }, null, 2) + '\n';
}
function renderConfig() {
  const text = configText();
  $('client-config').textContent =
    text ||
    'Run computer-mcp open again on the host to load the exact configuration for this computer.';
  $('config-status').textContent = text
    ? `For ${ownerConfig.computerName} · ${$('client-access').value === 'read' ? 'inspection only' : 'control requires an exclusive lease'}`
    : 'Host configuration is available only in an authorized owner session opened by the CLI.';
  $('config-copy').disabled = !text;
  $('config-download').disabled = !text;
  $('agent-copy').disabled = !ownerConfig || !info;
  $('agent-step').textContent =
    $('client-access').value === 'read'
      ? 'Ask it to call computer_info and inspect capabilities. Read access lets the agent observe this computer without changing it.'
      : 'Ask it to call computer_info, inspect capabilities and acquire control before making changes.';
  if (ownerConfig) {
    $('computer-name').textContent = ownerConfig.computerName;
    $('open-command').textContent = ownerConfig.openCommand;
  }
  if (info) {
    $('capability-summary').textContent =
      `${info.capabilities.length} tools discovered · browser, files, terminal, screenshots and workflows`;
    $('capabilities').replaceChildren(
      ...info.capabilities.map((name) => {
        const span = document.createElement('span');
        span.textContent = name;
        return span;
      }),
    );
  }
}
async function copy(text) {
  if (!navigator.clipboard?.writeText)
    throw new Error(
      'Clipboard is unavailable. Select the text or download the file.',
    );
  await navigator.clipboard.writeText(text);
  notice('Copied to clipboard.');
}
function download(content, filename) {
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/plain;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function startTeaching() {
  $('teach-builder').hidden = false;
  $('teach-name').focus();
}
for (const tab of document.querySelectorAll('.tab'))
  tab.onclick = guarded(() => showView(tab.dataset.view));
$('desktop-connect').onclick = guarded(() => showView('connect'));
$('desktop-teach').onclick = guarded(async () => {
  await showView('teach');
  startTeaching();
});
$('new-skill').onclick = startTeaching;
$('close-builder').onclick = () => {
  if (!info?.teach.active) $('teach-builder').hidden = true;
};
$('record-review').onclick = guarded(() => showView('teach'));
$('skill-search').oninput = renderLibrary;
$('take').onclick = guarded(async () => {
  await request('/api/control/take', {});
  notice(
    'You have control. Release it when you’re ready for your agent to work.',
  );
});
$('release').onclick = guarded(async () => {
  await call('control_release');
  notice('Control released. Your agent can acquire it now.');
});
$('demo').onclick = guarded(async () => {
  await call('browser_action', {
    action: 'navigate',
    url: 'http://127.0.0.1:7070/demo',
  });
  notice('Practice task opened in the guest browser.');
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
  notice('Saved in your computer’s workspace.');
  await browse();
});
$('terminal-form').onsubmit = guarded(async () => {
  $('terminal-output').textContent = 'Running…';
  $('run').disabled = true;
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
  await showView('desktop');
  notice(
    'Recording started. Show the task, then choose Review & save. Typed values are omitted.',
  );
});
$('teach-stop').onclick = guarded(async () => {
  const saved = await request('/api/teach/stop', {});
  $('skill-search').value = '';
  await selectSkill(saved.id);
  $('teach-builder').hidden = true;
  notice(
    'Skill saved. Review the instructions and input parameters, then export it for your agent.',
  );
});
$('skill-download').onclick = guarded(async () => {
  exportedSkill = await request(`/api/workflows/${selectedSkill.id}/skill`);
  download(exportedSkill.content, exportedSkill.filename);
  $('skill-export-hint').textContent =
    `Install as ${exportedSkill.name}/SKILL.md in your agent’s skills directory. Review before use.`;
  notice(
    'SKILL.md exported. It contains instructions and parameters; the MCP connection supplies the tools.',
  );
});
$('skill-copy').onclick = guarded(() => copy(selectedSkill.instructions));
$('client-format').onchange = renderConfig;
$('client-access').onchange = renderConfig;
$('config-copy').onclick = guarded(() => copy(configText()));
$('config-download').onclick = () =>
  download(
    configText(),
    $('client-format').value === 'codex'
      ? 'computer-mcp.toml'
      : 'computer-mcp.json',
  );
$('agent-copy').onclick = guarded(() =>
  copy(
    `Use the connected Sendtry Computer MCP server. Call computer_info and verify computer ID ${info.computerId}. Inspect the available capabilities. ${$('client-access').value === 'read' ? 'List workspace files and describe what is available; this connection is read only.' : 'Acquire control, run pwd in the guest workspace, then release control. If someone else owns control, report it instead of taking over.'}`,
  ),
);
function disconnected(error) {
  info = undefined;
  rfb?.disconnect();
  rfb = null;
  mode = null;
  mutationState();
  $('connection').textContent =
    error.status === 401 ? 'Owner access required' : 'Computer offline';
  $('connection').classList.remove('online');
  $('identity').textContent = 'Computer not connected';
  $('owner').textContent =
    error.status === 401 ? 'Authorize to connect' : 'Computer unavailable';
  $('screen-status').textContent =
    error.status === 401
      ? 'Open this console from the CLI'
      : 'Waiting for your computer…';
  $('record-banner').hidden = true;
  if (error.status === 401) {
    actor = undefined;
    locked = true;
    $('access-state').hidden = false;
  }
  notice(
    error.status === 401
      ? 'Owner access required. Open the console again from your host CLI.'
      : 'Could not reach the computer. Check its status on the host; this page will reconnect.',
    true,
  );
}
async function connect() {
  if (locked || busy) return;
  try {
    const reconnecting = !info;
    if (!actor) {
      const session = await request('/api/ui/session', {
        ticket: window.__computerUITicket,
      });
      actor = session.actor;
      delete window.__computerUITicket;
    }
    await refresh();
    if (ownerConfig === undefined)
      ownerConfig = (await request('/api/ui/connection')).connection;
    if (reconnecting) {
      notice('');
      renderConfig();
    }
  } catch (error) {
    disconnected(error);
  }
}
await connect();
setInterval(() => {
  void connect();
}, 4000);
setInterval(() => {
  if (own()) void call('control_renew').catch(() => {});
}, 20000);
