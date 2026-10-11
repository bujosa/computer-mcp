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

- **Actor:** a random bridge UUID or owner console UUID. It is scoped to this
  computer, credential access and runtime boot. An observation episode ends
  explicitly, on restart, or after five minutes without observed requests when
  no effect/control is active. A later observation gets a new historical session.
- **Client:** bounded name/version declared by the MCP harness. Modern MCP
  2026-07-28 identity is read from every request; legacy 2025-era clients declare
  it at initialize. Missing or unsafe labels stay unnamed. Varied labels in one
  episode are marked; each event retains its own declaration. The bridge adds no
  person, model-provider or model-name authentication.
- **Access:** owner/work/read is derived from the credential or owner cookie,
  independently of the declared label. Read sessions never hold control.
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

Sharing a work credential shares authority, including the ability to claim a
session ID. The random ID supplied by the official bridge reduces accidental
collisions; it does not prove which person/model sent a request. Reliable named
users, independent credentials and tamper-evident off-computer archival remain
future adapter decisions. Do not use these metrics as billable or verified work.

## What is recorded

The owner sees authenticated tool attempts, completed/failed/cancelled/interrupted
outcomes, runtime start/stop, takeover, explicit session closure, desktop
connection intervals and Teach/skill review, consent, export and deletion events.
**Prepared a skill request** records successful or rejected owner handoff
preparation against the workflow UUID. It does not establish that the request was
copied/sent, identify its eventual agent, or certify a skill execution. Supplied
task inputs never reach this preparation endpoint or journal.
Terminal nonzero exits and time/output limits remain failed even when the HTTP
tool call completed normally. A known cancellation differs from an interruption
whose effects need inspection. A completed action does not prove a larger task
succeeded; use the reviewed skill's verification instructions.

The journal accepts fixed actions, actor/boot/operation/session/workflow UUIDs,
timestamps, access, declared client labels, durations, fixed fault codes and
numeric terminal exit codes. It excludes commands, paths, URLs, typed values,
file content, results, raw errors, credentials, ticket/cookie values, IP addresses,
screenshots and video. Keep client labels descriptive and free of secrets.
Teach recordings are separate data with their own content/consent rules.

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

An attempt is committed before an effect; its result is committed before a JSON
response. After an unclean restart, unfinished attempts are interrupted with
unknown duration. Activity-storage failure blocks new API effects/desktop
connections and still allows process cancellation during shutdown. If an effect
occurred before its result could be committed, inspect the computer before
retrying. Storage corruption is an owner recovery operation: preserve the owned
volume/database first; the server never silently erases or resets history.

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

Primary contracts: [Node 22 SQLite](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html)
and [MCP 2026-07-28 metadata](https://modelcontextprotocol.io/specification/2026-07-28/basic).
