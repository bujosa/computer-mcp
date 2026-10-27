# Tools, skills and agent execution

Sendtry Computer supplies an assigned **Linux guest**, MCP tools and reusable
instructions. The connected Claude/Codex/Cursor/other agent supplies reasoning.
A skill does not start an agent, train a model or add permissions. This is a
private preview; public distribution and license decisions remain pending.

## Discover the actual connection

Start the selected computer on its CLI host before connecting an agent:

```sh
node src/cli.js list --root /absolute/private/catalog
node src/cli.js start --root /absolute/private/catalog --name my-computer
node src/cli.js connection create observer --root /absolute/private/catalog --name my-computer --access read
node src/cli.js connection list --root /absolute/private/catalog --all
node src/cli.js skill
```

Create a separate grant with `--access work` for assigned execution. Keep the
printed unique MCP key and private `--connection` file; the file pins access and
rejects name/state/root/access overrides. Reconnect to change grants and verify
computer/workspace/connection IDs. See
[setup](SETUP.md) for creating a computer, client formats and skill installation.
Configuration/skill output does not register or start a harness automatically.
The `mcp` command is a stdio server launched by the harness, not an interactive
terminal UI. Its stdout is protocol only.

Use MCP `tools/list`, `prompts/list` and `resources/list` to inspect what this
connection exposes. **Named work/read expose 20/9 tools. Legacy work/read retain
16/7**, available only when the owner enables shared compatibility. New PCs
disable legacy access by default; older saved configs without its flag retain
compatibility. Harnesses may prefix tool names.
`computer_info.capabilities` reports the tool names available to this connection;
execution still requires its credential and active task/control checks. Every connection
is pinned to one computer and workspace; changing the CLI default cannot redirect it.

## Tool inventory

All inputs have strict schemas. Empty input is `{}`. Runtime checks repeat
authorization, validation and identity checks; MCP annotations are hints for
clients, never the permission boundary.

All 20 tools advertise object `outputSchema` contracts and return validated
`structuredContent` on success. Ordinary results retain the same JSON in a text
block for older clients. Screenshots keep the image as the first content block
and expose MIME metadata in JSON; analysis keeps timestamped PNG blocks and
puts frame timestamps/MIME types in JSON, avoiding duplicate base64. The SDK
projects these for modern and legacy protocol clients. Saved trace/review/video
metadata and extensible limits are JSON objects; core identity, permission,
task/report/verdict and execution fields are typed. This does not constrain a
model's reasoning or make tool content trusted.

An incompatible runtime result returns `isError` with `invalid_tool_result` and
no parser issues/rejected payload. **Effects may already have occurred** before
output validation: inspect task/computer state before any deliberate retry.
Runtime authorization and input checks still precede execution. See
[SDK schema contracts](https://ts.sdk.modelcontextprotocol.io/v2/advanced/schema-libraries)
and [official MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).
`check --connection /absolute/private/file.json` accepts named discovery and
structured observations without effects; [recovery](RECOVERY.md) explains limits.

| Tool                 | Access          | Control               | Purpose and principal input                                                                                                                                                               |
| -------------------- | --------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `computer_info`      | read/work       | none                  | Identity, guest OS, capabilities, limits, network, Teach and current lease. Empty input.                                                                                                  |
| `browser_snapshot`   | read/work       | none                  | Visible main-frame text, actionable selectors and page IDs; optional `pageId`.                                                                                                            |
| `desktop_screenshot` | read/work       | none                  | PNG of the guest desktop, never the host screen. Empty input.                                                                                                                             |
| `files_list`         | read/work       | none                  | Contained workspace directory; `path` defaults to `.`.                                                                                                                                    |
| `files_read`         | read/work       | none                  | Regular UTF-8 workspace file at `path`.                                                                                                                                                   |
| `workflow_list`      | read/work       | none                  | Saved demonstrations/procedures for this computer. Empty input.                                                                                                                           |
| `workflow_get`       | read/work       | none                  | Saved procedure, review state and revision by UUID `id`. Pending proposals block reuse.                                                                                                   |
| `task_list`          | named read/work | none                  | List only requests assigned to this connection. Empty input; creates no task or attempt.                                                                                                  |
| `task_get`           | named read/work | none                  | Read assigned request/attempt/report and owner verdict by task UUID `id`.                                                                                                                 |
| `task_start`         | named work      | obtains attempt lease | Activate queued task UUID `id`; bind one attempt to this grant/session/boot/lease. Same running activation is idempotent; terminal tasks cannot restart.                                  |
| `task_finish`        | named work      | bound attempt         | Task UUID `id`, `outcome` success/failure/uncertain, factual `summary`, optional `evidence` references. Save report, then release only the attempt lease. Owner verification is separate. |
| `control_acquire`    | work            | obtains own lease     | Legacy claim/renew fails busy without takeover. Named work must first use `task_start`; cannot bypass assignment. Empty input.                                                            |
| `control_renew`      | work            | own lease             | Renew this session's current lease. Empty input.                                                                                                                                          |
| `control_release`    | work            | own lease             | Release this session's lease and cancel its active command. Empty input.                                                                                                                  |
| `browser_action`     | work            | own lease             | `action`: `navigate` + `url`, `click` + `selector`, `fill` + `selector`/`text`, or `press` + `key`/optional `selector`; optional `pageId`.                                                |
| `desktop_action`     | work            | own lease             | `action`: `move`, `click`, `scroll`, `type` or `key` on the focused Linux guest window.                                                                                                   |
| `terminal_run`       | work            | own lease             | Guest Bash `command`, relative workspace `cwd` (default `.`), `timeoutMs` (default 10,000).                                                                                               |
| `files_write`        | work            | own lease             | Replace/create regular workspace UTF-8 file with `path` and `text`; parent must exist.                                                                                                    |
| `workflow_analyze`   | work            | none; owner consent   | Sample saved video/trace by UUID `id`; optional `atSeconds` array. Returns evidence for the external agent to interpret.                                                                  |
| `workflow_propose`   | work            | none; owner consent   | Save a draft using UUID `id`/`expectedRevision`, `procedure`, `expectedResult`, `uncertainties` and optional task `parameters`. Cannot approve or execute it.                             |

The seven base observation tools and named `task_list`/`task_get` need no lease.
Analysis/proposals require work access and owner consent, with no task or lease.
Four effect tools require an owned lease: browser input, desktop input, terminal
and file writes. Named work additionally requires its running owner-assigned
attempt; `task_start` takes control. Legacy acquire retains its untracked flow.
Renew/release require the current session's lease. The bridge renews every 20 seconds, against
a 90-second runtime TTL. Human takeover cancels/drains the old operation before
granting control. Cancellation cannot undo an already completed external effect.

### Limits that change how an agent should work

- Files: relative contained paths up to 1,024 characters; symlink/special-file
  access and hard-linked writes rejected. Reads/writes are bounded to 256 KiB;
  at most 1,000 directory entries. No dedicated mkdir/delete/rename/binary tool.
- Terminal: unprivileged guest UID 1000, command up to 8,192 characters,
  deadline 100–30,000 ms and 64 KiB combined output. The cwd is contained, but
  the shell can access the guest outside the workspace. There are no host mounts
  or host Docker socket. A container is not a VM or a hostile-code sandbox.
- Browser: HTTP/HTTPS navigation, selectors up to 500 characters, fill text up
  to 8,192 characters; 5-second selector and 15-second navigation deadlines.
  Snapshot text is capped at 12,000 characters and 100 actionable elements in
  the main frame. There is no arbitrary-JavaScript or dedicated iframe tool.
- Desktop: native 1280×800 coordinates; click left/middle/right once or twice,
  scroll 1–10 steps, single-line text up to 1,024 characters and supported named
  keys/chords. Return/Tab are separate key actions. No dedicated drag, held-key,
  clipboard or raw window/display selector. Recheck focus and fresh screenshots.
  A screenshot is bounded to 3 MiB. A delivered input does not prove its effect.
- Analysis: one extraction per computer, up to three timestamps per call in
  the 0–300 second range, PNG samples at most 640×400 / 512 KiB each. Additional
  calls can request missing moments. Sampling can miss actions; mark uncertainty.
  Proposal limits are 12,000 characters for procedure, 1,000 for expected result
  and 5,000 for uncertainties. Use the analysis `sourceRevision` to submit a
  draft; use the published top-level `revision` to reuse an owner-reviewed task.
- Network: isolated/offline is the default. Internet mode also permits reachable
  LAN/host services; it is not a domain allowlist. A skill cannot enable networking.
- Assignment: name/goal/result/scope limits are 120/4,000/2,000/2,000 characters.
  Reports have a nonempty summary up to 2,000 characters and at most ten nonempty
  evidence references, each up to 500 characters. References are text, not
  automatically opened proof. One attempt belongs to each request; retries need
  a new owner assignment, never automatic effect replay.

Canonical schemas: [catalog](../src/catalog.js), [assignments](../src/operations-contract.js),
[desktop input](../src/desktop-contract.js). Discover current per-computer limits
with `computer_info`; these descriptions are not extra permissions.

## Prompts and identity resource

| MCP surface                        | Access     | Behavior                                                                                                                                                                                               |
| ---------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `assigned-task`                    | named work | UUID `id` of an existing queued assignment. Freshly reads that connection's task/current method and prepares its pinned request; creates no assignment and takes no lease.                             |
| `computer-task`                    | read/work  | `goal`, `expectedResult`, optional `scope` and `intent` (`plan` default). Named connections reject execute; saved assignments authorize execution. Legacy work can prepare untracked execute requests. |
| `taught-workflow`                  | read/work  | UUID `id`, optional UUID `expectedRevision` and `intent`. Checks ready/reviewed revision; defaults to plan. Named execute requires a saved workflow-pinned assignment; read rejects execute.           |
| `analyze-demonstration`            | work       | UUID `id`. Instructions to inspect authorized evidence and save a draft, never perform the demonstrated task. Consent is checked by the tools.                                                         |
| `computer://<computerId>/identity` | read/work  | One JSON resource with current pinned identity, runtime capabilities and limits.                                                                                                                       |

Retrieving a prompt runs no task and obtains no lease. The client must expose
prompt selection or send the prepared text to its agent. MCP protocol tools
operate independently of whether a client installs an Agent Skill.

## Two kinds of skill

**Operator:** [sendtry-computer](../skills/sendtry-computer/SKILL.md), version 10.
Teaches the agent identity/access checks, observation, leases, narrow tools,
verification, recovery and Teach analysis. Download/CLI output does not install
it. Follow the selected harness's project skill path and verify discovery.

**Taught task:** exported `sendtry-<task>-<id>/SKILL.md`, version 6. Contains the
owner-reviewed procedure and computer/workspace/workflow/revision pins. Export
requires a completed recording, saved review, observable expected result and no
pending draft. It preserves that task's local binding; it is not a portable grant
to operate any person's PC. Re-export earlier downloads after review changes or
to receive named-assignment/report guidance and the explicit post-activation check.

Proposals may include up to 16 task-level `parameters`, each a unique lowercase
`name` and a `description` of 1–300 characters. The owner edits/approves these
alongside the procedure. Published definitions drive new-input requests and
exports; older reviews retain the captured-action fallback. Empty definitions
mean no named inputs, not permission to infer secrets. No values/defaults or
automatic shell bindings are accepted. A review change advances its revision.

The folder/Markdown format follows [Agent Skills](https://agentskills.io/specification).
Format validation does not prove a model loaded the skill or follows it reliably.
See [actual client acceptance](CLIENT-VALIDATION.md) and
[harness task evidence](HARNESS-VALIDATION.md) for the tested clients, cases and limits.

## Execution recipes

For named work: owner saves a task for that grant → `computer_info` and
`task_list`/`task_get` → inspect current files/browser/display → `task_start` →
bounded effects and result inspection → `task_finish` with a factual report.
That completion releases only the attempt's lease. The owner independently
inspects and records a checked/rejected verdict. A busy lease means wait/report,
never take over a human or move the task onto the host.

For a reviewed task: `computer_info` → `workflow_get` with ready/reviewed/exact
top-level revision → obtain missing inputs and the owner's matching saved
assignment → `task_start` →
**another awaited `workflow_get` check** → first effect → inspect/verify → release.
Do not parallelize that check with navigation or any mutation. A changed review
requires a new assignment pinned to the current review. Runtime activation and
workflow mutation share a queue; a running taught attempt blocks method changes.
The active assignment/session/lease is checked for tracked effects. Report with
`task_finish`, including the workflow ID/revision and actual observed outcome.

For legacy shared work only, use `control_acquire` and `control_release` around
bounded work, retaining the awaited revision checks for taught reuse. It remains
unassigned; it cannot claim a named task/attempt. Legacy effects are still audited.

For teaching: owner takes control and records actions/optional guest video →
saves demonstration → reviews content and explicitly allows agent analysis →
external vision agent calls `workflow_analyze` → `workflow_propose` with the
returned source revision → owner corrects/parameterizes/reviews → export or
prepare a task request → a newly requested execution uses the recipe above.
There is no automatic training, internal vision model or blind replay runner.

Lifecycle/default selection, grant creation/revocation, assignment/cancellation,
owner verification, recording, consent/revocation, owner review,
video deletion, human takeover and Activity export belong to the owner/CLI,
not to agent MCP tools. Work credentials cannot approve their own proposals.

## Guarantees, evidence and remaining work

The server enforces scoped credentials, identity, leases, named assignment/attempt
bindings, contained file-tool paths and execution/media limits. A taught assignment
pins its exact ready/reviewed revision and prevents method changes while running.
Task prose, fresh observation and actual outcome verification remain **agent/owner
responsibilities**; an assignment cannot make external programs/pages immutable.
Owner video
consent applies to work connections for that workflow, not to one verified agent.
Activity records declared clients/sessions, trusted connection/task/attempt UUIDs
and operation outcomes. Explicit requirements, agent reports and owner notes are
private content in a separate operations store. Neither store establishes verified
human/model identity or immutable proof of a task result. See [the assignment contract](ASSIGNMENTS.md).

Ordinary tool results are JSON in MCP text; screenshots/analysis include image
content. Check `isError` and parsed results. For terminal, also inspect `exitCode`,
`stopped` and truncation. An accepted tool call, saved proposal or reviewed skill
is not proof of task success. Output schemas/`structuredContent` are not currently
published; they are a future interoperability improvement.

The [MCP annotations contract](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations)
defines advisory hints. Live browser observation, browser input, desktop input
and terminal are advertised open-world; this grants no authority or network
access. Local screenshot/files/workflow evidence still contains untrusted data.

The historical 15 October audit corrected those hints and aligned exported skills/prepared
execution requests with the operator's post-acquisition review check. Discovery
contracts exercise actual SDK stdio read/work tools, prompts and resource identity
against a deterministic runtime double. Live guest acceptance is recorded in
[validation](VALIDATION.md#15-october-2026--tool-and-skill-audit).

Named grants/revocation and bounded saved task attempts are now implemented;
the separate [new two-PC acceptance](ASSIGNMENT-VALIDATION.md) records actual
Claude/Codex named analysis/execution and owner verification. Remaining work
includes schema-backed results, checkpoint/resume for long work, broader real
acceptance of assignment/revocation/recovery, verified actor identity/task evaluation, more task pilots
and public packaging/support gates. See [readiness](READINESS.md). Existing
evidence supports a working private MVP, not arbitrary tasks, every model or
isolated macOS/Windows guests.
