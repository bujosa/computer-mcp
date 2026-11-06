// cross-spawn resolves PATHEXT and escapes arguments for npm's .cmd shims on Windows.
import spawn from 'cross-spawn';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { RuntimeClient } from './client.js';
import { declaredClient } from './audit-contract.js';
import { formatAssignedTask } from './assigned-task.js';
import { skillParameters } from './skill-use.js';
import { version } from './metadata.js';
import {
  analysisRequest,
  nextAssignedTask,
  nextDemonstration,
} from './agent-queue.js';

// The worker turns owner-prepared items into agent runs on the host. It only
// launches the agent CLI with this one MCP connection; every effect still goes
// through task_start/workflow_propose and every result awaits owner review.
export const workerAgents = ['claude', 'codex'];
const SERVER = 'sendtry-computer';
const cli = fileURLToPath(new URL('./cli.js', import.meta.url));

// The request goes to the agent on stdin and the MCP config and skill go in
// files under dir: on Windows npm installs agents as .cmd shims, and cmd.exe
// cuts command lines at 8191 characters and cannot carry newlines.
export function agentCommand(agent, connectionFile, dir, skill) {
  const server = {
    command: process.execPath,
    args: [cli, 'mcp', '--connection', connectionFile],
  };
  if (agent === 'claude') {
    const files = {
      'mcp.json': JSON.stringify({ mcpServers: { [SERVER]: server } }),
      ...(skill ? { 'skill.md': skill } : {}),
    };
    return {
      command: 'claude',
      files,
      args: [
        '-p',
        '--mcp-config',
        path.join(dir, 'mcp.json'),
        '--strict-mcp-config',
        '--allowedTools',
        `mcp__${SERVER}`,
        '--output-format',
        'stream-json',
        '--verbose',
        ...(skill
          ? ['--append-system-prompt-file', path.join(dir, 'skill.md')]
          : []),
      ],
    };
  }
  if (agent === 'codex')
    return {
      command: 'codex',
      files: {},
      args: [
        'exec',
        '--skip-git-repo-check',
        '--ephemeral',
        '--json',
        '--sandbox',
        'read-only',
        '-c',
        `mcp_servers.${SERVER}.command=${JSON.stringify(server.command)}`,
        '-c',
        `mcp_servers.${SERVER}.args=${JSON.stringify(server.args)}`,
        '-c',
        `mcp_servers.${SERVER}.default_tools_approval_mode="approve"`,
      ],
    };
  throw new Error(`Use --agent ${workerAgents.join(' or ')}.`);
}

// One readable line per agent event: tool calls and messages, never results.
export function describeEvent(agent, event) {
  if (agent === 'claude') {
    if (event.type === 'assistant')
      return (event.message?.content || []).flatMap((part) =>
        part.type === 'tool_use' && part.name.startsWith(`mcp__${SERVER}__`)
          ? [`→ ${part.name.slice(SERVER.length + 7)}`]
          : part.type === 'text' && part.text.trim()
            ? [part.text.trim()]
            : [],
      );
    if (event.type === 'result')
      return [event.is_error ? 'Agent stopped with an error.' : 'Agent done.'];
    return [];
  }
  if (event.type === 'item.started' && event.item?.type === 'mcp_tool_call')
    return [`→ ${event.item.tool}`];
  if (event.type === 'item.completed' && event.item?.type === 'agent_message')
    return [event.item.text.trim()];
  if (event.type === 'turn.completed') return ['Agent done.'];
  if (event.type === 'error' || event.type === 'turn.failed')
    return ['Agent stopped with an error.'];
  return [];
}

async function runAgent(agent, request, file, skill, log) {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'computer-mcp-worker-'));
  const { command, args, files } = agentCommand(agent, file, cwd, skill);
  try {
    for (const [name, content] of Object.entries(files))
      await fs.writeFile(path.join(cwd, name), content, { mode: 0o600 });
    return await new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      child.stdin.on('error', () => {}); // An agent that exits early closes it.
      child.stdin.end(request);
      readline.createInterface({ input: child.stdout }).on('line', (line) => {
        let event;
        try {
          event = JSON.parse(line);
        } catch {
          return;
        }
        for (const text of describeEvent(agent, event)) log(`  ${text}`);
      });
      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr = (stderr + chunk).slice(-2000);
      });
      child.on('error', (error) => {
        log(`  Could not start ${command}: ${error.message}`);
        resolve(false);
      });
      child.on('close', (code) => {
        if (code && stderr.trim())
          log(
            `  ${command} exited ${code}: ${stderr.trim().split('\n').at(-1)}`,
          );
        resolve(code === 0);
      });
    });
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
}

export async function runWorker(
  config,
  file,
  {
    agent,
    interval = 5,
    once = false,
    log = (line) => process.stdout.write(line + '\n'),
  },
) {
  if (!workerAgents.includes(agent))
    throw new Error(`Use --agent ${workerAgents.join(' or ')}.`);
  if (!config.connectionId || config.access !== 'work')
    throw new Error('The worker needs a named work connection.');
  const client = new RuntimeClient(config, { source: 'mcp' });
  const meta = declaredClient('mcp', {
    name: `computer-mcp-worker ${agent}`,
    version,
  });
  const skill = await fs.readFile(
    new URL('../skills/sendtry-computer/SKILL.md', import.meta.url),
    'utf8',
  );
  const handled = new Set();
  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const info = await client.info({ client: meta });
  log(
    `Watching ${config.name || info.computerId} for ${config.label || 'this connection'} → ${agent}. Assign a task or allow Teach analysis in the console.`,
  );
  while (!stopping) {
    let item;
    try {
      const { tasks } = await client.call('task_list', {}, undefined, meta);
      const task = nextAssignedTask(tasks, handled);
      if (task) {
        handled.add(task.id);
        const workflow = task.workflow
          ? await client.call(
              'workflow_get',
              { id: task.workflow.id },
              undefined,
              meta,
            )
          : undefined;
        if (workflow && skillParameters(workflow).length)
          log(
            `Task "${task.name}" needs skill inputs that only exist in the copied request. Paste that request into your agent.`,
          );
        else
          item = {
            label: `Task "${task.name}"`,
            request: formatAssignedTask(task),
          };
      } else {
        const { workflows } = await client.call(
          'workflow_list',
          {},
          undefined,
          meta,
        );
        const demo = nextDemonstration(workflows, handled);
        if (demo) {
          handled.add(`${demo.id}:${demo.revision}`);
          item = {
            label: `Teach analysis "${demo.name}"`,
            request: analysisRequest(demo.id),
          };
        }
      }
    } catch (error) {
      log(`Computer unavailable: ${error.message}`);
    }
    if (item) {
      log(`${item.label} → starting ${agent}`);
      const ok = await runAgent(agent, item.request, file, skill, log);
      log(
        ok
          ? `${item.label} finished. Check the result in the console.`
          : `${item.label} did not finish cleanly. Inspect it in the console; nothing is retried.`,
      );
      continue;
    }
    if (once) break;
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));
  }
}
