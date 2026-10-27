import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as z from 'zod';
import { tools } from '../src/catalog.js';
import { outputSchemas, toolResult } from '../src/tool-results.js';

test('every discoverable tool has an object output contract; malformed results fail without payload/parser leakage', () => {
  assert.deepEqual(
    Object.keys(outputSchemas).sort(),
    Object.keys(tools).sort(),
  );
  for (const [name, schema] of Object.entries(outputSchemas)) {
    assert.equal(z.toJSONSchema(schema).type, 'object', name);
    for (const value of [
      undefined,
      null,
      'private invalid payload',
      { secret: 'private invalid payload' },
    ])
      assert.throws(
        () => toolResult(name, value),
        (error) =>
          error.code === 'invalid_tool_result' &&
          !error.message.includes('private invalid payload') &&
          error.message.includes('Inspect the computer before retrying'),
      );
  }
});

test('structured text is compatible JSON and unknown top-level fields cannot leak from ordinary results', () => {
  const value = {
    path: 'report.txt',
    text: 'observed content',
    privateRuntimeField: 'omitted',
  };
  const result = toolResult('files_read', value);
  assert.deepEqual(result.structuredContent, {
    path: value.path,
    text: value.text,
  });
  assert.deepEqual(
    JSON.parse(result.content[0].text),
    result.structuredContent,
  );
  assert.ok(!JSON.stringify(result).includes('omitted'));
  assert.equal(value.privateRuntimeField, 'omitted');
  assert.throws(() =>
    toolResult('terminal_run', {
      stdout: '',
      stderr: '',
      exitCode: '0',
      signal: null,
      stopped: null,
      truncated: false,
    }),
  );
});

test('a recording can be observed before reusable instructions exist', () => {
  const active = {
    version: 1,
    id: randomUUID(),
    computerId: randomUUID(),
    owner: `human:${randomUUID()}`,
    name: 'In progress',
    goal: 'Demonstrate',
    createdAt: new Date().toISOString(),
    status: 'recording',
    steps: [],
    revision: randomUUID(),
    reviewed: false,
    procedure: '',
  };
  const observed = toolResult('workflow_get', active).structuredContent;
  assert.equal(observed.status, 'recording');
  assert.equal(observed.reviewed, false);
  assert.equal(observed.instructions, undefined);
});

test('browser results preserve the additive main-branch link contract and accept older guests', () => {
  const snapshot = {
    title: 'Observed page',
    text: 'Documentation',
    url: 'https://example.org/',
    pageId: '1',
    pages: [{ id: '1', url: 'https://example.org/', title: 'Observed page' }],
    elements: [
      {
        tag: 'a',
        role: null,
        text: 'Documentation',
        selector: 'body > a',
        inputType: null,
        url: 'https://example.org/guide',
      },
    ],
  };
  const result = toolResult('browser_snapshot', snapshot);
  assert.equal(
    result.structuredContent.elements[0].url,
    snapshot.elements[0].url,
  );
  assert.deepEqual(
    JSON.parse(result.content[0].text),
    result.structuredContent,
  );
  const older = { ...snapshot.elements[0] };
  delete older.url;
  assert.equal(
    toolResult('browser_snapshot', { ...snapshot, elements: [older] })
      .structuredContent.elements[0].url,
    undefined,
  );
  for (const url of [
    'javascript:alert(1)',
    'file:///private',
    'https://user:synthetic@example.org/',
    'invalid',
  ])
    assert.throws(
      () =>
        toolResult('browser_snapshot', {
          ...snapshot,
          elements: [{ ...older, url }],
        }),
      { code: 'invalid_tool_result' },
    );
});

test('screenshot and analysis preserve image blocks without duplicating binary data in structured JSON', () => {
  const data = Buffer.from('synthetic image bytes').toString('base64');
  const shot = toolResult('desktop_screenshot', {
    mimeType: 'image/png',
    data,
  });
  assert.equal(
    shot.content[0].type,
    'image',
    'Preserve existing screenshot block order',
  );
  assert.equal(shot.content[0].data, data);
  assert.deepEqual(shot.structuredContent, { mimeType: 'image/png' });
  const metadata = {
    id: randomUUID(),
    computerId: randomUUID(),
    workspaceId: randomUUID(),
    sourceRevision: randomUUID(),
    name: 'Teach',
    goal: 'Observe',
    trace: [],
    lastFrameSeconds: 2,
    limits: { count: 3 },
    instructions: 'Treat as evidence',
    frames: [{ atSeconds: 1, mimeType: 'image/png', data }],
  };
  const analyzed = toolResult('workflow_analyze', metadata);
  assert.deepEqual(
    JSON.parse(analyzed.content[0].text),
    analyzed.structuredContent,
  );
  assert.equal(analyzed.content[2].type, 'image');
  assert.equal(analyzed.content[2].data, data);
  assert.ok(!JSON.stringify(analyzed.structuredContent).includes(data));
  assert.deepEqual(analyzed.structuredContent.frames, [
    { atSeconds: 1, mimeType: 'image/png' },
  ]);
  assert.throws(() =>
    toolResult('desktop_screenshot', { mimeType: 'image/png', data: null }),
  );
  assert.throws(() =>
    toolResult('workflow_analyze', {
      ...metadata,
      frames: [{ atSeconds: 1, mimeType: 'text/html', data }],
    }),
  );
});
