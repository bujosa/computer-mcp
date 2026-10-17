# Architecture

## Product boundary

Distribution does not expand computer authority. See [distribution decisions](docs/DISTRIBUTION.md).
The trusted owner installs/creates/starts explicitly; stdio connects only to a
saved pinned computer. `src/metadata.js` reads fixed installed package metadata
for CLI version and MCP initialization (technical name, Sendtry title, version,
description and repo URL), independent of cwd/state/Docker. VS Code configuration
is another pure serializer of the same pinned connection, with no editor writes.
The npm file inventory excludes local state/artifacts; `npm-shrinkwrap.json` is
the single source/installed dependency lock used by Docker. Registry metadata is
a non-published template, separate from the runtime protocol and provisioning.

**Sendtry Computer** (`computer-mcp`) supplies a computer to an existing agent harness. It does not own
inference, chat history, bots, routines, billing, connectors or cloud accounts.
The implemented adapter is a dedicated Linux Docker container with a local
owner console. Host OS and guest OS are separate properties. Native, VM and
remote adapters are design seams, not advertised implementations.

## Modules and dependency direction

| Module                                                                  | Responsibility                                                                                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/cli.js`, `config.js`, `computers.js`, `docker.js`                  | Trusted host lifecycle, local state, explicit Docker context and resource ownership checks                                            |
| `src/mcp.js`, `client.js`                                               | Official MCP stdio transport, session identity, read/work credentials, guest HTTP requests and heartbeat/cancellation                 |
| `src/catalog.js`                                                        | Shared Zod argument contracts and tool metadata; guest repeats validation at its trust boundary                                       |
| `runtime/server.js`                                                     | Authenticated private control API, same-origin loopback console, identity enforcement, authorization, screenshots and WebSocket proxy |
| `runtime/lease.js`                                                      | One exclusive per-computer writer, generation, expiry, mutation serialization and cancellation                                        |
| `runtime/audit.js`, `audit-http.js`, `src/audit-contract.js`            | Root-only SQLite session/action/control history, allowlisted metadata, bounded retention, owner reads/exports and declared MCP labels |
| `runtime/relay.js`                                                      | Offline-mode TCP relay from loopback publishing to the internal guest; fixed destination, no credentials, API, files or guest egress  |
| `runtime/desktop.js`                                                    | Authorized binary RFB WebSocket bridge with backpressure, bounded frames and control revocation                                       |
| `runtime/desktop-input.js`, `reset-input.py`, `src/desktop-contract.js` | Bounded Linux guest input, native geometry/key contracts, unprivileged fixed processes and held-input cleanup                         |
| `runtime/browser.js`, `recorder.js`                                     | Persistent visible Chromium, bounded actions, browser inspection and untrusted recorder input                                         |
| `runtime/process.js`                                                    | Unprivileged command process groups, reduced environment, output/deadline limits                                                      |
| `runtime/files.js`, `file-service.js`, `file-worker.js`                 | Workspace paths and limits; perform filesystem operations in a short-lived UID-1000 child                                             |
| `runtime/store.js`, `teach.js`                                          | Atomic versioned identity/workflow persistence, event sanitization and reusable Markdown                                              |
| `ui/`                                                                   | Human desktop, file explorer/editor, bounded terminal and teaching controls; no model features                                        |

`src/diagnostics.js` supplies read-only owner prerequisites and capacity checks.
It accepts no-computer setup diagnostics, checks the saved context for selected
PCs, and verifies ownership before reading a running guest's filesystem capacity.
Stopped guests remain stopped. Host free space and unmeasured guest capacity stay
distinct; results never imply runtime, harness or task readiness. The command has
no MCP exposure, resource cleanup or schema/state writes.

Diagnostics separately warn about a non-ASCII **source checkout** path: some
BuildKit session headers reject it even though Node/MCP accepts Unicode paths.
The known transport rejection adds an ASCII-checkout recovery hint, retaining
explicit computer state. No automatic source/state copy or cleanup is performed.

Host lifecycle is not exposed as an MCP tool. An agent using these tools cannot
ask the bridge to start another computer, change Docker context, bind a host path
or grant native screen/accessibility permissions. The CLI is a trusted owner
process with Docker-daemon authority; agents launched with an unrelated host
shell retain whatever authority that harness already gave them.

Desktop helpers clear their entire inherited environment before dropping to UID
1000; only PATH/HOME/DISPLAY/LANG are supplied. Work/owner credentials remain in
the root control process. This also protects against same-UID `/proc` reads.
Built image tags are per computer UUID, so another checkout's build cannot move
the image tag used by an existing computer. Updating a running guest requires
an explicit `start --rebuild`; persistent identity and volume remain unchanged.

An HTTP response disconnect aborts the mutation's lease operation directly.
The separate operation-ID cancellation request remains session-scoped, but its
arrival order is not the only cleanup mechanism. Teach closes coalesce per
recording; a stale close cannot clear a later recording. Untrusted recorder URLs
are bounded before persistence. A closed browser is reopened by a leased
navigation without a stale page ID; reads alone do not relaunch it.

The control server owns graceful Chromium shutdown. Playwright's automatic
process signal handlers are disabled so they cannot race the server's profile
flush and force-kill a second close. Stop/restart tests assert the exact latest
saved browser note, not merely the existence of profile files. Forced termination
or a host crash can still lose browser writes that have not been flushed.

`scripts/e2e.mjs` owns a fresh host QA catalog, runs both network modes through
the real CLI/guest/MCP boundaries and retains a private execution report. It
stops only its own guests after success/failure. It is separate from the manual
UI review described in [QA](docs/QA.md).

The design separates computer capabilities (MCP tools) from procedural knowledge
(skills). The owner's console configures the existing bridge and exports existing
Teach data; it does not create a second agent runtime or a Piblo backend.

`skill` reads the fixed repository asset `ui/skills/sendtry-computer/SKILL.md` and
prints it unchanged. It runs before catalog selection, needs no computer/Docker
and creates no state. The owner chooses where to save it in a harness project;
printing does not install a skill, approve an MCP connection or grant control.

The noVNC build applies a guarded local cleanup to its WebCodecs feature probe,
closing only that probe's frame/decoder. Dependency source is never rewritten;
an upstream mismatch fails the build. Attribution/source details are in
[reuse](docs/REUSE.md). Desktop transport/authorization and Teach capture remain
separate from this browser capability check.

`src/connection.js` owns credential-free command/argument generation and a strict
schema for owner setup metadata. `open` sends exact host paths and read/work
entries with its authenticated ticket request. The guest holds this metadata only
in the short-lived ticket and owner UI session, never in the agent workspace or
persistent control store. `/api/ui/connection` permits humans only, including
when an agent supplies valid work/read credentials. A subsequent CLI `open`
consumes its new ticket and updates an existing owner's session metadata.
The strings are displayed/copied, never executed by the UI/runtime.

The connection walkthrough maps client selection to official format/install
guidance and shows an effect-free first-task request pinned to the current two
UUIDs. A per-page random check filename is synthetic owner memory, not persisted
state. Copy performs no MCP call. The chosen agent receives the request and uses
its exposed tools/credential scope; read observation needs no lease, and work
changes acquire one. UI readiness/control hints derive from the existing info
response, not an invented harness connection status. Loss of owner authorization
clears host setup metadata and the request. This adds no endpoint, table, model
runtime or lifecycle permission.

`src/task-request.js` is an effect-free general task formatter shared with the
console bundle. It validates both UUIDs, read/work scope and bounded literal
goal/outcome/limits, and defaults to planning. The console keeps fields only in
page memory and clears them on view exit, authorization loss or identity change.
Copy awaits a fresh eight-second `/api/info` read and rejects changed pins or a
superseded owner/draft/view. It neither stores a job nor invokes an agent. The
harness receives the request and determines the tool sequence; existing runtime
boundaries enforce authority. Activity records actual tools, not a copied task's
success. See [task assignment](docs/TASKS.md).

The additive `computer-task` MCP prompt shares this formatter and its limits.
Its strict string argument schema accepts goal, expectedResult, scope and intent;
the callback awaits a fresh pinned info read before returning one user message.
Read access rejects execution. Retrieval performs no tool effect, workflow
lookup, job/storage write, model call or control acquisition. Prompt rendering is
owned by the harness; supported SDK retrieval is not automatic skill/model use.
Existing tools/prompts remain compatible. See [tasks](docs/TASKS.md).

UI connection-stage selection is local navigation, not installation/connection
evidence. The Teach guide derives its next action from the current info response,
saved workflow revision/draft/review and open form state; it adds no persisted
progress or task-success record. The recording banner and builder share the
existing stop/save handler, which returns to the saved skill. Review readiness,
frame consent, proposal availability and prepared handoff remain distinct. The
console never infers an analysis job or verified task from a click/download.

`ui/app.js` coordinates metadata reads with one current refresh task, its owner
identity and an eight-second abort deadline. Ordinary polls share that task;
completion of a guarded action cancels the older read and requests fresh state
before enabling another action. Only the current task can apply info and Teach
metadata; superseded failures cannot mark a newer state offline. Teach builder
and library navigation is disabled during guarded actions, and settings are captured and
disabled while start is pending. These are presentation safeguards. Runtime
credentials, lease checks, workflow revisions and cancellation still determine
authority; a fresh UI read never creates or extends a lease.

`runtime/skill.js` converts a completed workflow into an Agent Skills `SKILL.md`.
It generates a bounded kebab-case folder name with a workflow-ID suffix,
YAML name/description/metadata, owning computer/workspace identities, reviewed
revision, missing input parameters and the recorded procedure. The runtime
supplies its trusted volume identity; missing or foreign identities fail (409).
Version-3 exports instruct the agent to read the current workflow and require
ready/reviewed/exact revision before effects, without using the embedded text
as a fallback when the record changes or is unavailable. These are agent
instructions, not a revision lock on general action tools. Legacy workflows
without a revision use their workflow UUID, as the existing prompt does. No
stored workflow migration is needed; old downloads need a fresh export.
The version-7 operator and MCP server instructions make the acquisition boundary
explicit: await another ready/reviewed/exact top-level revision check after
acquiring control and before the first mutation, including navigation. This
check must not be scheduled in parallel with the action. Proposal provenance in
`review.sourceRevision` is distinct from the published `revision`. Neither
instruction creates an atomic execution guard or binds general tools to a skill.
Interrupted recordings cannot export (409). The
read endpoint `/api/workflows/:id/skill` uses normal authenticated workflow
observation authority. The static operator skill is public local UI content
without computer credentials. Neither export installs a skill nor grants control.

`src/skill-use.js` owns the shared, effect-free skill handoff contract and
parameter descriptions. The owner-only `POST /api/workflows/:id/use` accepts
only `expectedRevision` and `intent`; it requires a completed current owner
review, no pending draft and the computer owning the runtime volume. It returns
the trusted computer/workspace identity, saved revision, parameter descriptions
and a plan/execute request. It writes no workflow or supplied input data. Activity
records the fixed `skill.handoff` action with its workflow UUID only.

The console receives that module as a local esbuild bundle. It formats bounded
values as literal JSON in owner memory, checks the revision again immediately
before copying, and clears prepared values on close/navigation/authorization loss.
An in-flight preparation cannot repopulate a closed or changed panel. Copy/send
hands these values to the user's clipboard/harness; no automatic agent invocation
exists. The agent is instructed to recheck both identities and the exact current
review before effects; this is a procedural guard, while credential scopes,
workspace pins and leases remain the enforced execution boundaries.

The existing `taught-workflow` MCP prompt uses the same contract, defaults to a
plan and rejects execute for read credentials. `workflow_get` now includes an
explicit `reviewed` boolean, false for incomplete workflows or pending drafts,
even when read scope hides the draft body. Thus a previous review cannot silently
approve a newly proposed procedure. This is additive metadata; no state migration
or new MCP tool is required. Older guests need rebuild before the updated bridge
can safely use this prompt.

## Protocol and identities

MCP uses official `@modelcontextprotocol/server` v2 and its `serveStdio` factory.
The SDK handles modern discovery (2026-07-28) and legacy initialize (2025-era),
framing, tool validation, resources, prompts and protocol cancellation. Stdout is
reserved for MCP; lifecycle logs never run through stdio. The transport buffer is
512 KiB. Screenshot results are MCP image content, while other tools return JSON
text. Operational failures use `isError`; malformed protocol requests remain
SDK protocol errors. There is no public HTTP MCP endpoint or custom JSON-RPC
implementation.

A bridge process has one random session UUID, never accepted from tool
arguments. Requests to the loopback guest API carry the computer UUID, workspace
UUID, per-process session UUID and credential. The host pins the workspace on
its first authenticated start and refuses a subsequent mismatch. The persistent
guest volume also pins its owning computer UUID and refuses attachment to a
different computer. Initial authenticated `info` can bootstrap a missing pin;
all agent actions require the exact pin. A separate random boot UUID identifies
restart without changing persistent identity.

Setup generates separate work and owner credentials. `--access read` derives a
HMAC credential from the work credential with a versioned scope label; the guest
accepts it only for read tools. Read mode cannot acquire/release control or mutate
the browser, files or terminal. Agent credentials cannot establish human sessions.
The trusted host CLI's `open` command exchanges the owner credential for a
single-use, 30-second ticket and opens it in a URL fragment. The UI removes the
fragment immediately, consumes the ticket in an exact same-origin POST and
receives a random HttpOnly SameSite=Strict cookie. Tickets are never printed,
stored in browser storage or placed in request URLs. Human sessions expire after
12 hours of inactivity; restart invalidates them. Both credentials are in the
owner's private host state, so this separates protocol authority, not hostile
host users with access to that file. Host and Origin checks reject rebinding and
cross-origin requests; there is no wildcard CORS or remote login system.

## Local activity boundary

`runtime/audit.js` owns `/data/control/activity/activity.sqlite` (0600 in a
0700 root-only directory) using the Node 22.13+ built-in SQLite API. There is no
extra database service or telemetry endpoint. Computer/workspace/schema are
pinned again inside the database. A single synchronous writer commits small
transactions with `synchronous=FULL`, a DELETE journal and a 32 MiB database cap.
Reads use indexed, bounded queries; retention caps 20,000 events, 2,000 sessions,
20,000 control intervals and 90 days. Evicting a complete session removes its
dependent history together; active effects/control cannot be evicted. Four
reserved operation slots preserve takeover/cancellation/closure under ordinary
request saturation. One hundred observation slots are reserved for owners
independently of agents. No space for a new session or operation rejects it
before execution. SQLite remains an
experimental built-in API on the supported Node 22 line.

Authenticated owner/work/read authority determines actor kind and access.
`src/audit-contract.js` bounds optional descriptive client labels. MCP modern
metadata comes from each request's SDK envelope, including an explicitly
unknown client when `clientInfo` is absent; legacy metadata comes from
initialize. These labels never authorize effects. Events include actor/session,
computer/workspace (export envelope), boot, operation, fixed action, timestamps,
monotonic completed duration, outcome, fixed fault code and numeric exit code.
Workflow references are UUIDs only. No raw arguments/results/messages,
commands, paths, URLs, file data, screenshots, video, credentials or tickets
enter this database. Descriptive names are user-controlled metadata, not secrets.

An operation commits an attempt before execution and a result before the JSON
response. A response disconnect closes it as interrupted; a known cancellation
is distinct from a failed operation. Crash recovery marks unfinished effects
interrupted with unknown duration, never successful. Lease transition hooks
write exclusive control intervals; renew updates expiry without another event,
expiry is capped at its actual deadline, and read session closure cannot release
work control. Revocation cancels effects even when the audit writer fails.
Storage failure blocks new authenticated requests and desktop upgrades until
owner inspection/restart. Effects already performed cannot be rolled back if
the result commit fails. The owner must preserve a backup before recovering a
corrupt database; the runtime never silently resets it.

`/api/activity` and `/api/activity/export` repeat owner-only checks. Pagination
uses descending event IDs; exports are bounded snapshots with retention and
identity caveats, not an indefinite archive. Info polling, successful renewals,
activity reads and connection probes produce no action rows. Desktop records
only authorized connection intervals, never keyboard/RFB bytes. Each stdio
bridge closes its observation session on disconnect/signals; missing close
expires after five minutes without observed requests, except while control or
an operation is active. Owner observation sessions are independent from the
12-hour authorization cookie and survive only as private historical metadata.

This is an owner-editable local operational record, not tamper-evident compliance
storage, verified identity, billing, inferred human work or model-quality scoring.
Shared work credentials can claim a visible session UUID. A future per-agent
credential adapter must bind actors before stronger attribution is claimed.
See [activity semantics and export](docs/ACTIVITY.md).

## Computers, ownership and isolation

Setup assigns a UUID and saves private state outside the repo by default:
`~/.computer-mcp/computers/<name>/computer.json` (0600, parent 0700). Windows ACL
semantics must be reviewed before representing that mode as equivalent to a
POSIX private directory. Config output includes paths, not credentials.

`src/computers.js` owns the host-only version-1 catalog at
`<root>/registry.json` (0600, new directory 0700; default root
`~/.computer-mcp`). Entries contain a unique name, UUID and canonical absolute
state pointer, never credentials. The first creation/registration chooses the
default; `use` changes it only after revalidating the target's identity. An
explicit state wins over name/default, and generated stdio configurations always
pin that state. A busy/unreachable default does not cause reassignment to
another computer. Version-1 known legacy paths remain usable without an implicit
scan or migration. `register` adds existing owned product state idempotently.

Catalog writes use atomic replacement under an exclusive directory lock. Create
holds that lock across checking registered ports, a bounded loopback bind probe,
config creation and registration. Different local engines still reserve distinct
host console ports. The probe is not a persistent OS reservation: a new external
listener can win before Docker publishing, which must then fail. A config may
survive a failed catalog write; owner inspection plus `register --state` recovers
without resetting credentials. Crash-stale locks/corruption require inspection,
never automatic deletion/reset. The catalog is capped at 100 entries.

Availability probes read only the explicit registered endpoints, using pinned
identity and credentials, 1.5-second deadlines and four concurrent workers.
Reachable computers are ready/busy; authenticated startup and missing pins have
separate states. Unreachable does not assert stopped. There is no Docker-wide or
network discovery. `start` validates local engine and owned resources, then skips
Compose when the pinned runtime is already ready, preserving its lease and boot.
`--rebuild` is explicit recreation after updates, with normal session invalidation.

Owner console metadata may include a strict, credential-free catalog snapshot
and copyable CLI commands. It is loaded at `open`, not a live cross-computer API;
other entries are labelled registered. The UI never executes those commands,
changes the default, builds containers or receives a host-management credential.
`--root` is retained in owner management/reopen commands; generated MCP entries
need only their canonical absolute state. Catalog code is not copied into the
guest image. No new service, gateway or scheduler is introduced.

Docker commands always include the saved `--context`; only Unix socket/named
pipe endpoints and Linux engines are accepted. The default Docker context is
never changed. Names are `cmcp-<uuid>` and ownership labels bind container,
volume and network to that UUID. Start/stop inspect ownership and mounts before
changing resources. Start uses a local lifecycle lock; crash-stale locks require
owner inspection/removal. There is no delete, prune, migration or volume-reset
command. Stop preserves state. A port conflict fails rather than reusing an
unrelated computer.

The guest has a separate named volume and dedicated network, no bind mounts,
Docker socket, host network or privileged mode. CPU is limited to 2 cores,
memory to 1536 MiB and processes/threads to 256. Only `127.0.0.1:<port>:7070` is
published. `/tmp` is a bounded 256 MiB tmpfs, so X11 locks and ephemeral captures
cannot survive a container stop/start. Product data lives in the owned volume.
Internet mode publishes the guest console port directly. Docker Desktop does not
publish the internal-only guest's port; offline mode uses an owned, unprivileged
TCP relay on the guest's internal network and a separate console network. It
forwards exclusively to `computer:7070`, without credentials or volumes. The
guest remains on its internal network; the relay is limited to 0.25 CPU, 96 MiB,
16 PIDs and 32 TCP connections. Raw VNC and browser debugging are internal. Default networking is
Docker `internal`; internet mode is an explicit setup option and also allows
reachable private services. Neither Docker network mode is a portable hardened
network firewall. The host Docker operator remains trusted.

Root runs the narrow control service; its `/data/control` is 0700. Desktop,
Chromium, file workers and terminal children run as UID/GID 1000. The browser
profile/workspace are writable by that agent user. Filesystem path checks reject
absolute paths, parent traversal, backslashes, symlinks and special files, and
use canonical containment plus O_NOFOLLOW where supported. The child uid adds
an OS permission boundary for races: it cannot access root-owned control state
or host files. Node path checks are not equivalent to Linux openat2/dirfd-based
atomic containment; a malicious guest can still race paths to other readable
guest data. Terminal intentionally has access beyond the workspace inside the
guest. Container escape and a separate compromised host are outside this MVP’s
security guarantee; use a VM adapter for stronger separation.

File writes prepare a uniquely named, exclusively created sibling staging file,
write its complete content, synchronize and close it, then replace the destination
by rename. Existing destinations must still be writable regular single-link files;
ordinary permission bits are retained. A changed destination detected before
replacement fails with `file_changed`. Write/sync/rename capacity failures become
`storage_full` (HTTP 507) without truncating the destination or creating an empty
destination. Handled failures remove this operation's staging file. A killed worker
can leave a `.computer-mcp-write-<UUID>.tmp` staging file; no background deletion
occurs. Replacement changes the inode and does not preserve arbitrary ACLs/xattrs.
This provides complete-file replacement in the Linux guest, not path-race-proof
containment, power-loss durability of the directory, disk quotas or rollback of a
write whose response was lost. See the [Node file APIs](https://nodejs.org/docs/latest-v22.x/api/fs.html).

## Execution and leases

Each runtime owns one in-memory lease: owner, kind, generation and expiry
(90 seconds). Bridges holding a lease renew every 20 seconds. Claiming an
occupied computer fails for another agent. The human can take over: revoke the
previous generation, abort its command/browser action, close prior control VNC
sockets, wait for the active operation to finish and grant human control. Mutating
operations are serialized even for the same session. Reads can inspect while a
writer holds control. VNC view uses a server configured view-only; VNC input uses
a separate server, requires the human lease and is disconnected on control loss.

Commands run with a small non-secret environment and a validated workspace cwd.
Each command has a 100–30000 ms deadline and combined 64 KiB stdout/stderr limit;
reaching either kills the process group. Session cancellation includes a random
operation ID, so cancelling an unrelated same-session read cannot kill a
command. Lease expiry also aborts work. Browser actions use 5-second selector
and 15-second navigation deadlines; cancellation closes the affected guest tab
and creates a fresh tab if none remain. Effects committed before cancellation
are not rolled back, and cancellation is not exactly-once execution. Requests
are never automatically retried after ambiguous mutation failure.

`desktop_action` uses a fixed UID-1000 xdotool process on guest display `:1`,
with validated native 1280×800 coordinates, bounded clicks/wheel repeats and
single-line text via stdin. Key/chord names are allowlisted; no shell, user window
ID, held input or host display is selectable. It has a five-second deadline and
4 KiB discarded output ceiling. Lease cancellation kills that child. A separate
one-second UID-1000 Python/Xlib/XTEST helper releases all pressed keycodes and
buttons before the operation relinquishes serialization. Cleanup failure sets
ready=false, revokes control and disconnects desktop clients; restarting that
owned computer is recovery. Input already delivered is not undone. Tool success
means input delivery, not application/task success. See [desktop](docs/DESKTOP.md).
The helper runs with Python `-I -S`, excluding guest user-site hooks. Takeover
reserves the control transition, revokes the old lease/RFB channel, waits for the
active operation and cleanup, then grants the new generation. Competing claims
are rejected during the transition; RFB messages recheck the live generation.

Commands can daemonize outside their process group; full process-tree/cgroup
per-command containment is pending. The entire computer still has CPU, RAM and
PID limits. Disk is not volume-quota limited. Restart kills container processes,
invalidates leases/UI sessions and retains the browser profile/workspace. The
browser opens the local sandbox on startup; saved tabs are not restored as an
execution queue.

The owner terminal uses a unique operation ID and exposes its bounded deadline,
exit status and output truncation. Cancel sends the existing session-scoped
cancellation request and closes that exact in-flight HTTP request. The console
reports cancellation requested rather than asserting effects were undone; a lost
response requires inspection. An ordinary nonzero exit is distinct from completion
with exit zero, timeout and output limit.

## Data, Teach, media and agent analysis

The owned volume contains `/data/workspace`, `/data/home/browser` and
root-private `/data/control` (identity, workflow JSON and `videos/<UUID>.webm`).
Host credentials are supplied only to the root controller; child processes
receive a clean environment. Live screenshots are ephemeral PNG responses.

`teach.js` owns a human-leased recording with computer/task/owner identity,
timestamps and up to 200 sanitized steps. `recorder.js` captures trusted
main-frame text-input/click events and browser navigation, without values;
checkbox/radio changes are not mislabeled as fill. URLs lose query/fragment
and credentials. API file writes capture contained paths/content parameters;
terminal markers retain relative cwd and exit/stopped outcome, not commands or
output. Arbitrary desktop/iframe steps are not automatically converted to tools.

`store.js` serializes snapshot saves and read-transform-write updates using
atomic JSON replacement. Recording checkpoints every second. Save freezes
steps before awaiting media finalization and coalesces concurrent stops.
Lease loss, ten minutes or 200 steps saves an interrupted recording; restart
recovers recording/saving checkpoints. Startup video intent persists before
encoder launch. Cancelled startup becomes unavailable/failed, with cleanup
available; a recovered partial video may be incomplete. Last-checkpoint loss
and forced-kill muxer/profile loss remain possible. Workflow count is 100.

`video.js` owns one silent guest Xvfb capture. An unprivileged UID1000 ffmpeg
encoder writes stdout to the root controller's private file, with fixed display,
resolution/codec and no user-supplied path/filter/command. Limits are five
minutes, 20 MiB per clip, 200 MiB total storage; quota reserves a whole clip.
Stop targets only that child, gracefully then SIGKILL after two seconds.
Metadata includes computer/workspace/boot/recording identity, frames, bytes,
times and reason. Raw video play/range/download/delete are owner-cookie HTTP
operations; work/read credentials cannot fetch the WebM. Delete retains steps.

`analysis.js` owns per-workflow consent, revisions, agent drafts and discard
rules. `frames.js` decodes completed media into at most three 640×400 PNGs per
call, 512 KiB each and an eight-second deadline per child. UID1001 receives
media through stdin so UID1000 guest processes cannot inspect historical
video in a same-UID decoder. There is one extraction per computer, cancellation
on disconnect/revoke/delete/shutdown, and a final consent+revision check before
return. Numeric timestamps are bounded to the encoded frame estimate; samples
can miss actions. No durable frame cache or model client is added.

FFmpeg input decoding, filtering and output encoding each use one worker thread
in capture/extraction. A CPU quota does not reduce FFmpeg's detected host core
count; automatic codec/filter workers exhausted the former 192-PID guest budget
beside Chromium on AMD64. The same clip decoded with these bounds. File workers
also bound their V8/libuv pools to one each; the guest retains a finite 256-PID
budget for browser/helper headroom. CPU/memory/media limits and UID separation
remain intact. The later opaque file-worker failure is recorded without assuming
its exact cause. The updated budgets passed all 17 functional lifecycle phases
on Windows/Linux AMD64 and Linux ARM64; the separate Windows preservation-check
failure remains visible in [host QA](docs/HOST-VALIDATION.md).

The flow is: human starts optional video → demonstrates → saves → reviews
visible content → grants analysis → connected vision agent calls
`workflow_analyze` → agent calls `workflow_propose` with source revision →
owner edits the exact draft and expected result → confirms review → exports.
`src/mcp.js` returns normal MCP text/image blocks and an
`analyze-demonstration` prompt. The **agent's existing harness/model** performs
the reasoning. The UI grants access and copies a request; it cannot invoke a
model that has not connected. No cloud/gateway/billing or automatic training
exists. Frames and page text are untrusted evidence, not authorization.

Proposals never execute tools or approve themselves. An agent may propose
`parameters` (at most 16 unique lowercase names/descriptions,
no values/defaults). The owner edits/approves them with the exact draft/revision;
published `review.parameters` drives new-input packets and v5 exports. Missing
definitions preserve legacy captured-action inputs, an empty list explicitly
publishes no named inputs, and owner review `parameters: null` returns to the
captured fallback. Omission preserves the current proposed/reviewed list. Every
review change advances the revision; pending definitions never bypass the
existing review gate. The definitions are data, not executable bindings or new
authority. User values remain transient in the owner form/copied request.

Store checks optimistic
revisions inside its queue; approval also identifies the exact draft. A pending
draft blocks SKILL export and `taught-workflow` use. Previously approved edits
survive and can be restored by discarding it. Read credentials and work readers
after consent revoke do not see pending derived text. Owner-reviewed instructions
are published to read/work agents, with names/parameters, computer pin, lease
rules, expected result and corrections. Review is not proof of successful replay.

Existing recordings remain version-1 JSON with additive media/review/revision
fields. Old ready procedures now need owner review before export; legacy file
markers gain parameters and missing terminal cwd is explicitly unknown. No
workflow SQLite/FTS, scheduler, event bus, skill import/archive or automatic blind
replay is implemented; SQLite Activity is a separate metadata boundary. Owner
API desktop markers retain geometry and supplied text/key parameters; arbitrary
human noVNC input remains video evidence rather than a generic keylogger. Future
drag/clipboard/VM/remote adapters must honor
the same identity, permission and lease boundaries.
Owner API desktop input suppresses its equivalent Chromium recording events.
A per-field source marker also excludes delayed blur/change duplicates and is
reset by later owner input. Closing/navigating preserves the delivered desktop
step; a genuine correlation cleanup failure saves Teach as interrupted before
export can become available.

## Compatibility, rollout and future seams

No existing Piblo state is imported or migrated. This is a new private repo with
versioned fresh state. Incompatible schemas fail rather than silently resetting.
The optional owner catalog metadata extends the setup contract. Rebuild an older
guest with `start --rebuild` after updating the checkout; it may otherwise reject
the new fields. Ready `start` does not silently apply source/runtime updates.
Rollback can stop the owned computer and use a previous reviewed image/source
with a compatible schema; backups include the volume and private host config.
There is no production deployment, default-branch change or public package.

[Adapter contract](docs/ADAPTERS.md), [reuse assessment](docs/REUSE.md),
[security limits](SECURITY.md) and [validation record](docs/VALIDATION.md) record
implemented guarantees separately from future work. Native permissions, VM guest
services, remote authentication and open-source licensing/packaging require
separate design and authorization.
