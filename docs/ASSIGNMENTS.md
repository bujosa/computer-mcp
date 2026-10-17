# Assigned computers, connections and task attempts

This slice extends the local owner/guest boundary. It does not create a cloud
account, scheduler, host gateway, inference runner or public MCP endpoint.
Computer selection remains a trusted host operation, and a running stdio bridge
stays pinned to its saved computer/workspace even when the catalog default changes.

## Identities and authority

- A computer/workspace owns its persistent Linux guest and private control data.
- A named connection is an owner-created read/work grant for that one computer.
  Its label is owner supplied; its random ID and credential identify the grant,
  not an authenticated human, subscription, vendor or model.
- The runtime stores credential hashes only. The trusted host saves a private
  connection file with the scoped credential and identity/port/access, without
  the owner's credential or shared work secret. MCP configurations contain only
  the executable and that file path, never a token.
- A session is a bridge process. Its runtime actor is namespaced by connection
  ID, so another connection cannot impersonate it by copying a session UUID.
- Declared harness name/version remain separate unverified metadata. Presence
  means recently observed requests, not a live socket, human attention or work.

Named work connections execute owner-assigned tracked tasks. Observation and
authorized Teach proposal/analysis do not require a task or lease. Effects
require the session's lease **and** its running assigned attempt. Legacy shared
work/read entries remain compatible and explicitly unassigned; their actions
remain audited but cannot claim another connection's task or identity.

## Assignment and execution

1. The owner selects a PC and creates a named connection through the host CLI.
   The owner console lists grants, observed sessions and current control, and can
   revoke a grant independently. The console never runs a host command.
2. The owner creates a task request assigned to one active work connection, with
   a goal, scope and observable expected result. A taught task additionally pins
   its exact ready/reviewed workflow revision. Trial values stay in the form and
   copied request, not in the task definitions or Activity.
3. The bridge exposes `task_list`/`task_get` for that connection's requests.
   `task_start` claims control and binds the request to that session,
   boot, lease generation and a new attempt ID. Duplicate starts by the same
   session return the same attempt; completed/interrupted requests never restart.
4. Effects fail before execution unless the grant, assignment, session and lease
   still match. Owner workflow changes and activation share the workflow store's
   queue. A running taught attempt blocks review/proposal/consent mutations;
   finish or cancel it before editing the method. The server enforces this
   binding for tracked effects; referenced programs and external pages can still
   change and need fresh inspection.
5. `task_finish` records reported success or failure with bounded summary and
   evidence references, then releases that attempt's control. It never records
   owner verification. The owner inspects
   actual output, then marks the report checked or rejected with a note.

Each task request owns one attempt. An explicit owner-created new request is a
retry, with new identity; the runtime never retries an effect or reassigns a task
to another connection automatically. Completing metadata cannot undo partial
guest effects. Repeated completion is idempotent only for the same session and
same outcome/payload; conflicting updates fail.

Revocation stops future calls, cancels that connection's running operation and
interrupts its attempt. It does not revoke another session's control. Takeover,
lease expiry/release, disconnect and runtime restart preserve interrupted or
unknown outcomes rather than inventing task success. Owner cancellation remains
available without the agent credential and drains active input before reuse.

## Persistence and audit

`runtime/operations.js` owns bounded root-only SQLite connections, presence,
requests and attempts, separate from the metadata-only Activity journal. Both
stores pin computer/workspace and fail closed; a task-store failure prevents new
tracked effects and cancels active work. Startup interrupts unfinished attempts
and closes old-boot presence. Corrupt or foreign state is never reset silently.

Task requirements, agent reports and owner review notes are explicitly submitted
private content, with their own limits. They are not copied into Activity, whose
new attribution fields contain IDs only. Commands, input values, file content,
video, tokens and raw errors still do not enter Activity. Historical events with
no named connection remain unattributed; no identity is invented during migration.
Local owner verification is an attributed assertion, not immutable certification
or automatic inspection by the server.

## Multiple computers and provisioning

`list` reports each registered PC independently; offline or rejected PCs remain
visible. Connection commands take the selected PC explicitly. Changing the
default never moves a running bridge, connection or request. Guests receive no
other PC's token, catalog or host lifecycle authority. Owner consoles show the
current PC and precise host commands for managing the catalog and connections.

An optional `init --subnet <private-/24>` configures IPAM only for a new owned
project. Isolated guests use two /25 networks; the console relay retains its
loopback port and the guest remains offline. Setup checks Docker subnets and
local interfaces for overlap. The owner must additionally check LAN/VPN routes;
this is not a route-discovery guarantee. The CLI never changes daemon pools or
prunes networks. Existing PCs without this field retain Docker-assigned subnets.

Official [Compose network IPAM](https://docs.docker.com/reference/compose-file/networks/#ipam)
and [internal networks](https://docs.docker.com/reference/compose-file/networks/#internal)
define these Docker settings. Application task tools are ordinary synchronous
MCP tools; this slice does not claim implementation of the separate
[MCP Tasks extension](https://tasks.extensions.modelcontextprotocol.io/).

## Acceptance boundaries

Contract checks cover credential isolation/revocation, copied session IDs,
read/work separation, wrong PC/grant/task, duplicate requests, stale revisions,
activation/edit races, lease loss, restart, failure/unknown outcomes, owner-only
review, limits and metadata privacy. Real acceptance uses new owned PCs with
separate credentials and actual Claude/Codex invocations; it verifies artifacts
independently. UI review remains manual at desktop and compact sizes. Results,
failures and any untested paths are recorded separately after execution.
