// Host-side, observation-only acceptance of one private named grant. No Docker,
// catalog/owner config, task creation, control lease, file read or model inference.
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { readAssignedConnection } from './assigned-connections.js';
import { RuntimeClient } from './client.js';
import { tools } from './catalog.js';
import { computerInfoSchema, outputSchemas } from './tool-results.js';
import { version } from './metadata.js';

const cli = fileURLToPath(new URL('./cli.js', import.meta.url));
const namesEqual = (a, b) =>
  a.length === b.length &&
  [...a].sort().every((name, i) => name === [...b].sort()[i]);
function fail(code) {
  const error = new Error('Connection acceptance failed.');
  error.code = code;
  throw error;
}
function identity(value, config) {
  const parsed = computerInfoSchema.safeParse(value);
  if (!parsed.success) fail('runtime_contract');
  const info = parsed.data;
  if (
    info.computerId !== config.computerId ||
    info.workspaceId !== config.workspaceId ||
    info.connection?.id !== config.connectionId ||
    info.connection.access !== config.access ||
    info.connection.requiresTask !== (config.access === 'work')
  )
    fail('identity_mismatch');
  return info;
}

export async function probeStdio(file, config, { timeoutMs = 15000 } = {}) {
  const client = new Client({ name: 'computer-mcp-check', version });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cli, 'mcp', '--connection', file],
    stderr: 'pipe',
  });
  // Drain without retaining or echoing uncontrolled stderr, including credentials.
  transport.stderr?.resume();
  const controller = new AbortController();
  let timer;
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      const error = new Error('Connection probe deadline exceeded.');
      error.code = 'probe_timeout';
      reject(error);
    }, timeoutMs);
  });
  const options = { signal: controller.signal, timeout: timeoutMs };
  try {
    return await Promise.race([
      (async () => {
        await client.connect(transport, options);
        const listed = await client.listTools({}, options);
        const expected = Object.entries(tools)
          .filter(([, tool]) => config.access === 'work' || tool.read)
          .map(([name]) => name);
        if (
          !namesEqual(
            listed.tools.map((tool) => tool.name),
            expected,
          )
        )
          fail('discovery_contract');
        for (const tool of listed.tools)
          if (
            !tool.inputSchema ||
            typeof tool.inputSchema !== 'object' ||
            tool.outputSchema?.type !== 'object'
          )
            fail('discovery_contract');
        const infoResult = await client.callTool(
          { name: 'computer_info', arguments: {} },
          undefined,
          options,
        );
        if (infoResult.isError) fail('runtime_contract');
        const info = identity(infoResult.structuredContent, config);
        if (!namesEqual(info.capabilities, expected))
          fail('discovery_contract');
        const tasksResult = await client.callTool(
          { name: 'task_list', arguments: {} },
          undefined,
          options,
        );
        const tasks = outputSchemas.task_list.safeParse(
          tasksResult.structuredContent,
        );
        if (tasksResult.isError || !tasks.success) fail('runtime_contract');
        if (
          tasks.data.tasks.some(
            (task) =>
              task.computerId !== config.computerId ||
              task.workspaceId !== config.workspaceId ||
              task.connectionId !== config.connectionId ||
              typeof task.outdated !== 'boolean',
          )
        )
          fail('identity_mismatch');
        const prompts = await client.listPrompts({}, options);
        const expectedPrompts = [
          'computer-task',
          'taught-workflow',
          ...(config.access === 'work'
            ? ['assigned-task', 'analyze-demonstration']
            : []),
        ];
        if (
          !namesEqual(
            prompts.prompts.map((prompt) => prompt.name),
            expectedPrompts,
          )
        )
          fail('discovery_contract');
        const resources = await client.listResources({}, options);
        if (
          !namesEqual(
            resources.resources.map((resource) => resource.uri),
            [`computer://${config.computerId}/identity`],
          )
        )
          fail('discovery_contract');
        return {
          info,
          toolCount: listed.tools.length,
          promptCount: prompts.prompts.length,
          queuedTasks: tasks.data.tasks.filter(
            (task) => task.status === 'queued' && !task.outdated,
          ).length,
        };
      })(),
      expired,
    ]);
  } finally {
    clearTimeout(timer);
    controller.abort();
    // Official transport closes stdin, then escalates only its own subprocess.
    await client.close().catch(() => {});
    await transport.close().catch(() => {});
  }
}

const remedies = {
  connection_file:
    'Inspect the absolute connection file and its private permissions (0600 on POSIX; owner-only ACL on Windows). Ask the owner to create a new named connection if missing or damaged. No file was changed.',
  connection_revoked:
    'Ask the owner to create a new named connection and replace this entry in the harness. Revoked grants cannot be restored.',
  unauthorized:
    'Ask the owner to verify this named grant or create a replacement. Credentials were not changed.',
  connection_required:
    'Ask the owner to create a named connection for the selected PC.',
  computer_mismatch:
    'Stop. The endpoint belongs to a different computer. Ask the owner to inspect the selected PC and its saved identity; do not rewrite the pin.',
  workspace_mismatch:
    'Stop. The workspace changed. Ask the owner to inspect the selected volume and saved identity; do not rewrite the pin.',
  identity_mismatch:
    'Stop. Computer, workspace or named grant identity/access differs. Ask the owner to inspect the saved PC and volume; do not rewrite pins.',
  not_ready:
    'Wait for the selected PC to finish starting, then run check again. The owner can inspect status; this command does not start it.',
  runtime_contract:
    'Ask the owner to update this checkout and rebuild only the selected PC with start --rebuild. Inspect active work first. The runtime contract is incompatible.',
  discovery_contract:
    'This bridge/runtime exposes an unexpected tool, prompt, resource or schema set. Update CLI and selected runtime together, then reconnect the harness.',
  probe_timeout:
    'The stdio probe exceeded 15 seconds. Inspect local resource usage and selected PC status, then retry the check. No task was started.',
  runtime_unavailable:
    'The loopback runtime is unavailable. Ask the owner to inspect status and start the selected PC if stopped; use doctor for local Docker/capacity issues.',
  stdio_unavailable:
    'The runtime answered but its stdio bridge could not complete acceptance. Check this Node installation and checkout dependencies; update CLI/runtime together and retry.',
};

export async function checkConnection(file, { probe = probeStdio } = {}) {
  const report = {
    version: 1,
    checkedAt: new Date().toISOString(),
    result: 'blocked',
    checks: [],
    purpose:
      'Named MCP acceptance by observation. No task/effect, lease, PC lifecycle or model call. Presence and activity metadata may be recorded. Does not verify a particular harness or future task success.',
  };
  const add = (id, status, message) =>
    report.checks.push({ id, status, message });
  let stage = 'connection_file';
  let api;
  let reached = false;
  try {
    const config = await readAssignedConnection(file);
    add(
      'connection-file',
      'ok',
      'Private named grant format and file permissions accepted.',
    );
    report.computerId = config.computerId;
    report.workspaceId = config.workspaceId;
    report.connectionId = config.connectionId;
    report.access = config.access;
    stage = 'runtime_unavailable';
    api = new RuntimeClient(config, { source: 'cli' });
    const observed = await api.info();
    reached = true;
    identity(observed, config);
    add(
      'runtime',
      'ok',
      'Loopback runtime authenticated the pinned computer, workspace, grant and access.',
    );
    stage = 'stdio_unavailable';
    const result = await probe(file, config);
    // Recheck identity after the independent child rereads the grant file.
    const info = identity(result.info, config);
    add(
      'stdio',
      'ok',
      'Actual stdio bridge negotiated MCP and accepted discovery and structured observations.',
    );
    report.discovery = {
      tools: result.toolCount,
      prompts: result.promptCount,
      resources: 1,
    };
    report.work = {
      state:
        config.access === 'read'
          ? 'read-only'
          : info.lease
            ? 'busy'
            : result.queuedTasks
              ? 'assigned'
              : 'needs-assignment',
      queuedTasks: result.queuedTasks,
    };
    add(
      'work',
      'info',
      {
        'read-only':
          'This grant can observe; execution needs a separate work grant and owner assignment.',
        busy: 'Another session currently holds control. Wait, or use the owner console for intentional takeover; never take over automatically.',
        assigned:
          'A current queued assignment is available. The agent must inspect task_get and use task_start; this check starts nothing.',
        'needs-assignment':
          'Create an assignment for this named connection in Tasks, then give the request to the agent. No assignment was created.',
      }[report.work.state],
    );
    report.result = 'ready';
  } catch (error) {
    const code = Object.hasOwn(remedies, error.code) ? error.code : stage;
    add(stage, 'blocked', remedies[code]);
    report.failure = code;
  } finally {
    if (reached) await api.endSession().catch(() => {});
  }
  return report;
}
