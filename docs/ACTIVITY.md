# Activity and local usage history

Start or rebuild your selected computer, then open its owner console:

```sh
node src/cli.js start --name my-computer --rebuild
node src/cli.js open --name my-computer
```

Open **Activity**. Select 24 hours, 7, 30 or 90 days and optionally a session.
Cards show recorded actions, exclusive control time, cumulative completed tool
time and sessions. The timeline shows action, access, declared client, UTC-backed
local time, duration and outcome. Select a session card to focus its history;
**Load earlier actions** pages through retained events. **Refresh** takes a new
snapshot. **Export JSON** downloads the selected range with all retained matching
events, session metadata and control intervals. Exports are rate limited to one
per ten seconds per computer.

## Attribution and time

- **Actor:** a bridge or owner console UUID scoped to this computer, access and
  runtime boot. Named bridge actors are namespaced by authenticated connection
  ID; copying a session UUID across grants does not impersonate its actor. An observation episode ends
  explicitly, on restart, or after five minutes without observed requests when
  no effect/control is active. A later observation gets a new historical session.
- **Client:** bounded name/version declared by the MCP harness. Modern MCP
  2026-07-28 identity is read from every request; legacy 2025-era clients declare
  it at initialize. Missing or unsafe labels stay unnamed. Varied labels in one
  episode are marked; each event retains its own declaration. The bridge adds no
  person, model-provider or model-name authentication.
- **Access:** owner/work/read is derived from the credential or owner cookie,
  independently of the declared label. Read sessions never hold control.
- **Assignment IDs:** sessions expose nullable `connectionId`; events expose
  nullable `connectionId`, `taskId` and `attemptId`, alongside `workflowId` when
  applicable. These UUIDs come from validated runtime bindings, not declared
  client metadata or arbitrary task body fields. Task IDs are not workflow IDs.
  A connection is an owner-created grant, not a verified person/model identity.
- **Observed span:** first to last observed request, not an exact connection
  duration, human attention, or productive work. Authorization cookies can last
  longer than an observation episode. Successful polling/heartbeat does not
  create actions, but can keep an existing episode recently seen.
- **Computer control:** time holding the exclusive lease, clipped to the
  selected range and expiry. It includes idle time while holding control. Human
  takeover ends the previous interval. A crash without a clean stop caps the
  uncertain final interval at the last persisted lease deadline.
- **Tool execution:** sum of completed tool durations measured with a monotonic
  process clock. Concurrent read durations can overlap. This includes tool
  validation and runtime work; it excludes stdout/input and does not measure
  inference cost. Interrupted operations recovered after a crash have unknown
  duration. Wall timestamps can reflect host clock changes.

Named grants have independent scoped credentials and per-grant revocation. Sharing
one grant's private file shares that grant's authority; separate grants prevent
cross-grant session impersonation. Legacy shared work/read remain explicitly
unassigned when enabled. Their actors are separately derived from each scoped
credential and session UUID; copying a named actor UUID cannot impersonate it.
Sharing a legacy credential still shares its authority. The owner can disable
legacy policy. Historical unassigned events keep null IDs; no person,
grant or task is invented for them. Verified users/models and tamper-evident
off-computer archival remain separate work. These metrics are not billable or
verified task completion.

## What is recorded

The owner sees authenticated tool attempts, completed/failed/cancelled/interrupted
outcomes, runtime start/stop, takeover, explicit session closure, desktop
connection intervals and Teach/skill review, consent, export and deletion events.
Named grant creation/revocation, legacy-policy changes and task assignment,
detail-read, cancellation and owner-verdict actions have fixed action names.
Successful owner grant/task-list polling creates no action. A denied authenticated
agent request for owner connection/task/attempt history can be recorded, as with
owner Activity access.
**Prepared a skill request** records successful or rejected owner handoff
preparation against the workflow UUID. It does not establish that the request was
copied/sent, identify its eventual agent, or certify a skill execution. Supplied
task inputs never reach this preparation endpoint or journal.
Terminal nonzero exits and time/output limits remain failed even when the HTTP
tool call completed normally. A known cancellation differs from an interruption
whose effects need inspection. A completed action does not prove a larger task
succeeded; use the reviewed skill's verification instructions.

The journal accepts fixed actions, actor/boot/operation/session/workflow UUIDs,
nullable trusted connection/task/attempt UUIDs,
timestamps, access, declared client labels, durations, fixed fault codes and
numeric terminal exit codes. It excludes commands, paths, URLs, typed values,
file content, results, raw errors, credentials, ticket/cookie values, IP addresses,
screenshots and video. Keep client labels descriptive and free of secrets.
Teach recordings are separate data with their own content/consent rules.

Saved task requirements, agent reports/evidence references and owner verification
notes are intentionally private content in the separate root-only operations
database. They are not copied into Activity. `task_finish` is an agent report;
the owner's checked/rejected verdict is a distinct assertion after inspecting the
actual result, not an inferred tool success or immutable certification.
Teach trial values are not automatically persisted in that task store or Activity.
[Assignments and privacy](ASSIGNMENTS.md#persistence-and-audit) describes both stores.

Unauthenticated HTTP attempts, failures before the SDK invokes a tool (including
malformed MCP messages), lifecycle probes, info polling, successful lease renewals,
owner activity reads and arbitrary guest actions outside the control API are
not action records. A failed request for owner history by an authenticated agent
is recorded. This feature is not a keylogger, shell session recorder or traffic
monitor. No history is uploaded anywhere by the server.

## Storage, retention and recovery

History lives at `/data/control/activity/activity.sqlite` inside the computer's
owned volume, inaccessible to guest UID-1000 tools. The parent directory is root
0700; the database is 0600. Stop/start and source rebuild retain it. History begins
when this feature is first started; earlier work is not reconstructed.
Schema-1 initialization validates the existing computer/workspace/schema before
transactionally adding nullable attribution columns. It leaves the schema marker
at 1 for older-image compatibility and never relabels historical sessions/events.

The version-1 database uses Node's built-in SQLite API (experimental on Node 22),
one runtime writer, FULL synchronous commits, a DELETE journal and a 32 MiB
database ceiling. Small transactions avoid rewriting a large JSON journal.
Retention keeps up to 90 days, 20,000 events, 2,000 sessions and 20,000 control
intervals. A removed session removes its associated history together. In-flight
effects and live control are protected; at most 64 ordinary operations/connections
are tracked concurrently. Four additional slots allow takeover, cancellation,
session closure, saving Teach and releasing control while the normal limit is full.
One hundred session slots are reserved for owner observation; agent saturation
cannot prevent a new owner console from opening. A full active session table
refuses new sessions. Retention runs periodically and on owner reads; an idle
stopped volume retains the previous
snapshot until the next start. Export includes oldest retained timestamp and a
count of pruned events so missing history is explicit. Download snapshots you
want to keep longer.

An action record is committed before an effect; its result is committed before a JSON
response. After an unclean restart, unfinished action records are interrupted with
unknown duration. Activity-storage failure blocks new API effects/desktop
connections and still allows process cancellation during shutdown. If an effect
occurred before its result could be committed, inspect the computer before
retrying. Storage corruption is an owner recovery operation: preserve the owned
volume/database first; the server never silently erases or resets history.
The operations store independently interrupts unfinished assigned attempts and
closes old-boot presence. A task-store failure also blocks tracked effects;
neither storage path automatically retries uncertain work.

The trusted host owner can modify this database or its exported JSON. It is
useful local operational evidence, not immutable compliance/audit certification.
Exports contain private session identifiers and client labels; store them with
the same care as other private evaluation artifacts.

## Contract validation

```sh
npm test
npm run test:audit-integration -- /absolute/owned/qa-state
npm run test:e2e -- --context desktop-linux
```

Use an idle owned QA computer for the focused integration contract. It performs
real commands, writes uniquely named practice files, creates a Teach recording,
checks legacy/modern MCP attribution, owner-only exports and copied read-session
IDs during a live work command. Artifacts stay ignored and private. UI appearance
is reviewed manually, separately from these backend/security contracts.
Those integration descriptions and prior reports are historical evidence. The
named-grant slice additionally needs live assignment/revocation/verification
acceptance; no new E2E result is claimed here.

Primary contracts: [Node 22 SQLite](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html)
and [MCP 2026-07-28 metadata](https://modelcontextprotocol.io/specification/2026-07-28/basic).
