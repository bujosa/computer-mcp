# Architecture

## Product boundary

**Sendtry Computer** (`computer-mcp`) supplies a computer to an existing agent harness. It does not own
inference, chat history, bots, routines, billing, connectors or cloud accounts.
The implemented adapter is a dedicated Linux Docker container with a local
owner console. Host OS and guest OS are separate properties. Native, VM and
remote adapters are design seams, not advertised implementations.

## Modules and dependency direction

| Module                                                  | Responsibility                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/cli.js`, `config.js`, `computers.js`, `docker.js`  | Trusted host lifecycle, local state, explicit Docker context and resource ownership checks                                            |
| `src/mcp.js`, `client.js`                               | Official MCP stdio transport, session identity, read/work credentials, guest HTTP requests and heartbeat/cancellation                 |
| `src/catalog.js`                                        | Shared Zod argument contracts and tool metadata; guest repeats validation at its trust boundary                                       |
| `runtime/server.js`                                     | Authenticated private control API, same-origin loopback console, identity enforcement, authorization, screenshots and WebSocket proxy |
| `runtime/lease.js`                                      | One exclusive per-computer writer, generation, expiry, mutation serialization and cancellation                                        |
| `runtime/relay.js`                                      | Offline-mode TCP relay from loopback publishing to the internal guest; fixed destination, no credentials, API, files or guest egress  |
| `runtime/desktop.js`                                    | Authorized binary RFB WebSocket bridge with backpressure, bounded frames and control revocation                                       |
| `runtime/browser.js`, `recorder.js`                     | Persistent visible Chromium, bounded actions, browser inspection and untrusted recorder input                                         |
| `runtime/process.js`                                    | Unprivileged command process groups, reduced environment, output/deadline limits                                                      |
| `runtime/files.js`, `file-service.js`, `file-worker.js` | Workspace paths and limits; perform filesystem operations in a short-lived UID-1000 child                                             |
| `runtime/store.js`, `teach.js`                          | Atomic versioned identity/workflow persistence, event sanitization and reusable Markdown                                              |
| `ui/`                                                   | Human desktop, file explorer/editor, bounded terminal and teaching controls; no model features                                        |

Host lifecycle is not exposed as an MCP tool. An agent using these tools cannot
ask the bridge to start another computer, change Docker context, bind a host path
or grant native screen/accessibility permissions. The CLI is a trusted owner
process with Docker-daemon authority; agents launched with an unrelated host
shell retain whatever authority that harness already gave them.

The design separates computer capabilities (MCP tools) from procedural knowledge
(skills). The owner's console configures the existing bridge and exports existing
Teach data; it does not create a second agent runtime or a Piblo backend.

`src/connection.js` owns credential-free command/argument generation and a strict
schema for owner setup metadata. `open` sends exact host paths and read/work
entries with its authenticated ticket request. The guest holds this metadata only
in the short-lived ticket and owner UI session, never in the agent workspace or
persistent control store. `/api/ui/connection` permits humans only, including
when an agent supplies valid work/read credentials. A subsequent CLI `open`
consumes its new ticket and updates an existing owner's session metadata.
The strings are displayed/copied, never executed by the UI/runtime.

`runtime/skill.js` converts a completed workflow into an Agent Skills `SKILL.md`.
It generates a bounded kebab-case folder name with a workflow-ID suffix,
YAML name/description/metadata, owning computer identity, missing input parameters
and the recorded procedure. Interrupted recordings cannot export (409). The
read endpoint `/api/workflows/:id/skill` uses normal authenticated workflow
observation authority. The static operator skill is public local UI content
without computer credentials. Neither export installs a skill nor grants control.

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
memory to 1536 MiB and processes to 192. Only `127.0.0.1:<port>:7070` is
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

Commands can daemonize outside their process group; full process-tree/cgroup
per-command containment is pending. The entire computer still has CPU, RAM and
PID limits. Disk is not volume-quota limited. Restart kills container processes,
invalidates leases/UI sessions and retains the browser profile/workspace. The
browser opens the local sandbox on startup; saved tabs are not restored as an
execution queue.

## Data and Teach flow

The one volume contains `/data/workspace` (agent files), `/data/home/browser`
(agent browser state) and `/data/control` (identity and workflow JSON). Config
credentials stay on the host and are supplied only to the root control process;
agent children receive a clean environment. Screenshots are bounded ephemeral
PNG captures returned through MCP, not a continuous stored recording.

Teach requires a human lease. It stores a version-1 recording with task ID,
computer ID, owner, name, goal, timestamps, status and up to 200 sanitized steps.
The main-frame recorder records trusted input events plus navigation metadata,
never executing input supplied by a page. Typed values are always replaced by
named parameters; password/secret-like inputs are skipped. URLs lose query and
fragment, and URLs with credentials are rejected. Paths may still contain
sensitive data. Console terminal commands are parameter markers and file writes
are path markers; arbitrary desktop application actions and iframe steps are
not captured.

The recording checkpoints every second, with serialized atomic JSON replacement
(temporary write, rename) under a root-only directory. Save transitions it to
`ready` and generates Markdown instructions. Lease loss or the ten-minute
recording/step limit saves it as `interrupted`; startup recovers checkpointed partial
recordings the same way. Up to the last checkpoint can be lost in a crash; this
is not a transactional video recorder. Workflow count is capped at 100. There is
no SQLite/FTS, background scheduler, event bus or cross-service delivery contract.

The harness reads `workflow_get` or the `taught-workflow` prompt, supplies missing
parameters and uses normal tools to follow the instructions. It must review
selectors/URLs and the user’s authorized effects. Recorded DOM/text remains
untrusted data; neither Teach nor a workflow grants new permissions. Automatic
blind replay, generic desktop recording/video and skill archive/import management
are pending. The skill library can search, review and download a completed
procedure as `SKILL.md`; exported instructions remain scoped to the originating
computer unless the owner reviews an adaptation.

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
