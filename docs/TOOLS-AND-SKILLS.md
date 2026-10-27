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
node src/cli.js config --root /absolute/private/catalog --name my-computer --access read
node src/cli.js skill
```

Use `--access work` in the generated configuration for execution. Reconnect
after changing access; verify the same computer/workspace IDs. See
[setup](SETUP.md) for creating a computer, client formats and skill installation.
Configuration/skill output does not register or start a harness automatically.
The `mcp` command is a stdio server launched by the harness, not an interactive
terminal UI. Its stdout is protocol only.

Use MCP `tools/list`, `prompts/list` and `resources/list` to inspect what this
connection exposes. **Read exposes seven tools; work exposes all 16.** Harnesses
may prefix tool names. `computer_info.capabilities` describes the runtime's full
catalog; it does not grant tools absent from this connection. Every connection
is pinned to one computer and workspace; changing the CLI default cannot redirect it.

## Tool inventory

All inputs have strict schemas. Empty input is `{}`. Runtime checks repeat
authorization, validation and identity checks; MCP annotations are hints for
clients, never the permission boundary.

| Tool                 | Access    | Control             | Purpose and principal input                                                                                                                |
| -------------------- | --------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `computer_info`      | read/work | none                | Identity, guest OS, capabilities, limits, network, Teach and current lease. Empty input.                                                   |
| `browser_snapshot`   | read/work | none                | Visible main-frame text, actionable selectors and page IDs; optional `pageId`.                                                             |
| `desktop_screenshot` | read/work | none                | PNG of the guest desktop, never the host screen. Empty input.                                                                              |
| `files_list`         | read/work | none                | Contained workspace directory; `path` defaults to `.`.                                                                                     |
| `files_read`         | read/work | none                | Regular UTF-8 workspace file at `path`.                                                                                                    |
| `workflow_list`      | read/work | none                | Saved demonstrations/procedures for this computer. Empty input.                                                                            |
| `workflow_get`       | read/work | none                | Saved procedure, review state and revision by UUID `id`. Pending proposals block reuse.                                                    |
| `control_acquire`    | work      | obtains own lease   | Claim/renew this session's exclusive control; fails busy rather than taking over. Empty input.                                             |
| `control_renew`      | work      | own lease           | Renew this session's current lease. Empty input.                                                                                           |
| `control_release`    | work      | own lease           | Release this session's lease and cancel its active command. Empty input.                                                                   |
| `browser_action`     | work      | own lease           | `action`: `navigate` + `url`, `click` + `selector`, `fill` + `selector`/`text`, or `press` + `key`/optional `selector`; optional `pageId`. |
| `desktop_action`     | work      | own lease           | `action`: `move`, `click`, `scroll`, `type` or `key` on the focused Linux guest window.                                                    |
| `terminal_run`       | work      | own lease           | Guest Bash `command`, relative workspace `cwd` (default `.`), `timeoutMs` (default 10,000).                                                |
| `files_write`        | work      | own lease           | Replace/create regular workspace UTF-8 file with `path` and `text`; parent must exist.                                                     |
| `workflow_analyze`   | work      | none; owner consent | Sample saved video/trace by UUID `id`; optional `atSeconds` array. Returns evidence for the external agent to interpret.                   |
| `workflow_propose`   | work      | none; owner consent | Save a draft using UUID `id`/`expectedRevision`, `procedure`, `expectedResult` and `uncertainties`. Cannot approve or execute it.          |

Seven observation tools need no lease. Analysis and proposals require work access
but no desktop lease. Four effect tools require an owned lease: browser input,
desktop input, terminal and file writes. Acquire obtains the lease; renew/release
require the current session's lease. The bridge renews every 20 seconds, against
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

Canonical schemas: [catalog](../src/catalog.js),
[desktop input](../src/desktop-contract.js). Discover current per-computer limits
with `computer_info`; these descriptions are not extra permissions.

## Prompts and identity resource

| MCP surface                        | Access    | Behavior                                                                                                                                                                    |
| ---------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `computer-task`                    | read/work | `goal`, `expectedResult`, optional `scope` and `intent` (`plan` default or `execute`). Prepares an identity-pinned request; read rejects execution intent.                  |
| `taught-workflow`                  | read/work | UUID `id`, optional UUID `expectedRevision` and `intent`. Checks the saved ready/reviewed revision and prepares a request; defaults to plan. Read rejects execution intent. |
| `analyze-demonstration`            | work      | UUID `id`. Instructions to inspect authorized evidence and save a draft, never perform the demonstrated task. Consent is checked by the tools.                              |
| `computer://<computerId>/identity` | read/work | One JSON resource with current pinned identity, runtime capabilities and limits.                                                                                            |

Retrieving a prompt runs no task and obtains no lease. The client must expose
prompt selection or send the prepared text to its agent. MCP protocol tools
operate independently of whether a client installs an Agent Skill.

## Two kinds of skill

**Operator:** [sendtry-computer](../ui/skills/sendtry-computer/SKILL.md), version 7.
Teaches the agent identity/access checks, observation, leases, narrow tools,
verification, recovery and Teach analysis. Download/CLI output does not install
it. Follow the selected harness's project skill path and verify discovery.

**Taught task:** exported `sendtry-<task>-<id>/SKILL.md`, version 4. Contains the
owner-reviewed procedure and computer/workspace/workflow/revision pins. Export
requires a completed recording, saved review, observable expected result and no
pending draft. It preserves that task's local binding; it is not a portable grant
to operate any person's PC. Re-export earlier downloads after review changes or
to receive the explicit post-acquisition check.

The folder/Markdown format follows [Agent Skills](https://agentskills.io/specification).
Format validation does not prove a model loaded the skill or follows it reliably.
See [actual client acceptance](CLIENT-VALIDATION.md) and
[harness task evidence](HARNESS-VALIDATION.md) for the tested clients, cases and limits.

## Execution recipes

For a fresh task: `computer_info` → inspect current files/browser/display →
`control_acquire` → bounded actions and result inspection → verify the requested
outcome → `control_release` in success/failure cleanup. A busy lease means wait
or report it, never take over a human or move the task onto the host.

For a reviewed task: `computer_info` → `workflow_get` with ready/reviewed/exact
top-level revision → plan and obtain missing inputs → `control_acquire` →
**another awaited `workflow_get` check** → first effect → inspect/verify → release.
Do not parallelize that check with navigation or any mutation. A changed review
requires a fresh owner-reviewed request/export. Report the workflow ID/revision
and actual observed outcome.

For teaching: owner takes control and records actions/optional guest video →
saves demonstration → reviews content and explicitly allows agent analysis →
external vision agent calls `workflow_analyze` → `workflow_propose` with the
returned source revision → owner corrects/parameterizes/reviews → export or
prepare a task request → a newly requested execution uses the recipe above.
There is no automatic training, internal vision model or blind replay runner.

Lifecycle/default selection, recording, consent/revocation, owner review,
video deletion, human takeover and Activity export belong to the owner/CLI,
not to agent MCP tools. Work credentials cannot approve their own proposals.

## Guarantees, evidence and remaining work

The server enforces scoped credentials, identity, leases, contained file-tool
paths and execution/media limits. Task scope, review-check ordering and expected
outcome verification are **agent instructions**. General action tools do not
atomically bind every effect to a reviewed workflow revision. Owner video
consent applies to work connections for that workflow, not to one verified agent.
Activity records declared clients/sessions and operation outcomes, not a verified
human identity or a certified task-level success score.

Ordinary tool results are JSON in MCP text; screenshots/analysis include image
content. Check `isError` and parsed results. For terminal, also inspect `exitCode`,
`stopped` and truncation. An accepted tool call, saved proposal or reviewed skill
is not proof of task success. Output schemas/`structuredContent` are not currently
published; they are a future interoperability improvement.

The [MCP annotations contract](https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations)
defines advisory hints. Live browser observation, browser input, desktop input
and terminal are advertised open-world; this grants no authority or network
access. Local screenshot/files/workflow evidence still contains untrusted data.

The 15 October audit corrects those hints and aligns exported skills/prepared
execution requests with the operator's post-acquisition review check. Discovery
contracts exercise actual SDK stdio read/work tools, prompts and resource identity
against a deterministic runtime double. Live guest acceptance is recorded in
[validation](VALIDATION.md#15-october-2026--tool-and-skill-audit).

Remaining product work includes schema-backed results, durable long tasks,
review-bound execution if strict per-effect guarantees are required, per-agent
grants/revocation, verified actor identity/task evaluation, more real task pilots
and public packaging/support gates. See [readiness](READINESS.md). Existing
evidence supports a working private MVP, not arbitrary tasks, every model or
isolated macOS/Windows guests.
