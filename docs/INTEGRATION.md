# Integrate any local MCP agent

Sendtry Computer provides one scoped computer connection. Your harness supplies
its model, tool loop, conversation and any skill loader. No OpenAI, Anthropic,
xAI, Sendtry account or Piblo API credential is required by this server.

## What is agnostic, and what is specific

| Boundary             | Contract                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Model/provider       | External to this repository; no model SDK, inference API or provider routing in the execution path                           |
| MCP client           | Local stdio, discovered tools with JSON schemas, structured results and separate image content; no required client name      |
| Client configuration | Optional serializers for common settings layouts; these are not MCP protocol formats or new permissions                      |
| Skills               | Portable Agent Skills instructions; a harness can use MCP tools without installing a skill or supporting MCP prompts         |
| Host                 | Node CLI with an explicitly selected local Linux Docker engine; paths/executables must match the harness environment         |
| Guest                | Implemented Docker Linux adapter, guest Bash/Chromium/X11 and dedicated volume; native/VM/remote adapters remain future work |
| Branding             | Sendtry names and artwork identify the product; they are not an authentication service or runtime dependency                 |

The host CLI owns provisioning/credentials; the MCP bridge owns one protocol
session; the guest enforces computer/workspace/grant/task/lease boundaries.
The owner console observes and controls that same guest. See
[architecture](../arquitecture.md) and [adapter semantics](ADAPTERS.md).

## Get a provider-independent launch descriptor

Create/start a PC with the [walkthrough](WALKTHROUGH.md), then issue one named
grant for your agent. A read grant observes; a work grant can execute assigned
tasks. From the server checkout:

```sh
node src/cli.js connection create my-agent --name my-computer --access work --client stdio
```

For an existing grant, replace the illustrative path with the private file
reported by creation:

```sh
node src/cli.js config --connection "/absolute/private/grant.json" --client stdio
```

The output is a plain JSON launch descriptor, with no client settings wrapper:

```json
{
  "command": "/absolute/path/to/node",
  "args": [
    "/absolute/path/to/computer-mcp/src/cli.js",
    "mcp",
    "--connection",
    "/absolute/private/grant.json"
  ]
}
```

Use the actual generated output, not these placeholders. Pass its command and
argument array directly to your subprocess/MCP transport, without a shell.
Choose a unique registration key in your harness if it needs one; the descriptor
does not choose that key. Each bridge stays pinned to its grant/PC regardless of
CLI default selection. It does not provision/start a guest or launch inference.

Other serializers preserve the same command/args and authority:

| `--client`          | Output                                                          |
| ------------------- | --------------------------------------------------------------- |
| `stdio`             | Plain `{ "command": …, "args": […] }` for a subprocess launcher |
| `generic` (default) | A unique entry under `mcpServers`, used by several clients      |
| `codex`             | A TOML `mcp_servers` entry                                      |
| `vscode`            | A `servers` entry with `type: stdio`                            |

MCP standardizes the stdio messages, not the on-disk settings layout. Follow
your client's own registration/trust rules. Stdout from the bridge is protocol
traffic; configure Node directly, not `npm start`. The console HTTP URL is not a
remote MCP endpoint. See the [official stdio binding](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio).

## Minimal SDK observation

From this installed checkout, save the generated descriptor as a local
`launch.json`, then use the same transport with any client identity:

```js
import fs from 'node:fs/promises';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const launch = JSON.parse(await fs.readFile('launch.json', 'utf8'));
const client = new Client({ name: 'my-agent', version: '1.0.0' });
const transport = new StdioClientTransport({ ...launch, stderr: 'pipe' });
transport.stderr?.resume();
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  console.log(tools.map((tool) => tool.name));
  const info = await client.callTool({ name: 'computer_info', arguments: {} });
  if (info.isError) throw new Error('Computer observation failed.');
  console.log(info.structuredContent);
} finally {
  await client.close();
}
```

This observes only: no task, control lease, file write or model call. Keep the
descriptor local; it exposes machine paths. Never read/share the private grant
file's contents. Protect that file and do not replace it with owner state.
`check --connection PRIVATE_FILE` is the CLI equivalent readiness probe.

## Connect tools to your agent's execution loop

Discover tools instead of hardcoding a Claude/Codex/Cursor prefix. Route each
call to the intended live connection, validate arguments and preserve `isError`,
structured/text results and image blocks. A client without image support can
still use applicable text tools; visual demonstration analysis needs a
vision-capable external agent. MCP prompts are optional handoff helpers, not a
prerequisite for invoking tools or an automatic model runner.

For effects, the owner saves an assignment to this named work grant. The agent
reads it, calls `task_start`, checks any taught revision, executes within scope
and calls `task_finish`. The owner verifies actual output separately. A read
grant, declared client/model label or skill cannot bypass that contract. Inspect
partial results after cancellation/response loss; never replay effects blindly.
[Task contract](ASSIGNMENTS.md) and [tools/skills reference](TOOLS-AND-SKILLS.md).

## Optional skill metadata and distribution

The generic operator's portable files are `SKILL.md` and its MIT `LICENSE.txt`.
The canonical bundle also includes `agents/openai.yaml` for one harness's
display/invocation metadata. That file is optional for the portable skill and
is validated when present; it is not imported by the MCP bridge or guest.
The [Agent Skills specification](https://agentskills.io/specification) defines
the instruction format, while each harness controls discovery/activation.

The local package inventory includes the linked public documentation and source
assets and excludes private state, environment files, media, generated bundles
and QA artifacts. Package validation checks local document targets too. This is
a packaging contract; npm publication remains disabled.

Tests exercise an independently named SDK client with named work/read grants,
actual stdio discovery and the plain launch descriptor. SDK compatibility is
not certification of every harness/IDE. The host/guest support limits and dated
[real-client acceptance](CLIENT-VALIDATION.md) still apply.
