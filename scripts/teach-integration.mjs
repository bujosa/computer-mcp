// Real guest media and teaching contract; no UI/appearance automation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHmac } from 'node:crypto';
import { readConfig } from '../src/config.js';
import { RuntimeClient } from '../src/client.js';
import { formatSkillUse } from '../src/skill-use.js';
import {
  checkDocker,
  checkOwned,
  runDocker,
  projectName,
} from '../src/docker.js';

const config = await readConfig(process.argv[2]);
await checkDocker(config);
assert.equal(await checkOwned(config), true);
const api = new RuntimeClient(config);
const initial = await api.info();
assert.equal(initial.lease, null, 'Use an idle owned QA computer.');
const directory = path.resolve(
  process.argv[3] || `artifacts/teach-${randomUUID()}`,
);
await fs.mkdir(directory, { recursive: true, mode: 0o700 });
let cookie;
async function owner(url, body, method) {
  const response = await fetch(api.base + url, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: {
      origin: api.base,
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  assert.ok(response.ok, `Owner contract failed: ${url} (${response.status})`);
  const issued = response.headers.get('set-cookie');
  if (issued) cookie = issued.split(';')[0];
  return response.json();
}
const ticket = await fetch(api.base + '/api/owner/ticket', {
  method: 'POST',
  headers: {
    authorization: `Bearer ${config.ownerToken}`,
    'content-type': 'application/json',
  },
  body: '{}',
});
assert.equal(ticket.status, 200);
await owner('/api/ui/session', await ticket.json());
const proof = randomUUID();
const nested = `teach-${proof}`;
const invoke = async (name, args = {}) =>
  (await owner('/api/call', { name, args })).result;
let saved;
let mcp;
let readMCP;
const readAPI = new RuntimeClient({
  ...config,
  token: createHmac('sha256', config.token)
    .update('computer-mcp:read:v1')
    .digest('hex'),
});
try {
  await owner('/api/control/take', {});
  await invoke('terminal_run', { command: `mkdir ${nested}` });
  await owner('/api/teach/start', {
    name: 'Reviewed file procedure with video',
    goal: 'Create and verify a note in a nested workspace folder.',
    video: true,
  });
  await invoke('files_write', {
    path: `${nested}/note.txt`,
    text: `omitted-content-${proof}`,
  });
  await invoke('terminal_run', {
    command: `printf 'omitted-command-${proof}' > terminal.txt`,
    cwd: nested,
  });
  await invoke('terminal_run', { command: 'exit 7', cwd: nested });
  await invoke('browser_action', {
    action: 'fill',
    selector: '#note',
    text: `omitted-input-${proof}`,
  });
  // Stop without blurring the final guest text field.
  saved = await owner('/api/teach/stop', {});
  assert.equal(saved.status, 'ready');
  assert.ok(
    saved.steps.some(
      (step) => step.type === 'fill' && step.selector === '#note',
    ),
  );
  assert.ok(
    saved.steps.some(
      (step) =>
        step.type === 'file_write' &&
        step.parameter &&
        step.path === `${nested}/note.txt`,
    ),
  );
  assert.ok(
    saved.steps.some(
      (step) =>
        step.type === 'terminal' &&
        step.cwd === nested &&
        step.outcome.exitCode === 7,
    ),
  );
  for (const value of [
    `omitted-content-${proof}`,
    `omitted-command-${proof}`,
    `omitted-input-${proof}`,
  ])
    assert.ok(!JSON.stringify(saved).includes(value));
  assert.equal(saved.video.status, 'ready');
  assert.ok(saved.video.frames > 0);
  assert.equal(saved.video.computerId, initial.computerId);
  assert.equal(saved.video.workspaceId, initial.workspaceId);
  assert.ok(saved.video.bytes <= initial.limits.teachingVideo.bytes);
  await assert.rejects(api.request(`/api/workflows/${saved.id}/video`), {
    code: 'human_only',
  });
  await assert.rejects(
    api.request(`/api/workflows/${saved.id}/review`, {
      body: { expectedResult: 'Agent cannot confirm owner review.' },
    }),
    { code: 'human_only' },
  );
  const denied = await fetch(api.base + `/api/workflows/${saved.id}/video`);
  assert.equal(denied.status, 401);
  const range = await fetch(api.base + `/api/workflows/${saved.id}/video`, {
    headers: { cookie, range: 'bytes=0-63' },
  });
  assert.equal(range.status, 206);
  assert.equal((await range.arrayBuffer()).byteLength, 64);
  const response = await fetch(
    api.base + `/api/workflows/${saved.id}/video?download=1`,
    { headers: { cookie } },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-disposition'), /attachment/);
  const media = Buffer.from(await response.arrayBuffer());
  assert.equal(media.length, saved.video.bytes);
  assert.equal(media.subarray(0, 4).toString('hex'), '1a45dfa3');
  await fs.writeFile(path.join(directory, 'demonstration.webm'), media, {
    mode: 0o600,
  });
  const probe = JSON.parse(
    await runDocker(
      config,
      [
        'exec',
        projectName(config),
        'ffprobe',
        '-v',
        'error',
        '-count_frames',
        '-show_entries',
        'stream=codec_name,width,height,nb_read_frames',
        '-of',
        'json',
        `/data/control/videos/${saved.id}.webm`,
      ],
      { capture: true },
    ),
  );
  assert.equal(probe.streams[0].codec_name, 'vp8');
  assert.equal(probe.streams[0].width, 960);
  assert.equal(probe.streams[0].height, 600);
  assert.ok(Number(probe.streams[0].nb_read_frames) > 0);
  const privateFile = await invoke('terminal_run', {
    command: `test ! -r /data/control/videos/${saved.id}.webm`,
  });
  assert.equal(privateFile.exitCode, 0);
  await assert.rejects(api.call('workflow_analyze', { id: saved.id }), {
    code: 'analysis_not_authorized',
  });
  await assert.rejects(readAPI.call('workflow_analyze', { id: saved.id }), {
    code: 'read_only',
  });
  saved = await owner(`/api/workflows/${saved.id}/analysis`, {
    enabled: true,
    expectedRevision: saved.revision,
  });
  mcp = new Client({ name: 'teach-video-contract', version: '0.1.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      fileURLToPath(new URL('../src/cli.js', import.meta.url)),
      'mcp',
      '--state',
      path.resolve(process.argv[2]),
    ],
    stderr: 'pipe',
  });
  await mcp.connect(transport);
  const prompt = await mcp.getPrompt({
    name: 'analyze-demonstration',
    arguments: { id: saved.id },
  });
  assert.ok(prompt.messages[0].content.text.includes('workflow_analyze'));
  const analyzed = await mcp.callTool({
    name: 'workflow_analyze',
    arguments: { id: saved.id },
  });
  assert.ok(
    !analyzed.isError,
    JSON.stringify(analyzed.content.filter((item) => item.type === 'text')),
  );
  const context = JSON.parse(analyzed.content[0].text);
  const images = analyzed.content.filter((item) => item.type === 'image');
  assert.ok(images.length > 0 && images.length <= 3);
  for (const [index, frame] of images.entries()) {
    const decoded = Buffer.from(frame.data, 'base64');
    assert.equal(decoded.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.ok(decoded.length <= initial.limits.analysisFrames.bytes);
    await fs.writeFile(
      path.join(directory, `analysis-frame-${index}.png`),
      decoded,
      { mode: 0o600 },
    );
  }
  const proposed = await mcp.callTool({
    name: 'workflow_propose',
    arguments: {
      id: saved.id,
      expectedRevision: context.sourceRevision,
      procedure: `1. Inspect folder ${nested}.\n2. Write supplied parameter input_2 into note.txt with files_write.\n3. Read the file and compare the requested content.`,
      expectedResult: 'The nested note contains the supplied text.',
      uncertainties:
        'Video frames may miss actions. The exit-7 attempt failed; omit it from the successful procedure. Use supplied file content, not visible recorded values.',
    },
  });
  assert.ok(!proposed.isError);
  saved = JSON.parse(proposed.content[0].text);
  assert.ok(saved.draft && !saved.review);
  assert.equal(
    (await readAPI.call('workflow_get', { id: saved.id })).draft,
    undefined,
  );
  await assert.rejects(api.request(`/api/workflows/${saved.id}/skill`), {
    code: 'skill_needs_review',
  });
  const stale = await mcp.callTool({
    name: 'workflow_propose',
    arguments: {
      id: saved.id,
      expectedRevision: context.sourceRevision,
      procedure: 'Stale',
      expectedResult: 'No',
      uncertainties: '',
    },
  });
  assert.ok(stale.isError);
  assert.equal(JSON.parse(stale.content[0].text).code, 'workflow_changed');
  saved = await owner(`/api/workflows/${saved.id}/analysis`, {
    enabled: false,
    expectedRevision: saved.revision,
  });
  assert.equal(
    (await api.call('workflow_get', { id: saved.id })).draft,
    undefined,
  );
  await assert.rejects(api.call('workflow_analyze', { id: saved.id }), {
    code: 'analysis_not_authorized',
  });
  saved = await owner(`/api/workflows/${saved.id}/review`, {
    expectedRevision: saved.revision,
    draftId: saved.draft.id,
    procedure: saved.draft.procedure,
    expectedResult: saved.draft.expectedResult,
    notes: saved.draft.uncertainties,
  });
  const skill = await api.request(`/api/workflows/${saved.id}/skill`);
  assert.ok(
    skill.content.includes('## Verify success') &&
      skill.content.includes('text content') &&
      skill.content.includes(nested),
  );
  await fs.writeFile(path.join(directory, 'SKILL.md'), skill.content, {
    mode: 0o600,
  });
  readMCP = new Client({ name: 'skill-use-read-contract', version: '0.1.0' });
  await readMCP.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [
        fileURLToPath(new URL('../src/cli.js', import.meta.url)),
        'mcp',
        '--state',
        path.resolve(process.argv[2]),
        '--access',
        'read',
      ],
      stderr: 'pipe',
    }),
  );
  const plan = await readMCP.getPrompt({
    name: 'taught-workflow',
    arguments: { id: saved.id, expectedRevision: saved.revision },
  });
  assert.ok(
    plan.messages[0].content.text.includes('Do not perform its effects'),
  );
  await assert.rejects(
    readMCP.getPrompt({
      name: 'taught-workflow',
      arguments: { id: saved.id, intent: 'execute' },
    }),
  );
  // A newer draft blocks use even when read scope hides its body and retains
  // the previous owner review. reviewed=false carries that boundary explicitly.
  saved = await owner(`/api/workflows/${saved.id}/analysis`, {
    expectedRevision: saved.revision,
    enabled: true,
  });
  const pending = await mcp.callTool({
    name: 'workflow_propose',
    arguments: {
      id: saved.id,
      expectedRevision: saved.revision,
      procedure: 'A replacement draft for review.',
      expectedResult: 'Needs review before use.',
      uncertainties: '',
    },
  });
  assert.ok(!pending.isError);
  saved = JSON.parse(pending.content[0].text);
  const hidden = await readAPI.call('workflow_get', { id: saved.id });
  assert.equal(hidden.draft, undefined);
  assert.ok(
    hidden.review,
    'Prior review exists but does not approve the new draft.',
  );
  assert.equal(hidden.reviewed, false);
  await assert.rejects(
    readMCP.getPrompt({ name: 'taught-workflow', arguments: { id: saved.id } }),
  );
  await assert.rejects(
    mcp.getPrompt({ name: 'taught-workflow', arguments: { id: saved.id } }),
  );
  saved = await owner(`/api/workflows/${saved.id}/draft/discard`, {
    expectedRevision: saved.revision,
    draftId: saved.draft.id,
  });
  saved = await owner(`/api/workflows/${saved.id}/analysis`, {
    expectedRevision: saved.revision,
    enabled: false,
  });
  const handoff = await owner(`/api/workflows/${saved.id}/use`, {
    expectedRevision: saved.revision,
    intent: 'execute',
  });
  assert.equal(handoff.computerId, initial.computerId);
  assert.equal(handoff.workspaceId, initial.workspaceId);
  assert.equal(handoff.revision, saved.revision);
  const actualRequest = formatSkillUse(handoff, {
    input_2: `reused-value-${proof}`,
  });
  await fs.writeFile(path.join(directory, 'agent-request.txt'), actualRequest, {
    mode: 0o600,
  });
  const usePrompt = await mcp.getPrompt({
    name: 'taught-workflow',
    arguments: {
      id: saved.id,
      expectedRevision: saved.revision,
      intent: 'execute',
    },
  });
  assert.ok(
    usePrompt.messages[0].content.text.includes(
      'Verify the saved expectedResult',
    ),
  );
  await invoke('control_release');
  const effect = async (name, args = {}) => {
    const response = await mcp.callTool({ name, arguments: args });
    assert.ok(!response.isError, `Skill reuse ${name} failed.`);
    return JSON.parse(response.content[0].text);
  };
  await effect('control_acquire');
  try {
    const current = await effect('workflow_get', { id: saved.id });
    assert.equal(current.revision, handoff.revision);
    assert.equal(current.reviewed, true);
    await effect('files_write', {
      path: `${nested}/note.txt`,
      text: `reused-value-${proof}`,
    });
    assert.equal(
      (await effect('files_read', { path: `${nested}/note.txt` })).text,
      `reused-value-${proof}`,
    );
  } finally {
    await effect('control_release');
  }
  await owner('/api/control/take', {});
  const activity = await owner('/api/activity?limit=100');
  assert.ok(
    activity.events.some(
      (event) =>
        event.action === 'skill.handoff' &&
        event.workflowId === saved.id &&
        event.outcome === 'success',
    ),
  );
  assert.ok(!JSON.stringify(activity).includes(`reused-value-${proof}`));
  const reviewedInstructions = saved.instructions;
  await owner(
    `/api/workflows/${saved.id}/video`,
    { expectedRevision: saved.revision },
    'DELETE',
  );
  assert.equal(
    (await api.call('workflow_get', { id: saved.id })).instructions,
    reviewedInstructions,
  );
  assert.equal(
    (await api.call('workflow_get', { id: saved.id })).video.status,
    'deleted',
  );
  const removed = await fetch(api.base + `/api/workflows/${saved.id}/video`, {
    headers: { cookie },
  });
  assert.equal(removed.status, 409);
  const encoder = await invoke('terminal_run', {
    command:
      "python3 - <<'PY'\nimport glob,sys\nlive=[]\nfor filename in glob.glob('/proc/[0-9]*/comm'):\n try:\n  with open(filename) as stream:\n   if stream.read().strip() == 'ffmpeg': live.append(filename)\n except (PermissionError,FileNotFoundError,ProcessLookupError): pass\nsys.exit(1 if live else 0)\nPY",
  });
  assert.equal(encoder.exitCode, 0);
  // Teach must also work for file/terminal tasks after Chromium has closed.
  const closeBrowser = await invoke('terminal_run', {
    command:
      "python3 - <<'PY'\nimport os,glob,signal\nfor filename in glob.glob('/proc/[0-9]*/cmdline'):\n try:\n  with open(filename,'rb') as stream: args=stream.read().split(b'\\0')\n  if args and args[0].endswith(b'/chrome') and not any(arg.startswith(b'--type=') for arg in args): os.kill(int(filename.split('/')[2]),signal.SIGTERM)\n except (PermissionError,FileNotFoundError,ProcessLookupError): pass\nPY",
  });
  assert.equal(closeBrowser.exitCode, 0);
  await new Promise((resolve) => setTimeout(resolve, 500));
  await assert.rejects(api.call('browser_snapshot'), {
    code: 'browser_closed',
  });
  await owner('/api/teach/start', {
    name: 'Files without Chromium',
    goal: 'Create a guest file',
    video: false,
  });
  await invoke('files_write', {
    path: `${nested}/without-browser.txt`,
    text: 'requested sample',
  });
  const filesOnly = await owner('/api/teach/stop', {});
  assert.equal(filesOnly.status, 'ready');
  assert.ok(filesOnly.steps.some((step) => step.type === 'file_write'));
  await invoke('browser_action', {
    action: 'navigate',
    url: 'http://127.0.0.1:7070/demo',
  });
  process.stdout.write(
    JSON.stringify({
      result: 'passed',
      workflowId: saved.id,
      videoBytes: media.length,
      frames: Number(probe.streams[0].nb_read_frames),
      checks: [
        'actual Xvfb WebM decode',
        'private UID environment/storage',
        'owner-only media/review',
        'range/download',
        'last input without blur',
        'cwd/outcome/file parameters',
        'MCP analysis frames/prompt/proposal',
        'consent revoke/stale draft/read-scope privacy',
        'reviewed skill',
        'pinned plan/execute handoff and read execution denial',
        'hidden pending proposal blocks skill use',
        'fresh supplied file reuse verified through MCP',
        'handoff audit without supplied inputs',
        'explicit video deletion preserves steps',
        'encoder cleanup',
        'Teach without Chromium',
      ],
    }) + '\n',
  );
} finally {
  await mcp?.close().catch(() => {});
  await readMCP?.close().catch(() => {});
  if ((await api.info()).teach.active)
    await owner('/api/teach/stop', {}).catch(() => {});
  await invoke('control_release').catch(() => {});
}
