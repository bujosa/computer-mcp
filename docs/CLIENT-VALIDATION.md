# Named-client and recovery acceptance

Executed 14 October 2026 UTC. This supplements the earlier
[Teach/advanced-task evidence](HARNESS-VALIDATION.md); it does not replace it.
These are real model-driven CLI runs on one owned synthetic Linux guest, not
mocked agents, a broad success-rate benchmark or proof of every IDE/host path.

## Source, identity and scope

Host bridge/CLI: `210df79f33283d07b837dad9868ae8825aacb63d`, based on merged
`c20302db`. It adds `node src/cli.js skill`, printing the same version-7 operator
as the console without state, Docker or installation. The subsequent UI-only
Cursor guidance was reviewed after rebuilding; these model runs preceded that
rebuild and used image
`sha256:3a9887906c70bf5fc010bef623b315df301565d3bb9fd0d15b5ec704b26f88b8`.

- macOS ARM64 host, Node 24.1.0; explicit local `desktop-linux` context.
- Computer `a70f163f-1e9a-4604-b62b-cce24ddf4be0`, workspace
  `6af2848e-2c28-4d84-826e-7e7111bf1ec8`, private persistent Linux guest.
- Fresh projects under `/private/tmp/sendtry review é-*`; operator bytes obtained
  through the actual `skill` CLI and saved at each client's project skill path.
- Explicit pinned read/work MCP entries, no credentials in client configuration.
  Each run started with no lease/Teach recording. Parent read checks never
  acquired control or terminated another owner's session.
- Existing client subscription authentication; no keys or auth/config contents
  captured in committed evidence. Host file access was scoped to loading the
  project's operator; task effects used only this guest MCP. Native Mac, SER9,
  unrelated containers/repos and global MCP/skills settings were untouched.
- Bounded child runs: 240-second parent deadline and 2 MiB retained output cap.
  Raw model transcripts and synthetic artifacts remain ignored/private under
  `artifacts/client-closure-20261014/`, not committed recordings or customer data.

| Client          | Observed version/model                         | Registration and skill loading exercised                                                      |
| --------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Claude Code CLI | 2.1.299 / `claude-opus-5-5`, high              | Strict temporary MCP JSON, project setting source, actual `Skill(sendtry-computer)`           |
| Codex CLI       | 0.162.1 / GPT-6.1-Sol, medium                  | Per-invocation MCP, ephemeral read-only host sandbox, read of its `.agents` operator          |
| Cursor CLI      | 2026.10.12-d47ca18 / Claude Opus 5.5 300K High | Project `.cursor/mcp.json`, `.cursor/skills` read, sandbox enabled, explicit tool permissions |

Cursor used an Opus model too; three client integrations do not mean three
independent models. Native CLI inventories can include built-in/plugin names;
no unrelated connector was used. These runs do not certify all client-internal
filesystem/telemetry behavior or automatic skill selection from arbitrary goals.

## Setup failures and corrections

Cursor's first run stopped before model/guest work with **Workspace Trust
Required**. Trust was then scoped to the fresh QA project. The next run read the
operator but could not load the unapproved MCP server; `mcp list-tools computer`
confirmed that exact approval error. It stopped without a host-tool fallback or
guest mutation.

For the isolated acceptance, the only configured MCP entry was `computer` and
the invocation used process-local `--approve-mcps`, with guest MCP tools allowed
and host shell/writes/web/unrelated connector tools denied. No global enablement
was performed. Normal setup now recommends approving this **exact server**,
using `agent mcp enable computer` and inspecting `agent mcp list-tools computer`,
as documented in the [official Cursor CLI guide](https://cursor.com/docs/cli/mcp).
Do not broadly approve unrelated MCP servers in a normal project.

The corrected Cursor read run loaded the actual operator and used only
`computer_info`, `browser_snapshot` and `files_read`. Both IDs matched; the
existing report's `totalMinutes` was 510. No lease or task effect was requested.
Earlier Claude/Codex read/busy cases remain in the prior harness record.

## Actual Claude MCP prompt invocation

Claude discovered `computer-task` and invoked
`/mcp__computer__computer-task Inspect Plan Read-only plan` through its normal
headless command loader. This was not direct SDK prompt injection. It loaded the
operator, observed the connected guest and prepared a read-only plan; it asked
for the missing task scope instead of claiming execution. No lease/mutation.

This parser tokenizes arguments by whitespace: use the console or structured
SDK arguments for multiword goal/outcome/limits. Interactive TUI prompt-menu,
Cursor editor and Claude Desktop UI registration were not separately reviewed.

## Six fresh-input repetitions and three timeouts

All three clients reused the same previously video-derived, owner-reviewed task:
workflow `8ce6fdce-a5d8-4e5e-80ba-1bb38b3ec590`, published revision
`792ca339-09cf-406f-a152-83ec663f5bbb`. Each supplied two unique project/note pairs
on `http://127.0.0.1:7070/demo/`.

Transcript checks independently verified, per client:

1. Ready/reviewed/exact revision, free control acquisition, then a completed
   post-acquisition revision read **before** navigation or any task mutation.
2. Fresh selectors and supplied values; exactly one Save for each repetition.
3. A same-URL reload followed by the exact saved card/notes and reset form.
4. Own release before the next repetition; no cross-owner release.
5. Exactly one deliberate terminal command: write a unique started marker,
   `sleep 5`, then write a completion marker, with `timeoutMs: 1000`.

Every timeout returned `stopped: timeout`, `exitCode: null`, `signal: SIGKILL`,
`truncated: false`. A successful MCP transport response was not misreported as
command success. The models inspected partial effects and did not rerun it.
Parent read-only checks after the original sleep deadline confirmed the started
file, absent completion, exact final saved card and lease null for each client.
The fixture retains only its latest note; these checks do not claim a note history.

| Client | Corrected run artifact        | Final parent check (UTC) | Result                                                           |
| ------ | ----------------------------- | ------------------------ | ---------------------------------------------------------------- |
| Claude | `claude-repeat-1791950615096` | 04:06:30                 | Two saved/reloaded inputs; timeout stopped; own control released |
| Codex  | `codex-repeat-1791950790212`  | 04:09:34                 | Same checks passed                                               |
| Cursor | `cursor-repeat-1791950974748` | 04:14:49                 | Same checks passed                                               |

The first Claude attempt had a 22-turn QA cap: it saved/reloaded the first note
and filled, but did not save, the second before `error_max_turns`. Client close
released its lease. That attempt is **partial**, not counted among the six
completed repetitions. A fresh-input run with a 40-turn/$6 configured ceiling
completed; provider-reported cost was approximately $0.64. Turn accounting varies
between CLI and stream fields. No old partial Save was blindly repeated.

Evidence: per-run events/results, `trace-checks.json`, and the three
`*-independent.json` files. The trace verifier checks call/result order and actual
response content; the parent also reads live guest artifacts after each run.
Only one form/task family and two values per client were exercised. Changed
selectors, varied applications and matched untaught baselines remain unevaluated.

## Graceful named-client disconnect

An additional Claude run acquired its own free lease and began a unique guest
command: started marker, `sleep 25`, completion marker; deadline 30 seconds.
At 04:15:08.937 UTC the parent verified the exact owned CLI PID/command/project,
detached process group, started marker and absent completion, then sent SIGTERM
**only to that tester group**. The CLI exited 143; this was intentional termination,
not a successfully completed task or a hard-crash/SIGKILL test.

At 04:15:41.565 UTC, after the original sleep could have finished, parent reads
confirmed started data retained, completion still absent, no lease and Teach
inactive. The guest process did not continue after stdio client termination.
Evidence: `claude-disconnect-1791951289504/{result,termination}.json` and
`disconnect-independent.json`. Other named-client hard failures/network faults
remain separate acceptance work; SDK cancellation contracts cover their recorded
scope only.

## Retained owner Activity

Owner-only reads at 04:32:44 UTC retained the three repetition sessions and
Claude disconnect, including real start/end observations and control intervals:

| Session            | Declared MCP client/version/protocol    | Control time (ms) | Recorded terminal outcome | Closure reason |
| ------------------ | --------------------------------------- | ----------------- | ------------------------- | -------------- |
| Claude repetitions | claude-code / 2.1.299 / 2026-07-28      | 44428             | failed / timeout          | client_closed  |
| Codex repetitions  | codex-mcp-client / 0.162.1 / 2025-06-18 | 61755             | failed / timeout          | client_closed  |
| Cursor repetitions | Cursor / 1.0.0 / 2025-11-25             | 76934             | failed / timeout          | runtime_stop   |
| Claude termination | claude-code / 2.1.299 / 2026-07-28      | 14778             | cancelled / lease_lost    | client_closed  |

Cursor's declared MCP version differs from the independently observed CLI
version. Its session had no observed explicit session-end before the owned
rebuild, so the audit conservatively closed it at last-seen with `runtime_stop`;
the read probe similarly ended as `inactive`. Own lease release succeeded, but
we do not claim a clean session-end handshake for Cursor. These labels/intervals
are protocol metadata, not verified person/model identity, total reasoning time
or task verdicts. No prompts/commands/video/file contents were added to Activity.

## Independent Mac mini acceptance

Authorized SSH `bujosa@10.0.0.14`, existing strict host key, no native permissions
or Docker lifecycle changes. macOS 15.5 ARM64, Node 25.6.1/npm 11.9.0, local
Linux Docker Engine 29.2.1 through explicit `desktop-linux`.

A new private directory received only a Git archive of exact `210df79f`; 96
versioned files matched byte-for-byte. PASS `npm ci`, `npm run format:check`,
`npm run lint`, `npm run build` (54 modules/bundles), `npm test` (81/81,
zero failures/skips). The `skill` output matched 8915 source bytes even with no
Docker on the child PATH, and created no requested root/state.

Real SDK 2.3.1 stdio read/work acceptance passed in 1.087 seconds: discovery,
plan retrieval without lease, read execution refusal, pinned identity, own write/
read, `pwd`, browser inspection, real PNG, read-close preserving the work lease,
then own release/close. **New host bridge, intentionally older guest images**;
this is not a rebuilt remote guest or remote model-driven CLI evaluation.
Both remote QA PCs stayed running/idle; 35 unrelated containers, 32 networks and
the global context had identical before/after fingerprints.

Two QA report assumptions initially failed: Git archive mode 0664 versus an
assertion requiring 0644, and Node 25's summary format versus a TAP-only parser.
Only the report assertions/parser were corrected; product files and source
modes were unchanged. Gate logs had already exited zero; they were not hidden
or counted as product failures. Private evidence: `macmini-qa.md` locally and
the remote snapshot's `evidence/` directory.

Windows/Linux host lifecycle, IDE setup, broader real-world reliability, public
packaging/license and hosted CI remain outside this acceptance. See
[readiness](READINESS.md) and [support matrix](ADAPTERS.md).
