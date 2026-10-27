# Check a connection and recover safely

Use `doctor` for host prerequisites/capacity, `status` for the selected PC and
`check` to accept a particular named MCP connection. These commands answer
different questions. None creates a PC, starts a task or chooses a new identity.

## Before handing a connection to an agent

Start the selected computer and create its named grant as described in
[setup](SETUP.md). Use the **absolute private connection file** reported by
`connection create`, not the owner's `computer.json`:

```sh
node src/cli.js check --connection /absolute/private/connection.json
```

The result is JSON, with exit status **0** for accepted MCP readiness and **1**
for a blocked check. It reports public PC/workspace/grant IDs and read/work
access, never a credential or task contents. Paths with spaces need shell
quotes. On Windows use the actual absolute Windows path. POSIX files must be
0600; on Windows protect the file/directory with an owner-only ACL. The command
does not change permissions. It works without a host catalog or owner config;
`--name`, `--state`, `--root` and `--access` cannot override the file.

Acceptance authenticates the loopback runtime, starts this checkout's actual
stdio bridge with the official SDK, checks tool/prompt/resource discovery,
calls `computer_info` and `task_list`, and verifies the pins, access and
structured results. Named work/read expose **20/9 tools**, **4/2 prompts** and
one identity resource. The runtime preflight has a five-second deadline; the
protocol probe has one 15-second deadline, followed by bounded SDK process
cleanup. It closes only its own bridge/session. It takes no control, reads no
workspace file, samples no screen/video and runs no model inference. Presence
and operational Activity metadata can be recorded. It does not test the
settings, project trust or approvals inside a particular harness.

`result: "ready"` means the connection passed these checks. Inspect `work.state`
before expecting execution:

| State              | Meaning and next step                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `read-only`        | Observation is available. Execution needs a separate work grant.                                                                                                         |
| `needs-assignment` | The work grant is valid, but has no current queued assignment. Create one in **Tasks**, then copy its request to the agent.                                              |
| `assigned`         | At least one current queued request exists. The agent must inspect `task_get`, then activate it with `task_start`.                                                       |
| `busy`             | A session holds control, including possibly the same grant in another process. Wait or intentionally use owner takeover. The check never takes or releases that control. |

This is a snapshot, not a reservation: another session can take control or a
workflow can change after it finishes. `task_start` repeats authorization,
workflow revision and exclusive-control checks. A ready connection is not a
promise that a future task will succeed.

## If the check is blocked

The JSON `failure` code and check message explain the next action. Errors from
the runtime, parser or child stderr are not echoed. Never fix identity failures
by editing UUIDs or silently replacing a volume.

| Failure                                                        | Recovery                                                                                                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `connection_file`                                              | Check the absolute path, regular file format and private permissions. If lost/damaged, the owner creates a replacement grant; revoke the old public ID when known.               |
| `connection_revoked`, `unauthorized`, `connection_required`    | Ask the owner for a new scoped named connection. Replace the harness entry and reconnect. Revocation cannot be undone.                                                           |
| `computer_mismatch`, `workspace_mismatch`, `identity_mismatch` | Stop and inspect the selected PC, saved config and owned volume. Preserve the original pins and data. An intentionally new workspace needs a new explicitly accepted connection. |
| `runtime_unavailable`, `not_ready`                             | Owner runs `status --name PC`; start that PC if stopped or wait if starting. Use `doctor --name PC` for local Docker/ownership/capacity issues. The check does not start it.     |
| `runtime_contract`, `discovery_contract`                       | Keep CLI and guest versions aligned. Inspect active work before updating/rebuilding only that selected PC, then run check again and reconnect the harness.                       |
| `stdio_unavailable`, `probe_timeout`                           | Check Node, checkout dependencies and local resource usage. Run `npm ci` in the intended checkout if needed, then retry. No task was started.                                    |

Owner commands always select a PC explicitly; retain `--root /absolute/catalog`
when using a custom catalog:

```sh
node src/cli.js list
node src/cli.js status --name my-computer
node src/cli.js doctor --name my-computer
node src/cli.js connection list --name my-computer
node src/cli.js start --name my-computer
# After a source/runtime update, inspect active work before this explicit rebuild:
node src/cli.js start --name my-computer --rebuild
node src/cli.js open --name my-computer
```

`start` on a ready current PC preserves its session. Rebuild/restart interrupts
unfinished attempts; it does not resume them. Inspect the computer for partial
effects, retain the old report/history and create a new assignment for any
deliberate retry. Do not automatically replay a command after a timeout,
takeover, lost response or `invalid_tool_result`: effects may already exist.

No diagnostic performs pruning, volume deletion, context switching, automatic
credential rotation or daemon repair. Full backup/restore, safe uninstall,
VM/remote adapters and a release/update distribution channel remain pending.

## Where autonomy lives

The CLI manages the owned guest and scoped connections. The external harness
provides the model and executes tool calls. Teach saves trace/optional video;
the owner grants analysis, the external agent proposes a method, and the owner
reviews it before assignment/export. Check performs none of those effects.
There is no hidden model runner, automatic training, unattended retry scheduler
or bypass of owner review. See [Teach](TEACH.md), [assignments](ASSIGNMENTS.md)
and [tools and skills](TOOLS-AND-SKILLS.md).
