import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { persistAssignedConnection } from '../src/assigned-connections.js';
import { connectionEntryFromFile } from '../src/connection.js';
import {
  analysisRequest,
  nextAssignedTask,
  nextDemonstration,
} from '../src/agent-queue.js';
import { agentCommand, describeEvent, runWorker } from '../src/worker.js';

const at = (minutes) =>
  new Date(Date.UTC(2026, 10, 4, 12, minutes)).toISOString();

test('picks the oldest queued, current assignment and skips handled ones', () => {
  const tasks = [
    { id: 'c', status: 'queued', outdated: false, createdAt: at(3) },
    { id: 'a', status: 'running', outdated: false, createdAt: at(0) },
    { id: 'b', status: 'queued', outdated: false, createdAt: at(1) },
    { id: 'd', status: 'queued', outdated: true, createdAt: at(0) },
  ];
  assert.equal(nextAssignedTask(tasks).id, 'b');
  assert.equal(nextAssignedTask(tasks, new Set(['b'])).id, 'c');
  assert.equal(nextAssignedTask([]), undefined);
});

test('picks the newest demonstration opened for analysis without a proposal or review', () => {
  const base = {
    status: 'ready',
    analysisEnabled: true,
    proposed: false,
    reviewed: false,
  };
  const workflows = [
    { ...base, id: 'old', revision: 'r1', createdAt: at(0) },
    { ...base, id: 'new', revision: 'r2', createdAt: at(5) },
    {
      ...base,
      id: 'closed',
      revision: 'r3',
      createdAt: at(9),
      analysisEnabled: false,
    },
    {
      ...base,
      id: 'drafted',
      revision: 'r4',
      createdAt: at(8),
      proposed: true,
    },
    { ...base, id: 'done', revision: 'r5', createdAt: at(7), reviewed: true },
    {
      ...base,
      id: 'live',
      revision: 'r6',
      createdAt: at(6),
      status: 'recording',
    },
  ];
  assert.equal(nextDemonstration(workflows).id, 'new');
  assert.equal(nextDemonstration(workflows, new Set(['new:r2'])).id, 'old');
  assert.match(analysisRequest('x'), /workflow_analyze[\s\S]*workflow_propose/);
});

test('agent commands expose only this connection and restrict other tools', () => {
  const dir = path.join(os.tmpdir(), 'run');
  const claude = agentCommand('claude', '/private/c.json', dir, 'SKILL');
  assert.equal(claude.command, 'claude');
  // Nothing long or multi-line is passed as an argument (Windows cmd shims).
  assert.equal(
    claude.args[claude.args.indexOf('--mcp-config') + 1],
    path.join(dir, 'mcp.json'),
  );
  assert.equal(
    claude.args[claude.args.indexOf('--append-system-prompt-file') + 1],
    path.join(dir, 'skill.md'),
  );
  assert.equal(claude.files['skill.md'], 'SKILL');
  const config = JSON.parse(claude.files['mcp.json']);
  assert.deepEqual(Object.keys(config.mcpServers), ['sendtry-computer']);
  assert.deepEqual(config.mcpServers['sendtry-computer'].args.slice(-3), [
    'mcp',
    '--connection',
    '/private/c.json',
  ]);
  for (const flag of ['--strict-mcp-config', '-p'])
    assert.ok(claude.args.includes(flag));
  assert.equal(
    claude.args[claude.args.indexOf('--allowedTools') + 1],
    'mcp__sendtry-computer',
  );
  const codex = agentCommand('codex', '/private/c.json', dir);
  assert.equal(codex.command, 'codex');
  assert.equal(codex.args[codex.args.indexOf('--sandbox') + 1], 'read-only');
  assert.ok(codex.args.every((arg) => !arg.includes('\n')));
  assert.throws(
    () => agentCommand('other', '/c.json', dir),
    /--agent claude or codex/,
  );
});

test('agent events become short progress lines without tool results', () => {
  assert.deepEqual(
    describeEvent('claude', {
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            name: 'mcp__sendtry-computer__task_start',
            input: {},
          },
          { type: 'tool_use', name: 'ToolSearch', input: {} },
          { type: 'text', text: ' Starting. ' },
        ],
      },
    }),
    ['→ task_start', 'Starting.'],
  );
  assert.deepEqual(
    describeEvent('codex', {
      type: 'item.started',
      item: {
        type: 'mcp_tool_call',
        tool: 'browser_action',
        result: { secret: 1 },
      },
    }),
    ['→ browser_action'],
  );
  assert.deepEqual(describeEvent('codex', { type: 'turn.completed' }), [
    'Agent done.',
  ]);
});

function grant(port) {
  return {
    version: 1,
    kind: 'named-connection',
    name: 'coding',
    computerId: randomUUID(),
    workspaceId: randomUUID(),
    connectionId: randomUUID(),
    label: 'claude-code',
    port,
    access: 'work',
    token: randomBytes(32).toString('hex'),
  };
}

async function runtime(t, state) {
  const calls = [];
  let config;
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const json = body ? JSON.parse(body) : undefined;
    let value = { ended: true };
    if (req.url === '/api/info')
      value = {
        computerId: config.computerId,
        workspaceId: config.workspaceId,
        connection: { id: config.connectionId, access: 'work' },
        lease: null,
      };
    if (req.url === '/api/call') {
      calls.push(json.name);
      value = { result: state[json.name](json.args, config) };
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(value));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-autostart-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  config = grant(server.address().port);
  const file = await persistAssignedConnection(await fs.realpath(root), config);
  return { config, file, calls };
}

const task = (config, overrides = {}) => ({
  id: randomUUID(),
  computerId: config.computerId,
  workspaceId: config.workspaceId,
  connectionId: config.connectionId,
  name: 'Launch checklist',
  goal: 'Write the checklist.',
  expectedResult: 'The file has three steps.',
  scope: '',
  status: 'queued',
  outdated: false,
  createdAt: at(1),
  ...overrides,
});

test('prompts pick the next assignment or demonstration when the id is omitted', async (t) => {
  const demo = randomUUID();
  let queued;
  const { file, calls } = await runtime(t, {
    task_list: (_, config) => {
      queued = task(config);
      return {
        tasks: [
          task(config, { status: 'reported_success', createdAt: at(0) }),
          queued,
        ],
      };
    },
    task_get: ({ id }) => {
      assert.equal(id, queued.id);
      return queued;
    },
    workflow_list: () => ({
      workflows: [
        {
          id: demo,
          name: 'Log a project note',
          createdAt: at(2),
          status: 'ready',
          reviewed: false,
          proposed: false,
          analysisEnabled: true,
          revision: randomUUID(),
        },
      ],
    }),
  });
  const client = new Client({ name: 'autostart-contract', version: '0.1.0' });
  const transport = new StdioClientTransport({
    ...connectionEntryFromFile(file),
    stderr: 'pipe',
  });
  t.after(() => client.close());
  await client.connect(transport);
  const assignedPrompt = await client.getPrompt({
    name: 'assigned-task',
    arguments: {},
  });
  assert.match(assignedPrompt.messages[0].content.text, new RegExp(queued.id));
  const analysis = await client.getPrompt({
    name: 'analyze-demonstration',
    arguments: {},
  });
  assert.match(
    analysis.messages[0].content.text,
    new RegExp(`demonstration ${demo}`),
  );
  assert.deepEqual(calls, ['task_list', 'task_get', 'workflow_list']);
});

test('the worker hands each queued task to the agent once and stops in --once mode', async (t) => {
  let queued;
  const { config, file, calls } = await runtime(t, {
    task_list: (_, c) => {
      queued ||= task(c);
      return { tasks: [queued] };
    },
    workflow_list: () => ({ workflows: [] }),
  });
  const bin = await fs.mkdtemp(path.join(os.tmpdir(), 'cmcp-fake-agent-'));
  t.after(() => fs.rm(bin, { recursive: true, force: true }));
  const seen = path.join(bin, 'seen.txt');
  // A stand-in agent: records its prompt from stdin and prints one stream-json event.
  // On Windows it is a .cmd shim in front of node, like an npm global install.
  const agent = [
    `require('node:fs').writeFileSync(${JSON.stringify(seen)}, require('node:fs').readFileSync(0, 'utf8'));`,
    `console.log(JSON.stringify({type:'assistant',message:{content:[{type:'tool_use',name:'mcp__sendtry-computer__task_start'}]}}));`,
    `console.log(JSON.stringify({type:'result'}));`,
  ].join('\n');
  await fs.writeFile(path.join(bin, 'claude.js'), agent);
  if (process.platform === 'win32')
    await fs.writeFile(
      path.join(bin, 'claude.cmd'),
      `@"${process.execPath}" "%~dp0claude.js" %*\r\n`,
    );
  else
    await fs.writeFile(
      path.join(bin, 'claude'),
      `#!/bin/sh\nexec '${process.execPath}' '${path.join(bin, 'claude.js')}' "$@"\n`,
      { mode: 0o755 },
    );
  const lines = [];
  const previous = process.env.PATH;
  process.env.PATH = `${bin}${path.delimiter}${previous}`;
  t.after(() => {
    process.env.PATH = previous;
  });
  await runWorker(config, file, {
    agent: 'claude',
    once: true,
    log: (line) => lines.push(line),
  });
  assert.match(await fs.readFile(seen, 'utf8'), new RegExp(queued.id));
  assert.ok(lines.some((line) => line.includes('→ task_start')));
  assert.ok(lines.some((line) => /Launch checklist" finished/.test(line)));
  assert.equal(
    lines.filter((line) => line.includes('starting claude')).length,
    1,
  );
  assert.ok(calls.filter((name) => name === 'task_list').length >= 2);
});
