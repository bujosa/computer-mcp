import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import vm from 'node:vm';
import { Teach, reviewWorkflow as reviewDomain } from '../runtime/teach.js';
import { exportSkill } from '../runtime/skill.js';
const reviewWorkflow = (workflow, input) =>
  reviewDomain(workflow, {
    expectedRevision: workflow.revision || workflow.id,
    ...input,
  });
import { Video } from '../runtime/video.js';

async function directory(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-video-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
function encoder({ ignoreInterrupt = false } = {}) {
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  const calls = [];
  let closed = false;
  child.kill = (signal) => {
    calls.push(signal);
    if (ignoreInterrupt && signal !== 'SIGKILL') return true;
    if (!closed) {
      closed = true;
      queueMicrotask(() =>
        child.emit('close', signal === 'SIGKILL' ? null : 255),
      );
    }
    return true;
  };
  return { child, calls };
}

test('Teach retains cwd/outcomes/file parameters, deduplicates inputs and requires owner review', async () => {
  const snapshots = [];
  const teach = new Teach(
    {
      list: async () => [],
      save: async (workflow) => snapshots.push(structuredClone(workflow)),
    },
    randomUUID(),
  );
  await teach.start('human:a', { name: 'Nested file task', goal: '' });
  const longPath = 'nested/'.repeat(40) + 'note.txt';
  await teach.append({
    type: 'file_write',
    path: longPath,
    text: 'omitted private content',
  });
  await teach.append({
    type: 'terminal',
    cwd: 'nested',
    outcome: { exitCode: 7, stopped: null, stderr: 'omitted output' },
    command: 'omitted private command',
  });
  await teach.append({
    type: 'fill',
    selector: '#note',
    url: 'https://example.org/?private=omitted',
  });
  await teach.append({
    type: 'fill',
    selector: '#note',
    url: 'https://example.org/?private=omitted',
  });
  const workflow = await teach.stop('human:a');
  assert.equal(workflow.steps.length, 3);
  assert.equal(workflow.steps[0].path, longPath);
  assert.equal(workflow.steps[0].parameter, 'input_1');
  assert.equal(workflow.steps[1].cwd, 'nested');
  assert.equal(workflow.steps[1].outcome.exitCode, 7);
  assert.ok(workflow.instructions.includes('cwd `nested`'));
  assert.ok(workflow.instructions.includes('review this failed step'));
  assert.ok(!JSON.stringify(snapshots).includes('omitted'));
  assert.throws(() => exportSkill(workflow), { code: 'skill_needs_review' });
  assert.throws(() => reviewWorkflow(workflow, { expectedResult: '' }), {
    code: 'invalid_review',
  });
  assert.throws(
    () =>
      reviewWorkflow(
        { ...workflow, steps: [] },
        { expectedResult: 'A result' },
      ),
    { code: 'skill_not_ready' },
  );
  const reviewed = reviewWorkflow(workflow, {
    expectedResult: 'Read the nested file and verify its content.',
    notes: 'Correct the failed command before reuse.',
  });
  const skill = exportSkill(reviewed);
  assert.ok(
    skill.content.includes(longPath) && skill.content.includes('text content'),
  );
  assert.ok(skill.content.includes('## Verify success'));
  assert.equal(workflow.review, undefined);
  const legacy = reviewWorkflow(
    { ...workflow, steps: [{ type: 'file_write', path: 'old.txt' }] },
    { expectedResult: 'Read old.txt.' },
  );
  assert.equal(legacy.steps[0].parameter, 'input_1');
});

test('Video is private, unprivileged, scoped and coalesces stop; default Teach never launches it', async (t) => {
  const root = await directory(t);
  const fake = encoder();
  let options;
  const video = new Video(root, {
    launch: (_bin, args, config) => {
      options = { args, config };
      setImmediate(() => {
        fake.child.stdout.emit('data', Buffer.from('private-video'));
        fake.child.stderr.emit('data', Buffer.from('frame=1\n'));
      });
      return fake.child;
    },
  });
  const id = randomUUID();
  const metadata = await video.start(id);
  assert.equal(metadata.frames, 1);
  assert.equal(options.config.uid, 1000);
  assert.equal(options.config.gid, 1000);
  assert.equal(options.config.env.COMPUTER_TOKEN, undefined);
  assert.ok(options.args.includes(':1') && options.args.includes('-an'));
  assert.ok(!options.args.includes(root));
  await assert.rejects(video.start(randomUUID()), { code: 'video_busy' });
  const [saved, again] = await Promise.all([video.stop(id), video.stop(id)]);
  assert.deepEqual(saved, again);
  assert.equal(saved.status, 'ready');
  assert.deepEqual(fake.calls, ['SIGINT']);
  assert.equal(video.active, null);
  if (process.platform !== 'win32')
    assert.equal((await fs.stat(video.file(id))).mode & 0o777, 0o600);
  assert.throws(() => video.file('../outside'), { code: 'invalid_workflow' });
  let launches = 0;
  const teach = new Teach(
    { list: async () => [], save: async () => {} },
    randomUUID(),
    {
      start: () => {
        launches++;
      },
    },
  );
  await teach.start('human:a', { name: 'Steps only', goal: '' });
  await teach.stop('human:a');
  assert.equal(launches, 0);
});

test('Video byte/quota limits fail closed and forced stop targets only its encoder', async (t) => {
  const root = await directory(t);
  const fake = encoder({ ignoreInterrupt: true });
  const limits = { durationMs: 10000, bytes: 32, storageBytes: 64, fps: 8 };
  const video = new Video(root, {
    limits,
    launch: () => {
      setImmediate(() => {
        fake.child.stdout.emit('data', Buffer.from('header'));
        fake.child.stderr.emit('data', Buffer.from('frame=1\n'));
      });
      return fake.child;
    },
  });
  const id = randomUUID();
  await video.start(id);
  fake.child.stdout.emit('data', Buffer.alloc(100));
  const done = await video.stop(id);
  assert.equal(done.status, 'failed');
  assert.ok((await fs.stat(video.file(id))).size <= 32);
  assert.deepEqual(fake.calls, ['SIGINT', 'SIGKILL']);
  await fs.writeFile(path.join(root, 'retained.webm'), Buffer.alloc(64));
  await assert.rejects(video.start(randomUUID()), { code: 'video_quota' });
  assert.equal(video.starting, false);
});

test('Interrupting Teach during video startup cannot retain an encoder or clear a later task', async () => {
  let rejectCapture;
  let stopped = false;
  const video = {
    start: (_id, signal) =>
      new Promise((_resolve, reject) => {
        rejectCapture = () => reject(Error('interrupted'));
        signal.addEventListener('abort', rejectCapture, { once: true });
      }),
    stop: async () => {
      stopped = true;
      return null;
    },
  };
  const snapshots = [];
  const teach = new Teach(
    {
      list: async () => [],
      save: async (w) => snapshots.push(structuredClone(w)),
    },
    randomUUID(),
    video,
  );
  const start = teach.start('human:a', {
    name: 'Video',
    goal: '',
    video: true,
  });
  const rejected = assert.rejects(start);
  while (!rejectCapture) await new Promise((resolve) => setImmediate(resolve));
  const result = await teach.stop('human:a', { interrupted: true });
  await rejected;
  assert.equal(result.status, 'interrupted');
  assert.equal(snapshots[0].video.status, 'starting');
  assert.equal(result.video.status, 'failed');
  assert.equal(stopped, true);
  assert.equal(teach.active, null);
  await teach.start('human:a', { name: 'Next', goal: '' });
  assert.equal(teach.status().name, 'Next');
});

test('Recorder event contract captures the last trusted text input without values or checkbox fills', async () => {
  const events = [];
  const listeners = {};
  class Element {
    constructor(type) {
      this.type = type;
      this.id = 'field';
      this.name = '';
      this.autocomplete = '';
    }
  }
  class Input extends Element {}
  class Textarea extends Element {}
  const window = {};
  window.top = window;
  window.__computerTeach = async (event) => events.push(event);
  vm.runInNewContext(
    await fs.readFile(
      new URL('../runtime/recorder.js', import.meta.url),
      'utf8',
    ),
    {
      window,
      document: {
        addEventListener: (name, callback) => {
          listeners[name] = callback;
        },
      },
      Element,
      HTMLInputElement: Input,
      HTMLTextAreaElement: Textarea,
      CSS: { escape: (value) => value },
      location: { href: 'https://example.org/' },
    },
  );
  listeners.input({ isTrusted: true, target: new Input('text') });
  listeners.change({ isTrusted: true, target: new Input('checkbox') });
  listeners.input({ isTrusted: true, target: new Input('password') });
  listeners.input({ isTrusted: false, target: new Textarea() });
  assert.deepEqual(JSON.parse(JSON.stringify(events)), [
    { type: 'fill', selector: '#field', url: 'https://example.org/' },
  ]);
  const desktopField = new Input('text');
  window.__computerDesktopInput = true;
  listeners.input({ type: 'input', isTrusted: true, target: desktopField });
  window.__computerDesktopInput = false;
  listeners.change({ type: 'change', isTrusted: true, target: desktopField });
  assert.equal(
    events.length,
    1,
    'Delayed native change must not duplicate desktop type.',
  );
  listeners.input({ type: 'input', isTrusted: true, target: desktopField });
  assert.equal(
    events.length,
    2,
    'A subsequent human input restores browser recording.',
  );
});

test('Analysis decoder uses a separate UID and cancels only its bounded child on frame overflow', async (t) => {
  const { decodeFrames, frameLimits } = await import('../runtime/frames.js');
  const root = await directory(t);
  const id = randomUUID();
  const video = new Video(root);
  await fs.writeFile(video.file(id), 'private historical video', {
    mode: 0o600,
  });
  const workflow = { id, video: { frames: 8, fps: 8 } };
  const child = encoder();
  let options;
  const extraction = decodeFrames(
    video,
    workflow,
    [0],
    undefined,
    (_bin, args, opts) => {
      options = opts;
      assert.ok(!args.includes(video.file(id)));
      child.child.stdin.once('finish', () =>
        child.child.stdout.write(Buffer.alloc(frameLimits.bytes + 1)),
      );
      return child.child;
    },
  );
  await assert.rejects(extraction, { code: 'frame_limit' });
  assert.equal(options.uid, 1001);
  assert.equal(options.gid, 1001);
  assert.equal(options.env.COMPUTER_TOKEN, undefined);
  assert.equal(options.env.DISPLAY, undefined);
  assert.deepEqual(child.calls, ['SIGKILL']);
  await assert.rejects(decodeFrames(video, workflow, [300], undefined), {
    code: 'invalid_timestamp',
  });
});
