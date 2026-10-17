# Real harness learning and reuse evaluation — 17 October 2026 UTC

This is bounded manual acceptance with actual logged-in model clients, not SDK
replay or a general success-rate benchmark. A synthetic invoice-reporting task
combines files, a guest terminal and a local browser result. No customer data,
external accounts, public sites or native host desktop were used.

## Environment and task

| Component | Exercised configuration                                                                            |
| --------- | -------------------------------------------------------------------------------------------------- |
| Host      | macOS ARM64, Node 24.1.0; local Docker Engine 29.4.3 / Compose 5.1.3 with explicit `desktop-linux` |
| Guest     | One newly owned persistent Linux ARM64 desktop; isolated/offline network, loopback-only console    |
| Claude    | Claude Code 2.1.302, alias `opus`, observed model `claude-opus-5-5`, high effort                   |
| Codex     | Codex CLI 0.162.1, selected `gpt-6.1-sol`, medium reasoning                                        |
| Skills    | Actual project operator v8 and owner-reviewed taught exports v5; no global skill installation      |

The owner-side fixture supplies a small Python standard-library reporter and
synthetic CSVs in the guest. The program validates USD/decimal/status/duplicate
rules, computes integer cents, emits row errors and creates a new JSON file
without overwriting. The model did not generate that program from video.

Two owner-authenticated API demonstrations recorded a reporting step followed
by filling/saving the local practice note. Each had five trace actions and 26
video frames, about three seconds of encoded evidence; clips were approximately
106/117 KB. The visible video shows the browser, not terminal command/output.
Trace commands/typed values were omitted by design. The agents were explicitly
allowed to read the reporter, demonstration CSV and output as separate evidence.
These scripted owner fixtures exercise backend recording, not a claim that a
person manually performed the demonstration or a UI appearance test harness.

## Analysis → owner review → generated skill

Each client inspected actual PNG samples and the action trace, read the allowed
guest references, and submitted one proposal per analysis invocation. Additional
timestamps were requested. No control, terminal execution, browser input or
file writes occurred during analysis. Proposals stayed unreviewed.

Initial proposals exposed the input-model gap: semantic CSV/output/title aliases
appeared in prose while trial fields still reflected raw captured commands/text.
The resulting [design](LEARNING-DESIGN.md) adds optional proposed input definitions
and owner editing/publication. A second analysis pass exercised the new schema;
both clients proposed `csv_path`, `report_path` and `project_name` as actual
definitions, with derived note text and no stored values/defaults.

The parent reviewed the evidence/source and corrected the drafts through the
real owner UI. Corrections distinguished source-derived commands from video,
CSV record numbers from physical lines, and reusable success criteria from
analysis-only wording. Owner-required reload verification was added explicitly.
Confirmation published the exact drafts/inputs; frame access was then revoked
and fresh exports/request pins obtained. Native loaders consumed those exports
in subsequent new client sessions.

## Final model-driven trials

Each row below used a separate client invocation. Only current task values were
supplied: CSV path, new report path and project title. No raw command was given.
The runtime supplied the reviewed procedure. Successful executions acquired
control and **awaited** a successful exact-revision `workflow_get` response
before the first effect; trace ordering was checked independently.

| Scenario                                                 | Claude Code              | Codex CLI                | Independent evidence                                                                                                                     |
| -------------------------------------------------------- | ------------------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Use its own reviewed export                              | Passed                   | Passed                   | Five valid / three invalid records, 12,900 total cents; exact JSON and unchanged input hashes; current saved card after reload           |
| Use the other harness's reviewed export on the owning PC | Passed                   | Passed                   | Five valid / four invalid records, 10,750 cents; filenames with spaces, quoted comma/newline CSV fields; exact report/source/card checks |
| Reporter receives only invalid records                   | Expected failure handled | Expected failure handled | Exactly one guest report invocation exited 3, no timeout/truncation; no new output or browser input; old note and CSV unchanged          |
| Export/request pins an older owner review                | Stopped safely           | Stopped safely           | Only identity/workflow observation; no control acquisition, terminal run, browser input or report; old note unchanged                    |

Both actual operator/task bodies loaded in all eight final trials. Claude's
successful native `Skill` responses and Codex's successful host reads of only
the two project skill files were inspected. Each successful trial invoked the
reporter once, saved once, navigated again to reload, read the persisted card
and released its own lease. Both generated skills worked in the other harness
without rebinding to another computer.

Source SHA-256 hashes and exact JSON were checked by parent reads, using expected
values computed separately from the fixture rows. Browser card text was read
independently after the clients' reloads; actual screenshot calls supported
filled/reset-form checks. A zero CLI exit alone was never accepted as task
success. Negative cases were checked for absent output, unchanged note/source
and free control. These are four completed task runs plus four intentionally
blocked/failed cases, not eight successful business tasks.

## Failed setup and corrected interpretation

Earlier Claude invocations used `--restricted --setting-sources project`.
Project skills were absent from initialization and native calls returned
`Unknown skill`. One own-task attempt nevertheless completed using the saved
procedure fetched through MCP. Its files/card checks passed, but it **failed
exported-skill loading**. The first crossed-skill attempt stopped without effects.
Those attempts were retained and are not the passing final rows above.

The installed help and [official CLI contract](https://code.claude.com/docs/en/cli-reference)
state that restricted mode ignores user/project settings. Removing that flag
while retaining `--tools Skill`, exact allowed Skill/MCP names, strict MCP
configuration and project-only settings restored discovery. A separate read-only
probe loaded both full bodies and checked identity while another agent held
control; it did not acquire or release that agent's lease. Fresh own/cross
attempts then loaded the exports and passed independent verification.

No permission-bypass flag, global settings change, host shell tool in Claude or
native desktop permission was used. Codex used ephemeral/ignore-user-config,
read-only sandbox and the explicit local MCP entry. Its native shell remained
available to read project skills; the observed commands only read those files.
The prompt's read-only host scope is not an OS-enforced per-file sandbox.
Models were instructed to leave all unrelated repositories/machines read-only,
including BackChannelGroup/backoffice and the Piblo worktrees.

## Runtime and UI checks

- `npm test`: 94 contracts passed, zero failed/skipped; new behavior covers
  proposal/review gating, input validation, empty/reset/preserved definitions,
  legacy fallback, stale pins, exported inputs and literal transient values.
- `npm run test:teach-integration -- <new-owned-state> <private-artifacts>`:
  passed real WebM/PNG, consent/privacy/review, legacy captured inputs, pinned
  plan/execution, new supplied-file reuse, encoder cleanup and video deletion.
- Real HTTP checks rejected a default-bearing owner input definition with 400
  and unchanged revision; work credentials could not confirm review (403).
- Both actual v5 exports and operator v8 passed the local skill-format validator.
  This is separate from native loading and behavioral verification.
- Manual owner UI review exercised actual proposal/parameter editing and
  confirmation, trial field names/default plan, and desktop/compact layouts.
  An intermediate-width editor overflow was found and corrected using the
  review container's width. Unsaved review/input edits block use/export. No
  automated UI appearance/navigation/E2E suite was added.

## Resource and CI findings

A second new QA computer failed because Docker's predefined address pools were
fully subnetted. The first isolated QA computer succeeded; both clients used it
with separate workflows and sequential write leases. No daemon/global network
change or unrelated pruning was used. Only the failed run's newly created,
ownership-verified empty network was removed; no data volume was deleted.
The failed computer's saved setup remains unavailable, not silently redirected.
This is a provisioning failure, not a passing two-new-computer acceptance.

The existing review computer was separately checked idle/owned before rebuilding
it for this feature, retaining its computer/workspace IDs and data. New QA state,
media, screenshots, definitions, exact requests/exports, JSONL transcripts and
independent reports remain private/ignored under
`artifacts/teach-evaluation-20261017/` and the new private QA catalog. Credentials
were never put in prompts or committed. No remote QA machines, unrelated
containers, shared browser profiles or native host permissions were changed.

At David's explicit request, GitHub's `Check` workflow was disabled and verified
as `disabled_manually`. The proposed workflow file is manual-dispatch-only.
Local gates remain required; old billing-blocked jobs remain historical failures.
See [QA policy](QA.md#manual-validation-and-ci-policy).

## Practical limits

This verifies real clients/tool calls on synthetic data in one owned Linux
guest. It is not a matched performance study, broad business reliability rate,
fresh Windows/Linux-host evaluation, public installer certification or proof
that video alone recovers a method. Initial analysis used Claude's MCP tools
despite failed project-skill discovery; native loading was established separately
with the corrected probe and final execution trials.

The owner remains the reviewer; general tools do not atomically enforce a
workflow revision per effect or pin referenced program contents. There is no
automatic dispatch, model training, task-attempt verdict service or cloud bot.
The useful result is a reviewed method with real input fields, reusable by
compatible agents, with concrete evidence and explicit failure behavior.
