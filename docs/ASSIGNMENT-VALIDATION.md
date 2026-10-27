# Named assignment acceptance — 17 October 2026 UTC

This record separates real model execution, runtime contracts and manual console
review. It is a bounded synthetic acceptance, not a reliability benchmark or
certification of every task, model, host or isolated guest OS.

## Environment and identities

The CLI host was macOS ARM64, Node 24.1.0, Docker Desktop Engine 29.4.3, with
every Docker operation explicitly scoped to `desktop-linux`. Two newly owned
isolated Linux ARM64 guests used separate projects, volumes, identities and
loopback console ports 17880/17881. Their optional private /24 blocks were
checked against Docker networks, interfaces and the observed host routes.
No daemon pools, global context, parent project, personal desktop permission or
unrelated container was changed. Both new PCs disabled legacy access by default.

| PC       | Computer ID                            | Workspace ID                           |
| -------- | -------------------------------------- | -------------------------------------- |
| assign-a | `717c5aff-6b3b-4771-9124-33765f0343e7` | `6ae2ac6c-9902-47da-b6c9-4988b1c7545d` |
| assign-b | `556db107-7adf-4683-9b8c-4754e0853c6c` | `05700c9f-5719-4934-a8b6-48dafe33f1f9` |

Named connection files and all raw traces/media remained private ignored local
artifacts. Harness configuration contained only executable/absolute scoped-file
paths. Model workers had no host computer-control tools. Codex's one host read
loaded only the installed project operator and taught SKILL.md files; Claude used
its actual Skill loader. No global harness configuration was installed.

## Real demonstration → proposal → review → assignment → verification

Each guest received a synthetic reporting program and CSV. The owner recorded
navigation, terminal execution and a saved local browser note, with optional
silent guest video. The two clips were 98,171/92,424 bytes and 28/27 frames.
The terminal command is omitted from the trace and invisible in the desktop
video; both agents explicitly distinguished separately authorized guest-file
inspection from visual evidence. Frame/trace timing remained approximate.

| Harness             | Model setting                                   | Analysis calls | Execution calls | Execution time |
| ------------------- | ----------------------------------------------- | -------------- | --------------- | -------------- |
| Claude Code 2.1.302 | `opus`, observed `claude-opus-5-5`, high effort | 9              | 22              | 103.693 s      |
| Codex CLI 0.162.1   | `gpt-6.1-sol`, medium reasoning                 | 9              | 25              | 56.185 s       |

Analysis used `workflow_get`, actual `workflow_analyze` images, allowed file
reads and `workflow_propose`; neither acquired control or performed effects.
Each proposed meaningful `csv_path`, `report_path` and `project_name` inputs.
The owner inspected/corrected the draft, including a fresh browser reload check,
then published it. This is assisted instruction authoring, not automatic model
training, an internal video model or unattended task dispatch.

Both execution runs loaded operator v9 and their reviewed taught v6 file,
matched the PC/workspace/grant/task, started a saved assigned attempt, and
**awaited a successful exact-revision workflow response after task_start before
the first effect**. Trace request/result ordering was independently checked.
The requests used new inputs rather than the demonstration totals.

Independent owner reads checked the exact result in both guests: four valid
two invalid rows, total 3,800 cents, paid 1,340, open 2,460; vendor totals Orion
1,340, Vega 2,020 and Luna 440; rejected records at rows 6 and 7. Source SHA-256
remained unchanged. The saved title, new report path and computed total persisted
after a separate owner browser reload. Both `task_finish` calls reported success
and released their lease; verification was initially null. Only after these
independent reads did the owner mark each attempt verified.
Claude made two expected missing-output file reads while checking the new
output did not exist; those tool errors are not hidden as successful actions.

| Harness | Task                                   | Attempt                                | Reviewed workflow/revision                                                      |
| ------- | -------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| Claude  | `a4353678-bdcd-4d90-84f5-37bcef47f50c` | `d3ac0b6d-e54c-47fe-bef2-757aaeb74991` | `bb5195ef-7ca8-4e7b-9ead-c6d0c1fddf09` / `87a1c57e-5caa-41d8-85bc-d9e25f144f94` |
| Codex   | `bfa6818b-c62a-4012-9294-b528625e976a` | `f57ca60b-2866-43e8-9632-df8bec91348c` | `c44b9d09-9ea1-49fd-9eb0-2f834c9f6cd9` / `0eb9e10b-e47c-4c60-a428-d0b220c0a6f4` |

## Runtime and security contracts

The real two-PC `scripts/assignments-integration.mjs` exercises host connection
creation and actual stdio tools/prompts, with separate read/work grants:

- New shared credentials rejected while owner lifecycle observation works.
- Named discovery: work 20/read 9. Prompt retrieval starts nothing; generic
  execution cannot bypass assignment. Owner routes reject work credentials.
- Wrong PC/grant/task and read execution fail. Two simultaneous attempts use
  independent leases and identically named files with different contents.
- Copying an actor UUID through read or explicitly enabled legacy credentials
  cannot interrupt the named writer. Another session cannot execute its attempt.
- Duplicate start/report and owner optimistic verification are checked. An old
  report cannot release a newer attempt's lease.
- Owner cancellation aborts/drains a real sleeping command; its late marker
  remains absent and a late success is rejected. Named revocation also aborts a
  running command, interrupts its attempt and leaves the other PC available.
- A taught running attempt blocks review/consent changes; a queued request with
  a changed published revision is outdated and cannot claim control.
- Activity exports include trusted connection/task/attempt IDs without submitted
  requirements or credentials. No historical attribution is fabricated.

A real owned rebuild retained PC/workspace IDs, files, reviewed workflows and
an earlier verified report. Its new boot interrupted a deliberately unfinished
no-effect attempt; restart/start and late finish were rejected for that terminal
request. The disabled legacy policy persisted and the second PC was unaffected.
The rebuilt guest exported the actual v6 taught skill through its API.

The full existing `scripts/integration.mjs` also passed on assign-b with legacy
access explicitly enabled for that compatibility fixture: 16 tools, modern and
legacy stdio, read/owner boundaries, identity, contained files, process limits,
PNG/browser, Teach/export and takeover/cancellation. The owner restored disabled
legacy policy in a finally block. This is runtime compatibility acceptance, not
an additional legacy model-quality trial or the entire lifecycle test:e2e suite.

Focused tests additionally cover both Store queue orderings, revocation while
activation waits, cancellation drain interleavings, SQLite identity/schema/capacity
fail-closed behavior, atomic private grant-file publication and audit migration.
The final local gates passed: 133/133 contracts, no failures/skips; format,
ESLint, syntax/UI build (71 modules) and private package inventory. No hosted
Actions job was dispatched; the repository Check workflow remains disabled.
A host `connection list --all` kept the available PC visible while the other
owned PC was deliberately stopped, then both were restored. The four exact
temporary model-project directories were removed; private evidence and both
owned QA PCs remain for inspection.

## Manual console review

T3's real owner console was reviewed at 1280×800 and 390×844 CSS pixels, with
no generated appearance/navigation/E2E UI harness. Named command preparation
and copying, refreshing a newly CLI-created grant, request-based presence and
explicit two-step revocation passed. Revoked history is collapsed so it does
not bury onboarding. A task was created/copied in the form, activated through
the real API, observed as In progress with the correct control label, reported,
and separately marked checked through the owner UI. Its summary keeps each
label paired with its value; a recorded verdict removes the unverified badge.
Compact detail/list navigation had no horizontal overflow at 390 CSS pixels.

A reviewed Teach method accepted new trial inputs, created a pinned named
assignment and copied its request. Independent API inspection confirmed the
inputs were not stored in task fields and no lease/execution started. The
owner then cancelled that unused trial through the two-step UI. Computers
showed both registered PCs/default and their host commands without claiming a
live cross-PC browser gateway. Take control/release and Activity attribution
were also inspected against the real guest. Rebuilding correctly invalidated
an old owner session; reopening through the CLI restored the console. The
corresponding 401 is an expected recovery event, not hidden as a successful poll.

The first Docker build omitted new source modules from its explicit COPY list;
that packaging failure was corrected and both actual guest builds passed. An
initial HTTP grant property collided with Node's request socket alias; it was
renamed to req.computerConnection and exercised by actual owner/named requests.
Two test-runner assertions were corrected (export route method and the existing
file-not-found status); they were not runtime product failures. The retained
local logs contain these iterations; final acceptance is the current-image run.

Final image inspection matched 18 relevant runtime/shared/UI/skill/build files
byte-for-byte against this checkout in **both** guests. Both had no control
lease, no active recording and legacy access disabled. Image IDs:

- assign-a: `sha256:21839579c5385795324d7f92c715c9125b04956543b2d3d1c443a07cd06f2fb8`
- assign-b: `sha256:992c70b19e4a456845c89ae7beea2317202896facd3aa9bd99281347363bbf6f`

## Boundaries

The real harness trials used the implemented named task/lease/revision binding;
the final follow-up additionally hardens legacy disable/revocation drain retries
and bridge heartbeat generation cleanup. Current-image contracts must pass before
handoff. These fixes do not create a new model-quality trial.

Windows/Linux host evidence elsewhere predates this slice. New assignment/UI
acceptance here ran on macOS hosting Linux guests; no new native host or isolated
macOS/Windows guest claim is made. Cursor's new assigned-task behavior, production
pilots, immutable audit archival, schema-backed tool results and large-scale
Teach evaluation remain untested/pending. CI stays intentionally manual/disabled;
there was no Actions dispatch, public package/release, merge or deployment.
