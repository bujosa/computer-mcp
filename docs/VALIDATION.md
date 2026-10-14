# Validation record

Private Sendtry Computer MVP reviewed on 10–14 October 2026 (UTC).
Results describe exercised paths; portable code and a CI matrix do not establish
platform support.

## Native Windows/Linux host QA (14 October, subsequent slice)

See [the full host record](HOST-VALIDATION.md) for exact source fingerprints,
versions, original failures, fixes, skips and complete authorized teardown.
PASS final format/lint/build and native contracts on both hosts: Thor 84/84;
Windows 81 passed, three POSIX-only skips, zero failures. PASS all 17 functional
lifecycle phases on each, including actual AMD64/ARM64 guest Teach media and
new-input reuse, audit, takeover and restart. Thor's runner passed completely.
Windows's runner **failed** its foreign-resource preservation comparison after
a concurrent foreign container disappeared; the failure remains visible.
All original pre-QA resources were retained at cleanup. Both temporary QA
directories, tools and owned Docker resources were removed and absence checked;
global contexts remained unchanged. Prior statements below about untested
Windows/Linux hosts describe those earlier snapshots, not this newer evidence.

PASS local follow-up on product code `b05a20a`: 84/84 contracts with no skips,
format/lint/build, real `test:integration` (16 tools, modern/legacy stdio,
takeover/cancel/read/identity/browser/files/Teach) and `test:teach-integration`.
The latter captured a real 19,529-byte WebM, decoded three analysis frames,
checked proposal/review/consent/private-media boundaries and reused supplied
file content through MCP; only its own clip was deleted. The fixed proposal is
protocol acceptance, not a new model-quality evaluation. Worker bytes in the
image match this checkout. Same owned UUIDs/data, healthy guest, 256 PID/thread
cap, no final control lease or active Teach. Current image:
`sha256:48ab3413305559ded1c86421c02a701f00013edccd7b3ef49df5a40a379aec8e`.
Manual T3 1280×800 live view, Take control and Release/reconnection passed;
no UI code or generated UI harness was added. An initial shared-builder registry
metadata wait was cancelled only for our build; a separate temporary public-pull
builder succeeded and its container/cache/configuration were removed. No cause
for the shared-builder wait was established; unrelated builds were preserved.

BLOCKED hosted CI on `b05a20a`: both push/PR Ubuntu/macOS/Windows runs completed
with zero steps and the account payments/spending-limit annotation. GitGuardian
passed. No billing or branch-protection setting was changed; these failures
are not reported as passing checks. Documentation follow-ups do not change
the runtime/CLI/tests validated above.

## Named-client setup, repetition and cleanup (14 October)

`node src/cli.js skill` now prints the exact operator asset before catalog
selection, without creating state, contacting Docker or installing settings.
PASS actual CLI contract, including an absent root with spaces/non-ASCII,
byte-preserving output, empty stderr and rejected unrelated options.
PASS `npm test`: 81/81, zero failures/skips, plus format/lint/build (54 modules)
for CLI commit `210df79f`. After the CRLF-portable assertion edit, PASS focused
`node --test test/computers.test.js`: 11/11. Final UI/static gates are recorded
below; the noVNC-only iteration did not add a UI test suite.

PASS actual Claude Code 2.1.299, Codex 0.162.1 and Cursor CLI
2026.10.12-d47ca18: project operator loading, six new-input form repetitions,
awaited exact review checks before effects, exactly one Save per input, reload
verification, three deliberately timed-out commands with no retry, and own lease
release. Parent reads checked each final card and partial files after the
original command deadline. PASS actual Claude `computer-task` discovery and
headless command invocation; no lease/effects for its plan. PASS graceful Claude
CLI SIGTERM/stdio cleanup: started file retained, completion absent after the
25-second sleep deadline, lease null. These are synthetic checks, not a success
rate or proof of hard-crash/all-client recovery. Initial Cursor trust/approval
failures and Claude's partial 22-turn attempt are retained in
[client acceptance](CLIENT-VALIDATION.md).

PASS independent Mac mini gates from an exact archive of `210df79f`: `npm ci`,
format/lint/build and 81/81 tests. Real SDK 2.3.1 read/work acceptance passed
against its intentionally older owned guest, with prompt/read-scope checks,
identity, file/terminal/browser/PNG and lease cleanup. Remote guest lifecycle was
unchanged; unrelated resources/context fingerprints matched. This is not an
updated remote image or remote model evaluation. Final noVNC/UI/docs edits were
not included in that remote snapshot.

Cursor's guide now explains exact-server approval independently of skill
loading. Manual T3 review at 1280×900 and 390×844 passed: readable guide, no
horizontal overflow, labeled selectors, next-step navigation, keyboard Tab to
Agent access. Desktop view and owner Take control/Release passed after rebuild.
Two QA locator requests used unsupported `exact` syntax, performed no action
and were corrected using snapshot-provided refs/valid role locators.

That review exposed noVNC 1.6.0's WebCodecs probe leaving a frame/decoder open.
The build applies a guarded cleanup to this upstream probe only, retaining
source/license pointers and not editing installed dependency files. Actual T3
browser diagnostic of the served bundle decoded one frame: one closed frame,
one closed decoder, zero decoder errors. The temporary diagnostic wrapper was
restored. Original console warnings preceded the patch; this is not a blanket
claim of leak-free browser codecs. No generated appearance/E2E UI harness.

PASS final `npm run format:check`, `npm run lint`, `npm run build` (54 modules
and bundles) and `git diff --check`. PASS
`npm run test:integration -- .computer-mcp/review-mvp artifacts/client-closure-20261014/mcp-final-image`
on the final rebuilt image: 16-tool real guest acceptance, modern/legacy stdio,
read/work/owner authority, identity pins, process/file bounds, takeover/cancel/
disconnect, browser/PNG, Teach/reviewed reuse and authorized RFB handshake.
Saved workflow `d86673e9-568f-42e7-9608-5f763adc3d63`; final own lease released.
Served `app.js`, noVNC bundle and operator bytes matched this checkout exactly.

The first rebuild repeated dependency downloads rather than reusing all cached
layers; their cache absence cause was not established. The final cleanup rebuild
reused those layers. Final owned image:
`sha256:dee61d8529e0a82cbd1099c0bcc3b575565019378e19ec2b1ca1bd9367794366`.
Same computer/workspace/volume; only explicit `desktop-linux` lifecycle was used.
Doctor at 04:24:21 UTC returned `ok`, 10% guest use and 155,891,904,512 bytes
available. A single read-only Docker snapshot, view session open/no task lease,
reported 306 MiB memory of 1.5 GiB, 1.72% CPU and image logical size
1,620,852,456 bytes. This is an idle observation, not a footprint/performance
benchmark or compressed download/incremental host disk measurement.

Hosted CI remains unable to start due to account billing/spending restrictions.
Windows/Linux host lifecycle and persistent editor/desktop UI setup remain
untested. Repository/package remain private/UNLICENSED; no release, production
deployment, global context switch or native host permission change.

## General task prompt and Grok reference (14 October)

The host stdio bridge adds `computer-task`, using the existing pure formatter.
Fresh info pins the request to its connected computer/workspace; default plan,
strict bounded string arguments and read/work policy match the console handoff.
No new tool, runtime endpoint, state schema, permission or model dependency.
Reconnect the bridge to discover it; no guest rebuild is needed for this slice.

PASS `node --test test/task-prompt.test.js`: three real stdio/SDK contracts using
an isolated loopback runtime double, including legacy/modern discovery and
retrieval, plan/execute preparation without effects, read execution refusal,
invalid/oversized/unknown arguments and fresh rejection of changed identities.
An initial assertion counted modern negotiation's legitimate session-close POST
as a prompt effect; inspection showed `/api/session/end`. The contract now
isolates retrieval after negotiation and asserts only two info GETs. This was a
test-boundary correction, not a product failure or suppression of task effects.

PASS `npm test`: 80 contracts, zero failures/skips. PASS `npm run lint`,
`npm run build` (54 JavaScript modules plus bundles), `npm run format:check` and
`git diff --check`.
PASS `npm run test:integration -- .computer-mcp/review-mvp artifacts/grok-reference-20261014/mcp`:
the actual owned Linux guest passed 16-tool contracts plus general prompt
discovery/retrieval through both negotiated protocols and read access. Execution
preparation acquired no control; read execution was refused. Saved fixture
workflow `3b2e7d8b-572f-4ee1-92a0-f5c34b5f0d6d`; final lease released.

Read-only doctor at 03:40:25 UTC returned `ok`, 9% guest use and 157,605,421,056
bytes available. Only the explicit owned `desktop-linux` guest was exercised;
no lifecycle, context, native permissions or unrelated resources were changed.
UI code was unchanged. New prompt menu/automatic use in named model harnesses,
Windows/Linux host lifecycle and Mac mini's new host bridge remain untested.
The earlier actual model runs are not counted as tests of this added prompt.

[The Grok reference](GROK-COMPARISON.md) uses first-party public docs, distinguishing
vendor descriptions from independently executed Sendtry paths. Grok's internal
recording-analysis pipeline and its runtime were not inspected/tested. Future
product priorities stay proposals; no public distribution or license change.

## Advanced task experience (14 October)

The general task handoff adds a pure shared formatter and owner page-memory
form: goal, observable success, optional scope, plan-first default and read/work
checks. Copy freshly validates both pins without storing/executing a job.
No MCP/API/schema/state migration or dependency changed.

PASS `npm test`: 77 contracts, zero failures/skips, including four new task
identity/access/literal-data/limit contracts. PASS `npm run lint`,
`npm run format:check`, `npm run build` (53 JavaScript modules plus UI bundles)
and `git diff --check`. PASS actual
`npm run test:integration -- .computer-mcp/review-mvp artifacts/advanced-experience-20261014/mcp-final`:
16 tools, modern/legacy stdio, real guest Chromium/PNG, read/work/owner authority,
identity, leases/takeover/cancellation, process/file bounds and Teach/reuse/RFB.
Saved contract workflow `7c271bde-852d-4320-88a8-3e1d643b3b59`.

PASS actual Claude/Codex advanced report tasks, independent source/report checks,
separate real project skill-loading probes and actual Claude command takeover.
Initial skill-discovery limitations and keyboard reload uncertainty remain
explicit in [the harness record](HARNESS-VALIDATION.md). Activity retained the
declared sessions and cancelled takeover outcome; no task-success record was
inferred from a copied request or model answer.

PASS manual T3 owner console at 1280×900 and 390×844: blank copy disabled,
plan default, fresh pinned requests, collapsed optional scope, readable wrapping,
44px task actions, read access forcing plan, preserved values across setup steps,
Clear/view-exit cleanup and actual copying. With a real info response held by a
temporary page hook, fields stayed disabled; a dispatched pagehide invalidated
the draft, then releasing the response performed zero clipboard writes and
restored the form. Hooks were restored. No UI test harness was generated.
The session header is opaque so scrolled content cannot bleed through it;
copy wording describes the handoff without claiming current execution status.

The owned guest was explicitly restarted after read-only ownership inspection:
it had been stopped with exit 255, no OOM; the cause was not established.
Final cached rebuild image:
`sha256:3a9887906c70bf5fc010bef623b315df301565d3bb9fd0d15b5ec704b26f88b8`.
UUIDs, volume, skills and history were preserved. Doctor at 02:18:49 UTC returned
`ok`, 62% guest use and 66,243,846,144 bytes available. Only this owned
`desktop-linux` computer was changed; all runtime operations passed that saved
context explicitly. At handoff the global context was observed as
`desktop-linux`, differing from the initially supplied `ser9`. No context-change
command was performed here; the source of that change was not established and
the global setting was left untouched.
Other guests, Mac mini, Linux/Windows hosts and isolated non-Linux guests were
not revalidated by this slice. Repository/package remain private/UNLICENSED.

## Actual Claude Code and Codex agents (13 October)

13 October follow-up on `c36a235`: real Claude Code 2.1.296 / Opus 5.5 and Codex
CLI 0.162.1 / GPT-6.1-Sol connected over stdio using temporary configuration and
existing subscription auth. Both passed work/file/terminal/browser/image/reviewed
task reuse, read-only refusal and human-held-control scenarios. Two new private
videos supplied actual sampled PNGs/trace; each model submitted a draft, the
parent reviewed/corrected it, revoked frame access, then the same harness reused
its own published procedure with new values and verified the saved result after
reload. Sessions closed with released leases. [The harness record](HARNESS-VALIDATION.md)
contains versions, declared protocol/client attribution, timings, IDs and limits.

Real behavior justified one narrow correction: operator version 7 and MCP server
instructions explicitly require waiting for the post-acquisition revision check
before any mutation. Claude's first reuse scheduled the check and navigation in
one assistant message; after clarification they were separate turns. Codex also
completed the check before starting navigation. No tool/API/schema/dependency
or runtime enforcement contract changed; workflow pinning remains agent guidance.
The distinction between published revision and proposal provenance is documented.

PASS fresh lint, build (51 modules plus UI/noVNC/shared), 73 backend/security
contracts and the skill frontmatter validator. The owned guest was rebuilt using
cached dependency/runtime layers; image
`sha256:617f4534086dbe345bb5745a7adfd772ab2da388c9d2e817bcbd59ec1ac42629`
retained UUIDs, volume, videos, skills and Activity. The served operator matched
the current source, SHA-256
`105c9758d0d7d4bd96882dbc1df367a4cfd81e270343f9ad42799346c3b88a20`.
Doctor at 04:57 UTC returned `ok`, 62% guest use and 66,333,708,288 bytes available.
No other computer, host permissions, global harness configuration or Docker
default context changed. Mac mini and other hosts were not revalidated here.
No UI appearance/E2E test harness or external inference service was added.
PASS final `npm run format:check`, `git diff --check` and real
`npm run test:integration -- .computer-mcp/review-mvp artifacts/agent-harness-20261013/mcp-final`
against the rebuilt owned guest: modern/legacy stdio and all 16 tools/contracts.
Saved workflow `3ba9d727-0aeb-4eee-aa47-349a128da810`; final lease was released.

## Control and Teach completion correction

13 October follow-up on merged `4752166`: a manual delayed-response check found
a real UI race. An old `/api/info` poll could keep **Control is free** visible
after successful Take while the actual human lease was active. The UI now
cancels the older read, waits for fresh state before enabling actions and ignores
superseded results/errors. Metadata has an eight-second deadline. Pending Teach
start captures and disables its settings; builder/library navigation is disabled
during guarded actions. Runtime/API/schema/dependency contracts are unchanged.

PASS `npm run format:check`, `npm run lint`, `npm run build` (**51 JavaScript
modules** plus UI/noVNC/shared) and `git diff --check`. The served app source
matches local SHA-256
`be4c319063c948ae950dc6e7bdc2a193b23658c4a9e5c1794c882d38f2832740`.

PASS `npm test`: **73 pass**, zero failures/skips. PASS fresh real
`npm run test:integration -- .computer-mcp/review-mvp artifacts/control-teach-20261013/mcp`:
modern/legacy stdio, 16 tools, credential/Host/Origin enforcement, identity pins,
exclusive leases/human takeover, bounded terminal and cancellation/cleanup,
contained files/symlinks, actual Chromium/PNG, Teach parameterized reuse,
stdio-close cleanup and authenticated RFB. Saved contract workflow
`60e1b68a-de5c-4502-ba4f-c6809ba22329`; final lease was released.

PASS actual T3 owner-console checks at 1280×800 and 390×844, with no generated UI
test harness. One-off page hooks delayed real responses without substituting
payloads. Take cancelled the older info signal, showed **You're in control**
and focused enabled Release while that packet remained held. A held Take reply
kept mutation actions disabled. An eight-second info timeout showed unavailable
state; restoring the request recovered the online desktop/free state. Finish
with an old info packet held saved a trace-only task, hid the recording banner
and focused `teach-next`. Hooks were restored after review.

PASS a real SDK stdio agent lease followed by UI **Take over**: the probe observed
the human lease, did not release another owner's lease and closed. Actual mouse
and keyboard through the live noVNC canvas typed `QA` in the owned Linux guest;
a settled guest PNG confirmed it. The first connection capture was black before
the frame arrived; subsequent canvas pixels and screenshots showed the desktop.
No native host desktop control or OS permissions were used.

PASS optional guest video → multimodal proposal → owner review → reuse for
**Verified video project note**, workflow `a80e347a-b4c8-414e-b1f5-9e331da66ef8`.
The silent WebM was ready (7,180,287 bytes; 281,777 ms; 2,247 encoded frames).
Authenticated owner browser actions supplied four captured steps. With explicit
frame consent, a real MCP client obtained three PNG samples; the parent agent
inspected those actual images and trace and submitted a revision-checked draft.
The owner corrected and confirmed it in the real UI. After revoking frame access,
the agent re-read reviewed revision `04a91777-d20b-4b58-b117-17a7ac0ac4f4`, acquired
control, performed the task with **Beacon reuse 20261013** and a new note, reloaded
the page and verified both saved values, then rechecked the revision and released
control. Full video remains private; frame consent is revoked. This verifies one
synthetic task with a connected reasoning agent, not automatic model training.

QA orchestration also had failed attempts: a late restored start-response hook
and an incorrect demo button selector were corrected before saving. Revoking
consent before the first reuse completed changed its pinned revision; that
attempt correctly stopped before acquiring control or performing effects. The
sequential retry above passed against the current revision. Delayed unauthorized
response recovery, a new named harness installation and other host platforms
were not exercised in this follow-up. Mac mini retains its earlier snapshot.

Current owned image is
`sha256:2df17d2ff592d2f4e81c9c1914e703b48fb84f9d9c2a0612d0815c94ab4fc4e6`.
Cached rebuilds retained UUIDs, volume, skills and history. Default context stayed
`ser9`; all guest work used saved `desktop-linux`. Doctor at 04:24 UTC measured
66,411,851,776 guest bytes free (62% use), after an earlier sub-1-GB measurement;
no pruning, volume deletion or unrelated cleanup was performed by this work.
Evidence remains private under `artifacts/control-teach-20261013/`. Hosted CI
limitations are reported separately in the PR; local validation does not prove
the Windows/macOS/Linux host matrix or isolated non-Linux guests.

## Brand polish and private merge validation

12 October follow-up after `1f76f00`: David explicitly authorized a private PR
merge and requested further visual polish. Sendtry's existing coral/token/mark
provenance was checked read-only. The three UI files add quieter state styling,
44 px compact control targets, a distinct Computers icon and compact Skills
library/detail navigation. Same-revision return preserves local review edits;
Back clears trial inputs, pauses video, retains search and focuses the selected
card. No backend/dependency/schema/operator/permission contract changed.

PASS fresh pre-merge `npm run lint`, `npm run build` (51 modules plus
UI/noVNC/shared), `npm test` (73 pass, zero failures/skips) and real
`npm run test:integration -- .computer-mcp/review-mvp artifacts/brand-polish-20261012/mcp`.
The broader backend suite here validates the complete MVP before the requested
merge; no UI appearance/E2E harness was generated. Real MCP accepted modern and
legacy stdio, 16 tools, scopes/auth/Host/Origin, pins, takeover/cancellation,
contained files/symlinks, terminal bounds, Chromium/PNG, Teach reuse, disconnect
cleanup and authenticated RFB. Workflow `12e5f737-baf3-491e-91f3-3f8e980e238f`
was saved; final control was released.

PASS manual actual owner-console review at 1280×800 and 390×844: compact library,
search/count/empty result, detail/back, pressed selection, retained search and
unsaved review fields, cleared trial inputs and paused video. Same-revision
reopening kept a temporary notes edit; Refresh restored the original saved notes
without a review write. Desktop displayed the adjacent 280/711 px library/detail
at the measured layout. Document width did not exceed its available client width;
compact control measured 44 px. The new recording setup remained usable while
library/detail were hidden.

Real trace-only demonstrations saved and returned to compact detail. Initial
Finish review found focus on BODY after completion; refreshing runtime state
before focus restoration corrected the observed sequence. A final keyboard
Finish completion waited for Review manually to appear, then confirmed focus on
`teach-next`; Enter focused `skill-procedure`. Take/Release returned focus to the
replacement control. An earlier immediate post-Enter inspection was still in
flight; a subsequent repeated Release locator found no target because control
was already free. No double-release or runtime failure is claimed. These are
ordinary completion observations; delayed-response fault injection was not run.

T3 initially provided the real page, then two snapshot attempts returned
`Preview automation snapshot timed out after 15000ms.` Connected Chrome continued
manual review. One stale browser binding in the new REPL was corrected. T3's
earlier soft capture remained a diagnostic. Captures/logs are private ignored
artifacts under `artifacts/brand-polish-20261012/`; this is not pixel-perfect,
whole-application WCAG, 200% zoom or all-device certification. This follow-up did
not re-run video analysis, model/harness installation, Mac mini or other hosts.

Final source/served UI hashes match: app
`25eea2e9fc495285d05e563e8979f409fe41d5527f9badb909625a174c62cf23`,
style `f6d1cb9ad79bea9f409e198e4a0cb1ec9ae4e74f8cf074cb91c816c43d3337ec`,
index `2278658171d0491687163c03c53c1c59b8122083c22910669249fbd34b367a74`.
Current image `sha256:f4c3c088a2e74593e87af79ffe2d1d032cceb0e7e1c2f46272f8062600bee324`
reused unchanged cached dependency/runtime layers and retained UUIDs/volume.
Read-only proof at 23:21:29 UTC confirmed null lease/inactive Teach; doctor
reported 99% use and 1,997,549,568 guest bytes free. Default context stayed `ser9`;
only the owned guest used explicit saved `desktop-linux`. No cleanup occurred.

The prior head's hosted jobs executed zero steps because of account payment/
spending restrictions. They are not contract failures or proof of the platform
matrix. Normal private PR merge is authorized, without protected pushes, admin
bypass, visibility/license changes or deployment. Fresh hosted status is recorded
in the PR rather than inferred from local validation.

## Screen-first design and manual working flows

12 October UI-only follow-up: Opus 5.5 xhigh completed a read-only design review
of `c6e1129` and three actual captures. The parent implemented a bounded first
slice in the three UI files: sticky session/control/recording/notices, grouped
navigation and compact Menu, direct Screen/Computers labels, enlarged text,
review before evidence, focused recording setup and calmer connection stages.
The [direction record](DESIGN-DIRECTION.md) separates delivered work from advice
and follow-ups. Backend, MCP/catalog/operator, dependencies and schemas are unchanged.

PASS scoped Prettier, `npx eslint ui/app.js`, `npm run build` (51 modules and
UI/noVNC/shared), static DOM-ID inspection and diff checks. Existing 73 backend
contracts and integration evidence at `c6e1129` were not repeated for presentation.
No UI unit/snapshot/E2E harness or competitor runtime was generated.

PASS real T3/connected-Chrome manual review at 1280×800 and 390×844: initial
401 recovery hides the private name/control, owned authorization/live desktop,
compact Menu/Escape/selection focus and contained layouts; Codex TOML/read scope,
three stages/next focus and truthful first-task preview; saved review before
evidence, plan-first trial, cleared inputs after close and a sticky unsaved-review
error. API-held work lease displayed Agent is in control/Take over; owner takeover,
Release and keyboard focus swaps passed. That lease used a bounded API client,
not a model or newly installed named harness, and its session closed.

The owner UI saved a new trace-only **Session bar recording check**, one retained
step/Ready to review. Setup hid the library without discarding its fields;
recording navigated to Screen, exposed one Finish action and hid Release. Enter
on Finish saved and returned to Skills; final library/control state was confirmed
after the asynchronous response. A new synthetic file had exact UI save/readback;
terminal `pwd` returned `/data/workspace`, exit 0 and Command focus. Activity
filters/catalog/reopen metadata and skip-link focus passed. A temporary unsaved
procedure check was restored from the saved review, with no review write.

The T3 surface became explicitly unavailable mid-review; Chrome CUA continued
manual validation. Two read-only DOM inspection helpers used APIs absent from
CUA's restricted scope and were corrected; they were inspection failures, not
runtime failures. T3 capture duplication/softening persisted. No pixel-perfect
or full accessibility certification is claimed. Compact Connect's observed
minimum text was 11 px; the 120/300 px advisor targets were not fully reached.

Final served UI hashes matched local source exactly: app
`78fa7e006282f111ba67a0069876add3aa5929dd256919ee3ea38254dd9eec01`,
style `278df61bfb5ffee91f0086b862e2a02b280150a6b8304e0f61cea3ee0379e48b`,
index `2aae6b183c41eb3be6bd002c8b34fa9826765c2d8979910b9770f9a6c694944f`.
Owned current image `sha256:8fe898321c0e0943db53395edaf46354daab35618030f64b6c5f73f5d5e0065d`
reused cached dependency layers and retained UUIDs/volume/history. Normal viewport
was restored and Chrome left at Screen/free control. Private evidence is in
`artifacts/design-direction-20261012/`. Mac mini was not mutated/revalidated for
this UI slice; its earlier running state/snapshot belongs to the prior record.
Local low Docker space and hosted account restrictions remain unresolved.

## MVP closure: diagnostics, current runtime and contextual control

On 12 October, the trusted host CLI gained read-only `doctor` before computer
creation, Node/local Linux engine/Compose checks, explicit saved-context
protection and separate host/owned-running-guest disk measurements. It never
starts stopped guests, creates state or cleans resources. Nine new contracts
cover prerequisite failures, redacted errors, ownership, stopped guests,
critical/malformed capacity, old Node and explicit-state operation with a corrupt
catalog. Full local format, lint, build (**51 modules** plus UI/noVNC/shared)
and `npm test` (**73 pass, zero failures/skips**) passed on the final code.
Dependency versions and guest API/schema/tool contracts did not change.

The owner console now collapses control actions on connection/history/catalog
views when free, retains them during own control/recording and gives one focused
recovery panel after unauthorized access. It clears prepared requests and owner
metadata; late info/connection responses cannot restore the old owner session.
Independent static review identified four issues: duplicate recovery notices,
late authorized responses, host-zero-space severity and explicit-state doctor
reading a corrupt catalog. All four were fixed and statically re-reviewed.

PASS current local manual T3 review at **1440×1000** and **390×844**: real shared
desktop, Connect's collapsed control disclosure, take/release and Activity while
holding control, keyboard Enter to release, compact Connect/Teach layout and
keyboard Enter to open the native disclosure. Document width remained 390 at 390. T3 became explicitly unavailable during the next skill-selection check.
Manual review continued through the connected Chrome UI: selecting the current
reviewed skill focused the next-action heading and correctly stated that a trial
was not verified. Restarting only the idle owned review PC invalidated its old
owner session. PASS one recovery panel, focus on `access-title`, hidden duplicate
notice/unavailable views and disabled control actions; refreshing did not unlock
it. Reauthorization through the private single-use review helper restored the
same pinned PC and live view. CLI `open` also completed, but a distinct fresh
OS-default-browser authorization was not independently observed. Delayed-response
fault injection remains **not manually exercised**; its fix received static review.
Existing Teach/review trial proof remains below. The
upstream VideoFrame diagnostic persisted; no console-clean claim or generated
UI appearance/E2E harness is made. Private screenshots are recorded under
`artifacts/final-delivery-20261012/REVIEW.md`.

The local owned `review-mvp` was rebuilt using cached, unchanged dependency
layers. Image `sha256:fcb580a40fdce3763158dad797e3273902aa2cbac661393f094173cc8fc7c49f`
served the current UI and retained computer/workspace UUIDs and volume.
PASS `npm run test:integration -- .computer-mcp/review-mvp artifacts/final-local-mcp-20261012`:
real modern/legacy stdio and 16 tools, scopes/auth/Host/Origin, owner-only
credential-free metadata, identity/review pins, contained files, unprivileged
terminal bounds/cancellation/takeover, Chromium, PNG, Teach reuse and authenticated
RFB handshake. Workflow `a955019b-5a49-4772-876a-8694eca33a11` was retained.
Read-only info initially confirmed the same boot, null lease and inactive Teach;
the later owner-session recovery check deliberately restarted the same image.
Doctor still warned at 99% disk use: 2,005,852,160 bytes available at 18:55 UTC.
That cached rebuild/integration does not resolve earlier ENOSPC or prove cold-build
capacity. No prune, shared-daemon restart or unrelated cleanup occurred.

PASS independent Mac mini scoped format/lint, build 51 and all 73 contracts.
Only six authorized source files were copied: CLI, new diagnostics/test and three
UI files. Of the original 83-file `6ab1c3a` archive, four changed and 79 stayed
byte-identical; two new files make the 85-file snapshot. Its fingerprint is
`ed5c178cac46dd2a6e9182e44d2d80d738e945f6419e6cfec0e7b16b75a6d339`.
Updated documentation was not copied; this is not a whole-head or fresh 17/17
lifecycle claim. Host macOS 15.5 ARM64/Node 25.6.1, local `desktop-linux`, Docker
29.2.1 Linux ARM64; guest Node 22.

Both existing owned Mac mini PCs were rebuilt with retained identities/volumes
and left running at their same loopback ports. Doctor measured approximately
366.9 GiB available/15% used inside each guest. The isolated PC retained seven
workflows, the approved `7dd64399` revision without a draft and the previous
trial's exact saved project/note. One bounded independent official SDK read/work
acceptance passed pinned identity, read restrictions, a new synthetic file with
exact readback, `pwd`, browser snapshot, real PNG, read-disconnect preserving the
work lease and own release. Both stdio clients closed. No whole-suite replay or
new network provisioning was performed. Existing 32 network identities,
unrelated containers and default context were preserved. Evidence:
`artifacts/remote-qa/39be4d64-aefa-49d5-91d8-5a5f76a44a28/`.

Final remote read-only check at **19:09 UTC** confirmed both same images/UUIDs,
HTTP 200, 16 capabilities, null leases and inactive Teach. Both measured
393,925,730,304 bytes available/15% used. The 85-file snapshot stayed exact;
35 unrelated containers and 32 network identities were unchanged across this
final probe, default context preserved and helper socket absent. The earlier
round's raw unrelated-resource inventory was not persisted for a temporal
comparison; its existing preservation result stays separate. The probe initially
used an invalid declared client source and correctly received `invalid_client`
400; correcting only QA metadata to `api` allowed the reads. No control or
lifecycle operation occurred. See the private `final-state.json` in that directory.

This closure intentionally leaves the local review PC and the two owned Mac mini
QA PCs running idle; it supersedes the earlier rounds' stopped handoff state.
Remote browser forwarding through alternate authorities was not implemented:
exact Host/Origin guards remain intact. No credentials/config/catalog/env files,
public release, visibility change, merge or native-host permissions were involved.

## Guided Teach and connection: real recording, review and new-input trial

This presentation-only iteration adds Teach's four-stage next-action guide,
direct Finish/save, expandable evidence, explicit Reviewed/trial wording and
three selectable MCP connection stages. Proposal uncertainties remain outside
collapsed evidence; Finish requires own control; same-skill refresh preserves
expanded evidence. A different skill selection focuses the next-action heading.
No backend/API/schema, operator or protocol capability changed.

PASS local scoped Prettier on the three UI files and affected documentation,
`npx eslint ui/app.js`, `npm run build` (49 modules plus UI/noVNC/shared bundle),
exported-skill `quick_validate.py` and diff checks. Remote scoped formatting,
lint and the same build passed after each copied UI correction. The unchanged
64-contract/backend/integration suites were not repeated; their exact prior
source and results remain separately recorded below.

Manual T3 review used the actual Mac mini isolated Linux guest at 1440×1000 and
390×844. PASS client-stage selection/next focus, one visible setup panel, config
disclosure, client/access formats, identity pins and copy acknowledgements.
Actual installation or connection of Claude Code/Cursor/Codex was not inferred
from copying settings. The current-computer control opens the catalog without
retargeting; Activity wording describes sessions rather than verified people.

The owner UI recorded a new synthetic browser demonstration with silent WebM,
four structured steps and explicit frame consent. The SDK/MCP returned three
real PNG samples. The parent inspected these images and the trace, reasoned a
parameterized procedure with explicit sampling uncertainties, then an SDK client
submitted that exact proposal. This attribution distinguishes model reasoning
from the deterministic MCP delivery. The frames did not demonstrate a reload
or the full lower saved note, so the procedure required separate verification.

Manual owner review approved workflow `cc0cc06b-0ffa-47ba-a7f3-9c92936cb80e`,
revision `7dd64399-cc5f-4198-a85d-d7a49c21856e`. The guide highlighted pending
review, exposed uncertainties, rejected unsaved export and retained expanded
evidence during same-ID refresh. Preparing a trial defaulted to plan; the owner
explicitly chose execution with new synthetic inputs and copied the pinned
request. Preparation/consent/copy never displayed an analysis or execution job.

PASS separate real SDK/stdio trial: both computer/workspace IDs, 16 tools,
current ready/reviewed revision with no draft, own lease, observed browser
controls, new project/note and exact comparisons of both rendered saved-card
values after save **and after document reload**. Screenshot, own release,
`lease: null` and closed stdio were verified. Both values and the exact approved
review also survived a subsequent actual guest rebuild/restart. This is one
bounded synthetic taught task, not certification of all models or harnesses.

Final source SHA256: app
`7f0862c3186ab98a6f5439a60b846c3dc211d93034da2fa412e6aca8b45f0783`,
index `6bf15583c23f7d50610c8ee70bc71385ecb4c1329c262e36cf7c1205cb87b6ef`,
style `32dac704f0466f9d65835d8f254d54788220e8a98c09545a11a27077477d5c00`.
The other 80 archived files remained byte-identical to backend `6ab1c3a`;
updated local documentation was not copied. Snapshot fingerprint
`98d8354d2486223601ed87d00f93db0aec2072c4f5c02315ed34c220a55ec287`,
image `sha256:6b439dd2403efa228143d0b622615ae1719a5b744932137efc9f831e5408c996`.
Only the previously owned isolated computer was rebuilt; internet QA stayed stopped.

On that final source, selecting the reviewed skill focused the visible next-action
heading on the compact viewport; document scroll width was 375 for width 390
with its vertical scrollbar. A new trace-only demonstration was finished through
keyboard Enter on the persistent banner: one step saved, Skills opened, focus
returned to the next action and status remained Ready to review. Control was
released and Teach was inactive. The real 4,962-byte downloaded reviewed
`SKILL.md` passed validation. No generated UI appearance/E2E harness was added.

Independent static review found hidden proposal uncertainties, Finish enabled
without own control and nested trial-click error focus; all were corrected and
re-reviewed. Cross-owner Finish and forced-503 trial error were not manually
exercised. A transient SSH route failure and unsupported preview selectors were
recovered without resource/network changes. T3 captures sometimes duplicated or
softened page composition and reported an old capture surface despite confirmed
DOM viewports; screenshots are diagnostic evidence, not pixel-perfect certification.

Private allowlisted proof: `artifacts/ui-journey-20261011/` and
`artifacts/remote-qa/0c5e2bd2-c785-403e-a44c-073c04c4f60c/`. No credentials,
owner cookies, configurations, catalogs or local environment files were copied.
Final resource closure PASS: isolated guest/proxy stopped, internet guest remained
stopped, both owned volumes and seven saved workflows retained, all 32 network
identities, unrelated container identities/statuses and the default context
preserved. Bindings stayed loopback-only; helper socket was absent and the parent
closed its own SSH tunnel/browser tab. Hosted CI status is recorded separately;
local/remote passes do not establish a hosted platform matrix or mass-use readiness.

## Product recovery, current Mac mini and independent operator acceptance

Backend/product commit `6ab1c3a3317ffdf59920e2393137a1df7201fa2f` fixes
destination truncation on failed file writes, preserves editing of reviewed
video-only procedures after clip deletion, adds exact-operation terminal
cancellation/status and blocks copying/exporting unsaved reviews. Operator v6
adds truthful storage-full recovery. UI follow-ups `251321f` and `1fc3ad6`
restore keyboard focus, label deleted clips, show review errors beside compact
actions and keep Activity filters aligned with their displayed metrics.

PASS local `npm run format:check`, `npm run lint`, `npm run build` (49 modules
plus UI/noVNC/shared bundle), `npm test` (**64 contracts, no failures/skips**),
`npm audit --omit=dev --audit-level=high` (**zero findings**), operator
`quick_validate.py` and `git diff --check` at the backend commit. Affected
contracts cover partial staging writes, sync/rename ENOSPC, unchanged destination,
staging cleanup, concurrent destination changes, permissions and a reviewed
zero-step procedure with no remaining draft/video. UI-only follow-ups passed
scoped Prettier/ESLint and the 49-module build locally and remotely; the unchanged
backend suite was not repeated for presentation changes.

The independent operator forward run first exposed a real local capacity fault:
the earlier runtime returned ENOSPC and left its new synthetic file empty. Its
report is **BLOCKED, not PASS**, at `artifacts/operator-forward-20261011/`.
Docker's guest disk was at 100%/zero available despite free host APFS space.
No resources were pruned/deleted and no shared daemon was restarted. To check
the actual fix without rebuilding that full engine, the new file module was
streamed into the same owned guest under UID 1000 with a bounded isolated runner:
physical ENOSPC returned `storage_full` for both a new file and an existing
synthetic file; the new target stayed absent, existing bytes stayed exact and
zero staging files remained. This is a **real filesystem/module fault check**,
not validation of a newly rebuilt local HTTP/MCP image. Evidence:
`artifacts/storage-integrity-20261011/physical-enospc.json`.

Independent SSH Mac mini verified all 83 tracked files for exact backend commit
6ab1c3a, source fingerprint
`cb5fc6c6cdfb876095f0bf7f7c4199998c7d2b1bd7bd29549ea574da6fd2f5d3`.
Fresh `npm ci`, formatting, lint, the 49-module build, 64 tests and production audit with zero findings passed.
Host macOS 15.5 ARM64/Node 25.6.1; explicit local Unix `desktop-linux`, Docker 29.2.1
Linux ARM64 and guest Node 22. The retained network pool was nearly exhausted:
this round rebuilt only two independently owned, previously stopped QA guests
with their existing identities/volumes/networks. **It is not a fresh 17/17 E2E
run** and does not claim new-PC provisioning under that exhausted pool.

PASS actual `scripts/integration.mjs` on both internet and isolated guests,
`scripts/catalog-integration.mjs`, `scripts/teach-integration.mjs`,
`scripts/audit-integration.mjs` and `scripts/desktop-integration.mjs`. They
exercise real modern/legacy stdio, 16 tools, auth/scopes, two-PC identity/leases,
contained files, bounded/cancellable terminal, Chromium/screenshots, X11 input
and takeover cleanup, Teach/review/pinned reuse, private Activity/durations and
payload omission. Guest WebM was 19,956 bytes with four decoded frames. An owned
nonwritable staging directory retained its exact destination with zero staging
files; that remote check is not physical ENOSPC. Both egress policies and exact
latest browser/file/workflow results after stop/start passed.

The initial private reuse runner failed an Activity persistence assertion because
it searched only the first 50-event page of reused history. The failed report is
preserved. The exact same operationId was found in the full owner export of 492
events, and remaining scoped lifecycle checks passed without repeating contract
mutations or weakening product assertions. Initial 48.869s plus continuation 6.553s
are not a cold-install/scale benchmark. Reports/logs/synthetic media remain private
at `artifacts/remote-qa/0b27aa42-bc4e-4577-980b-ae42f1158cfd/`.

A genuine zero-step video fixture was then recorded with Chromium closed,
decoded into three MCP PNG samples, proposed/reviewed, its own clip deleted and
reviewed again without draft/video. Prior failed preparation attempts are
retained rather than called successes. This verifies the protocol/editing path,
not a model's video-understanding quality. The real owner UI saved further
reviews and downloaded a valid 3,997-byte identity/revision-pinned skill.

Manual T3 review covered 1440×1000 and 390×844 on the actual Mac mini guest. PASS
terminal exit 0/nonzero 7, timeout, output limit, scoped cancel and a subsequent
five-second check proving its delayed file write never happened. Keyboard Enter
reaches cancellation and returns to Command; intentional focus on Output remains
there after completion. PASS zero-step/deleted-video editing, unsaved use/copy/
export rejection, saved review/export and local status/polite error caption fully
visible beside mobile actions. Operator download exactly matches v6 (8,569 bytes);
both downloaded skills pass `quick_validate.py`. Clipboard copy acknowledgement
was checked, contents were not independently read. No permissions changed.

The review also found a real Activity race: selecting a session during Refresh
could show the new selection with previous all-session metrics. The scoped UI
fix locks Activity controls during guarded requests. Repeating that sequence
now yields 15 actions, one session, 391 ms tool time and 1 min 12 s control for the
independent agent; All sessions 374→selected 15 and keyboard focus is preserved.
Actual JSON export agrees: 15 events, one session, 72,871 ms control, no supplied
task values/credential fields. Both compact views have document width 390, with
visible focus and contained content. Private screenshots/downloads/notes:
`artifacts/product-recovery-ui/`. Existing noVNC VideoFrame diagnostics appeared;
no diagnostic-free console or automated UI appearance/E2E harness is claimed.

Final Mac mini UI app SHA256
`66d7f58999e8eb3d8e2b18f8e7d4e2ebeddbbd7e7e5fc18ae3f4e93b3d5d68b2`,
index SHA256 `fa848aa100eed4f09b21754273659274fa3cb12b934bb80587f1f23aa3c58b6b`.
Other 81 snapshot files remained byte-identical to 6ab1c3a; only UI was copied for
the follow-ups (documentation was updated locally). Final snapshot fingerprint
`d384ffe4015563d416925e4225a33363ff0abc1c8e06ad23c73097187ee8dbfe`,
guest image `sha256:e05bc9f85dfcb97135bc0fb8c2394e9e046fdc20c9c74dd3432934a8aca5cd00`.
Runtime/backend/scripts remained unchanged from the exercised 64-contract source.

PASS independent interactive agent acceptance using actual operator v6 and the
official SDK/stdio over SSH: both assigned IDs, 16 tools, a new exact-content
file/readback, `pwd` exit 0 with no stopped/truncated result, new practice project/
note verified after document reload, screenshot review and release confirmed by
`lease: null`. It selected operations from observed results, not a replay of the
test suites. No saved workflow was executed in this particular acceptance task;
taught reuse is covered by the separate real Teach contracts. Report/transcript:
`artifacts/operator-forward-remote-20261011/`. This is one bounded task/agent/
transport, not certification of all harnesses/models.

Final independent resource check passed: both remote QA guests and the owned
isolated proxy stopped, both volumes retained, all 32 network identities and
unrelated container identities/statuses preserved, saved ports loopback-only and
the remote default context unchanged. The single-use owner helper socket was
absent. The parent's own SSH tunnel was then closed. No state/credentials were
copied for evidence; only allowlisted reports/logs/synthetic media and exports.
See the final remote `final-resources.json` and `REMOTE-QA.md`.

BLOCKED hosted Ubuntu/macOS/Windows CI for exact backend 6ab1c3a: all three jobs
have zero steps, and annotations explicitly cite account payment/spending
restrictions ([run 38128037615](https://github.com/bujosa/computer-mcp/actions/runs/38128037615)).
GitGuardian passed; billing settings were not changed. Windows/Linux host
lifecycle, AMD64, individual harness installation, model/scale evaluations and
public licensing/packaging remain pending. The owned local review image is still
the previous polish on the full Docker disk; see [local review](LOCAL-REVIEW.md).

## First connection and independent skill export polish

Product commit `e034cf3d20623eb9599a8dd2cbe81d6828fba7ba` gives Connect agent
a three-step setup, client-specific configuration/skill paths, official guides
and an inspectable first task. It distinguishes read observation from work
execution and checks both computer/workspace IDs. Operator skill v5 and MCP
guidance require the current completed review/revision for all taught reuse.
Independent taught exports now include trusted workspace/revision pins (v3),
refuse missing/foreign identity and instruct the agent to stop on a changed or
unavailable workflow instead of using embedded text. These instructions do not
enforce a workflow revision on general action tools.

PASS `npm run format:check`, `npm run lint`, `npm run build` (49 JavaScript
modules plus UI/noVNC/shared bundle), `npm test` (57 contracts, no failures/skips),
`npm audit --omit=dev --audit-level=high` (zero findings), operator and real
taught-artifact `quick_validate.py`, and `git diff --check`. Export contracts
exercise trusted identity rejection, legacy UUID revision fallback, immutable
download pins and pending-review rejection. Before the broad gates, the 30
affected contracts passed separately.

The owned local review computer was rebuilt with saved context `desktop-linux`;
image `sha256:04e828b8b8f3ebc9070c0287b3593a437b97cecb0ad4b155cae577000637db11`.
PASS `npm run test:integration -- .computer-mcp/review-mvp artifacts/connection-polish-final-mcp`:
real modern/legacy stdio, discovery of 16 tools, auth/scopes/identity, lease/takeover,
terminal limits, contained files, Chromium, screenshot, Teach/export/prompt/reuse
and RFB contracts. The export assertion now checks the runtime's exact trusted
workspace and reviewed revision.

PASS `npm run test:teach-integration -- .computer-mcp/review-mvp artifacts/connection-polish-final-teach`:
actual WebM (18,934 bytes, three decoded samples), consent, analysis/proposal,
owner review, trusted export pins, pending-draft/read restrictions, pinned reuse,
actual supplied file readback, control release and metadata-only handoff audit.
This deterministic contract calls the analysis/proposal tools; it does not
certify a model's video understanding.

The actual visible/copied work request was saved and performed with the official
SDK stdio client, using an ignored private manual MCP helper. PASS both identity
checks, discovery of seven read tools, observation without lease/change, real guest screenshot/browser/file
observation, creation/readback of its synthetic check file, `pwd` returning
`/data/workspace` with exit 0/no stopped/truncated result, and lease release.
Evidence: `artifacts/connection-polish-final-first-task/`. This verifies the
requested operations, not model interpretation or harness registration.

Manual T3 browser review covered 1440×1000 and 390×844: aligned step headings,
Claude/Cursor JSON, Codex TOML and neutral other-client guidance, work/read
previews, control hints, clipboard acknowledgement, actual config/skill
downloads, keyboard focus, tool disclosure, first-task-to-Activity navigation
and unauthorized CLI recovery with disabled actions. The final operator download
matched versioned v5 exactly (8,164 bytes). Mobile page scroll width equalled
390; long configuration/request text stayed contained. Activity's **Prepared a
skill request** label, times, outcomes and owner attribution were visually
reviewed. Screenshots are private in `artifacts/connection-polish-ui/`. No
automated UI appearance/E2E harness or permission changes were added. Existing
noVNC VideoFrame cleanup diagnostics remain a known browser limitation.

Independent read-only review found no remaining material contract contradiction.
Final owned runtime remained idle, Teach inactive, identities preserved and ports
loopback-only. Docker's default context remained `ser9`. Full remote 17-phase
E2E below belongs to `998fc72`, not this newer polish; it was not rerun because
the affected export/MCP/Teach paths and UI were validated directly. Windows/Linux
host lifecycle, individual harness registration, model behavior, scale and
public licensing/packaging remain pending.

## Reviewed skill handoff update

**Use with agent** prepares an owner request pinned to the current completed
review, computer and workspace. Plan is the default; execute requires work MCP.
The preparation API accepts revision/intent only. Supplied values are bounded,
literal JSON in owner memory and are excluded from workflow/Activity storage.
`workflow_get.reviewed` explicitly blocks a pending proposal even when its body
is hidden from read scope and a prior review remains. There are still 16 tools.

Product commit `998fc7254651d7e3df2b11e4430a247ac102959f` passed local
`npm run format:check`, `npm run lint`, `npm run build` (49 JavaScript modules
plus noVNC/shared contract bundle), `npm test` (**57 contracts, no failures or
skips**) and `npm audit --omit=dev --audit-level=high` (**zero findings**).
The repository operator skill passed `quick_validate.py`.

Local focused `test:teach-integration` passed against owned review-mvp: real video,
analysis/proposal/review, plan/execute MCP prompts, read execution denial, hidden
pending draft rejection, identity/revision-pinned request and actual file reuse
with a fresh value, followed by file-read verification and control release.
Activity contained a successful workflow-linked `skill.handoff` without that
value. Evidence is private under `artifacts/skill-use-local/`.
`test:integration` also passed its real modern/legacy stdio/API/browser/files/
terminal/lease contract, including owner-only use preparation, stale revision and
rejecting extra input payloads. Artifacts: `artifacts/skill-use-mcp-local/`.

Manual T3 review covered the real form at 1440×1050 and 390×844, stacked fields,
no horizontal page overflow, default plan, execute request, missing-input text,
keyboard label/focus, unsaved-review errors and closing during a deliberately
delayed preparation. Fields were locked during the wait; after completion the
closed panel stayed closed, with cleared inputs/preview and restored controls.
Copy reported success and the actual request preview included supplied synthetic
values; direct clipboard read was denied by the browser, so clipboard content
was not independently read. No permission was changed. The preview disconnected
while opening Activity at the end; the new Activity label was not visually
reviewed in that session. Backend audit metadata was exercised independently.
No UI appearance/E2E harness was generated.

Independent read-only audit found an intent/input race during an in-flight copy;
temporary control locking and snapshot/intent/review/generation checks resolved
it. The reviewer reported no remaining concrete blockers. The first local suite
was 56/57: shared parameter descriptions initially rejected the supported legacy
`command_2` name. Safe bounded names now retain compatibility; the original export
test and the full 57-contract suite subsequently passed without removing checks.

Independent Mac mini ran exact product commit
`998fc7254651d7e3df2b11e4430a247ac102959f`: fresh `npm ci`, formatting, lint,
49-module/noVNC/shared contract build, **57 contracts with no failures/skips**
and production dependency audit with **zero findings**. Full real
`npm run test:e2e -- --context desktop-linux` passed **17/17 phases**, exit 0,
in **53.029s**. This cached-image run is not a cold-install benchmark.

It exercised the new owner-only pinned handoff, default plan/work execution
prompt, read execution denial, hidden pending proposal rejection, fresh supplied
file reuse through MCP and metadata-only handoff Activity. The real guest WebM
was **19,438 bytes**, decoded to **four frames**. CLI/catalog/default and pinned
stdio, two-PC isolation, native desktop input/takeover, scoped Activity, both
egress modes, exact latest result after restart and browser recovery also passed.
The runner and final independent resource inspection confirm both new guests
and their proxy stopped with exit 0, private volumes retained and unrelated
resources preserved. Guest ports bind only `127.0.0.1:17670`/`17671`; the default
context remains unchanged and the explicit engine is local Unix `desktop-linux`.

Private evidence is
`artifacts/remote-qa/e020ae70-2840-410c-93d3-78cf361a1524/`, including
`REMOTE-QA.md`, manifest, gate logs/results, final report, final resource inspection
and desktop/Teach/Activity artifacts. All **83 versioned source files** and HEAD
were checked; snapshot hash:
`d1c5547b0b8695ad20a14ec564572e0ccc5f41013e670629e64c14ecdc42a702`.
Host: macOS 15.5 ARM64, Node 25.6.1; Docker 29.2.1 Linux ARM64 on explicit local
`desktop-linux`, with Node 22 in the guest. Final validation documentation changes
do not change this tested product code or scripts.

Hosted Ubuntu/macOS/Windows CI on this exact `998fc72` failed with **zero steps**;
all three job annotations explicitly reported account payment/spending
restrictions. Run:
<https://github.com/bujosa/computer-mcp/actions/runs/38118090675>.
No billing settings were changed. Windows/Linux hosts, AMD64 and native or VM
guests remain untested; this Mac mini pass does not certify those paths.

## Bounded guest desktop input update

The MCP catalog now has 16 tools. `desktop_action` delivers bounded Linux guest
click/move/wheel/text/key input with fixed executables/display/UID, literal stdin,
five-second deadlines and a separate one-second held-key/button cleanup. Python
`-I -S` excludes guest user-site hooks. Takeover waits for cleanup before granting
the new lease; RFB control messages recheck its generation. Teach suppresses
equivalent Chromium events and delayed blur duplicates while retaining later
owner edits. Navigation/close retain executed steps; genuine correlation cleanup
failure saves an interrupted demonstration, blocking export.

Local `npm run format:check`, `npm run lint`, `npm run build` (47 JavaScript
modules plus noVNC), `npm test` (53 contracts, no failures/skips), and production
dependency audit (zero findings) passed. The repository operator skill passed
`quick_validate.py`. Product implementation is `cfc72c8`; `c39b170` changes only
the portable Python security fixture and `be15590` the latest-result E2E
assertion. Independent read-only review found no remaining blockers after fixes.

Real local `test:desktop-integration` passed on rebuilt review-mvp image
`sha256:78dc31f6bcdf5ba6319848b2e6fa8ed54e4184e3036c7477f97727072325ce20`.
The xev diagnostic window received native key/type/click/wheel events and observed
release of an ordinary held key/button. Actual takeover cancelled a long input;
copied read-session authority was rejected. Teach stayed active over native and
Chromium input, omitted supplied values, suppressed duplicate fill/blur, retained
a later owner edit, navigation and closing. Fresh supplied input then saved an
actual Chromium practice result. Evidence is private at
`artifacts/desktop-local-navigation-final/`.

Manual T3 review covered the new guest step details/supplied parameters, Activity
action labels and session outcomes, and live Computer view at 1440×1050 and
390×844 without horizontal page overflow. Owner take/release and the live control
channel were reviewed. No generated UI appearance/E2E harness was added.

The first real input attempt hit a timeout when installed xdotool used
`mousemove --sync` at the already-current position. The action now relies on
ordered X11 commands without that wait; the corrected native contract passed.
The first new Mac mini gate on `cfc72c8` passed installation, formatting, lint,
build and dependency audit, but only 52/53 contracts: Homebrew had already loaded
its global `sitecustomize`, masking the test fixture. The fixture now uses
`usercustomize` and still requires positive loading without isolation and no
loading with the actual cleanup flags. No runtime permissions/limits changed.
That failed gate and diagnostic are retained privately in
`artifacts/remote-qa/5566fd87-726a-4f25-a126-86554d118822/`.

Independent Mac mini `c39b170` passed all gates and 13 E2E phases, including the
new native input phase, but failed the next restart assertion: the practice app
retains one latest note, and desktop reuse replaced the earlier DOM note that
the harness still expected. A real restart diagnostic recovered the exact
newest native project/note and confirmed storage had persisted. `be15590` updates
the harness to require that latest saved project and note; no persistence guard
was removed. Failed report/diagnostic are private in
`artifacts/remote-qa/812f2d34-edb1-401e-b00a-a48fe1dabde5/`.

Independent Mac mini ran exact commit
`be15590add098f2e43e55f0a7823c119d261951d`: fresh `npm ci`, formatting, lint,
47-module/noVNC build, **53 contracts with no failures/skips**, and production
dependency audit with **zero findings**. Full real
`npm run test:e2e -- --context desktop-linux` passed **17/17 phases**, exit 0,
in **52.011s**. This cached-image run is not a cold-install benchmark.

It exercised the complete CLI/catalog/default/stdio flow, native X11 input and
takeover, Teach video/analysis/review, Activity, both egress modes, exact latest
practice result after restart, offline persistence and reopening Chromium.
Actual WebM decoded to four frames. Both new guests and their proxy stopped;
private volumes remained. The runner and final independent resource inspection
confirmed the default context and unrelated resources were preserved, with only
loopback guest ports.

Private evidence is
`artifacts/remote-qa/d9ffcea4-38f5-4192-89ed-677e2cf33bcd/`, including
`REMOTE-QA.md`, manifest, gate logs, final report, resource inspection and
desktop/Teach/Activity artifacts. All **81 versioned source files** and HEAD were
checked; snapshot hash:
`e8e46c3593a9663135d770c71829ba36d36f4ac569e800c4aad76d917d9bf490`.
Host: macOS 15.5 ARM64, Node 25.6.1; Docker 29.2.1 Linux ARM64 on explicit local
`desktop-linux`, with Node 22 in the guest. Final handoff documentation changes
do not change this tested product code or scripts.

Hosted Ubuntu/macOS/Windows CI on this exact `be15590` failed with **zero steps**;
all three annotations explicitly reported account payment/spending restrictions.
Run: <https://github.com/bujosa/computer-mcp/actions/runs/38116189382>.
No billing settings were changed. Windows/Linux hosts, AMD64 and native or VM
guests remain untested; the passing Mac mini E2E does not certify those paths.

## Local activity update

Activity now persists scoped observation sessions, allowlisted actions and
exclusive control intervals in a private bounded SQLite database. Local gates
passed: formatting, lint, build (43 JavaScript modules plus noVNC), and 43
contracts with no failures/skips. The real focused runtime/MCP activity contract
passed against the owned review computer, including modern and legacy client
metadata, nonzero exit/timeout, takeover cancellation, copied read actor IDs,
exact stdio session closure, owner-only export, pagination and payload exclusion.
Private evidence is `artifacts/audit-local-final/` and the final rebuilt-runtime
rerun in `artifacts/audit-local-cleanup-final/`.

Manual T3 review covered Activity at 1440 × 1050 and 390 × 844: range and exact
session filters, outcome/exit-code display and JSON export. The downloaded JSON
was parsed from the actual preview download and contained nine selected-session
events and one session with the pinned computer identity. Desktop had no
horizontal page overflow; compact controls and metrics stacked in the screenshot.
After a transient preview disconnect, compact scrolling and the outcome timeline
were reviewed; loading earlier actions grew the list from 50 to 99 rows and hid
the exhausted-page button. The compact page remained 390px wide. No generated UI
test harness was added.

Earlier focused attempts exposed an unlabeled internal MCP cleanup request and
an attempt overlapping an owned rebuild. Both were corrected/re-run; those
attempts are not counted as passes. Independent audit also corrected read-close
authority, retention attribution, SQL ambiguity, failure outcomes, cancellation
on storage failure, and owner capacity under saturation. A final saturation
review added Teach-stop/control-release to the bounded four-slot cleanup reserve;
the contract verifies a fifth concurrent cleanup is rejected.

Independent Mac mini ran exact product commit
`6f9da58ccbada8660fb2c5bf4fe0df2c6693a15d`: fresh `npm ci`, formatting, lint,
43-module/noVNC build, 43 contracts with no failures/skips, and production audit
with zero findings. The full real CLI/Docker/MCP E2E passed **16 phases**, exit 0,
in **124.924s**, including a **77.978s** initial image build/start. It verified
modern/legacy client attribution, copied read actor authority, owner-only export,
payload exclusion, exact stdio session closure and the exact completed activity
operation across a real guest restart. Teach video/analysis/review, browser
recovery, profile/file/skill persistence, two-PC/default isolation and egress also
passed. Both new guests stopped with private volumes retained; default context
and unrelated resources were preserved.

Private evidence: `artifacts/remote-qa/6eee64fd-f00f-456f-b8d3-dc4a6a9bfed3/`.
All 75 versioned source files were checked; snapshot hash:
`8abc7a81f17c7b632937c8a8b4bab7521d51ead39f149c020ffc7e44286f7363`.
Host: macOS 15.5 ARM64, Node 25.6.1; local Linux Docker 29.2.1 ARM64, with
Node 22 inside the guest. Final validation/handoff documentation edits do not
change this tested product code.

The earlier new remote attempt on `33382b4` failed in the first file write because
QA extraction under umask 077 removed source readability for guest UID1000.
The bounded worker returned EACCES; PID/memory limits were not exhausted. The
archive was re-extracted preserving versioned modes inside a private parent,
and the final run used a new directory/project. No guest data permissions,
runtime limits or environment guards were relaxed. Failed-attempt evidence:
`artifacts/remote-qa/6b744ba6-408f-4c2b-9d64-b077c155c7ad/`.

Hosted Ubuntu/macOS/Windows CI on `6f9da58` failed with zero steps; all three job
annotations explicitly reported account payment/spending restrictions. GitGuardian
passed. The matching run is
<https://github.com/bujosa/computer-mcp/actions/runs/38106332364>.
No billing setting was changed. Windows/Linux host or AMD64 execution is not
claimed. The owned local review computer was rebuilt to this product code and
left idle with its original computer/workspace identity and retained history.

## Teach media, analysis and review update

Final source passed local formatting, lint and build (38 JavaScript modules plus
noVNC), and 30 contract tests with zero failures/skips. Independent Mac mini
passed the same gates with fresh `npm ci` and no reported vulnerabilities.
Its full real CLI/Docker/MCP E2E passed **15 phases**, exit 0, in **124.742s**,
including an **80.818s** first FFmpeg image build/start. It retained owned volumes,
stopped only its new guests and reported `unrelatedResourcesPreserved: true`.

Private evidence: `artifacts/remote-qa/84829614-4c18-406e-804a-c50808ced78f/`.
The E2E snapshot source hash is
`c48b9f7a0f35ca5d01ce1a28b223c51770f43bded37c2fd65629a9d0206a368b`;
code hash `d6212e3cc0b6621948167cec6d1f009b3ce186c4e7f09229d6c299478b1f1bf1`.
A subsequent content-only snapshot passed all gates/30 tests again: code hash
`210d7f7b421d7fc5b41a896b0dbad4724ec26f7acf34ce6f3019ac2d27ae157e`.
The only product code delta after E2E was singular/plural and video-caption text
in `ui/app.js`, plus operator-skill guidance and docs; final editorial fixes
followed separately. The earlier report is not relabeled as an exact new snapshot.

The new real phase verifies VP8 WebM capture (960×600, 19,149 bytes/3 decoded
frames remotely), private UID access, owner-only range/download, 640×400 MCP PNG
samples, consent/revoke, prompt/proposal, stale revisions, read-scope draft
privacy, exact owner review, export, explicit video deletion preserving the skill,
encoder cleanup and Teach with Chromium closed. The script's deterministic
proposal tests the protocol, not a model's general interpretation quality.
Quota/forced-stop/startup-cancellation and frame overflow are contract-tested;
no claim is made that the real smoke ran all five minutes or filled 200 MiB.

Local `artifacts/e2e-d4TMYq` and `artifacts/e2e-6rGau1` each passed all 15
functional phases, including real media/MCP/Teach, but exited 1 at the final
unchanged-environment guard. The first overlapped this task's review-computer
rebuild; the second observed concurrent unrelated unnamed container changes.
Neither is counted as a fully passing local E2E. No guard was weakened or
unrelated resource stopped. Earlier attempts failed because the QA script used
uninstalled `pgrep` and still expected 13 tools after adding two; those checks
were corrected to a real `/proc` process check and the actual 15-tool catalog.
Only exact, stopped, zero-endpoint disposable QA networks from these runs were
removed after ownership inspection; no containers/images/volumes were deleted.

Manual T3 review covered guest-video playback, consent/revoke, pending-export
gating, editing/confirming a proposal, skill download and 390px layout without
horizontal page overflow. Three samples of the retained practice video were
actually viewed by this agent: they showed a stationary populated form, so the
proposal explicitly stated that typing/saving was unobserved. The owner review
retained that uncertainty. The reviewed procedure was then executed through
real MCP with new supplied values and the saved note verified after reload;
private evidence is `artifacts/manual-analysis/{context,proposal,execution}.json`.
This is one bounded vision/reuse example, not general model-quality validation.
Both operator and exported skill frontmatter passed the local skill validator.
No generated UI appearance/navigation/E2E harness or global skill install was used.

The final review guest is running without a lease/active Teach; its frame sharing
was revoked. Other owned review and fresh QA guests are stopped with data retained.
Hosted Ubuntu/macOS/Windows CI on the previous `b41a81f` head failed before steps
because of account payment/spending restrictions; GitGuardian passed there.
No billing setting was changed. Current PR checks are reported separately.

## Earlier baseline (before Teach media)

The following 14-phase/21-contract evidence describes the earlier private MVP,
not the newly added analysis/review flow.

## Baseline environments and gates

| Environment                  | CLI host                        | Guest engine/runtime                                         | Real E2E result                             |
| ---------------------------- | ------------------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| Implementation workstation   | macOS 26.6.1 ARM64, Node 24.1.0 | Docker Desktop Linux 29.4.3, Debian ARM64, Playwright 1.64.0 | 14 phases passed, 41.394 seconds with cache |
| Independent Mac mini via SSH | macOS 15.5 ARM64, Node 25.6.1   | Docker Desktop Linux 29.2.1, Debian ARM64, Playwright 1.64.0 | 14 phases passed, 44.178 seconds with cache |

Both machines passed `npm run format:check`, `npm run lint`, `npm run build`
(32 JavaScript syntax checks and the real noVNC bundle), and `npm test`
(21 contracts, zero failures/skips). Mac mini also ran fresh `npm ci` with zero
reported vulnerabilities. Earlier local `npm ci` and `npm audit --omit=dev`
passed with zero production findings. Both ran:

```sh
npm run test:e2e -- --context desktop-linux
```

The Mac mini's first cold desktop build/start took 89.005 seconds. Warm timings
include execution and restart, not first-install time. See [QA](QA.md) for
prerequisites, ownership and reproducible commands.

## Actual execution coverage

The runner creates a new private catalog and two fresh UUID computers, one with
explicit internet access and one isolated/offline. It verifies:

- Strict CLI options, empty catalog, creation without implicit start, duplicate
  rejection, start/doctor, registration, defaults and exact configurations.
- Official SDK legacy/modern stdio, 13 tools, resources/prompts, read/work scopes,
  computer/workspace pins, auth/Host/Origin, owner-only metadata and tickets.
- Independent leases/files across PCs, defaults that do not retarget pinned MCP,
  and idempotent start preserving boot/lease generation.
- UID-1000 execution, same-UID credential isolation, output/deadline limits,
  cancellation, HTTP disconnect, takeover and process-group cleanup checked
  after delayed effects would have occurred.
- Contained files, traversal/symlink rejection, visible browser actions, real PNG
  capture and authenticated view/control RFB handshakes.
- Teach, export, omitted values/commands, missing parameters, prompt retrieval
  and actual taught procedure execution with supplied values.
- Stop/start retaining computer/workspace IDs, exact files/workflow and the
  **latest unique project and note** rendered by the persistent browser. Boot ID
  changes and the old lease is absent. Closing Chromium then navigating under a
  lease recovers it without restarting the computer.
- Public HTTPS in internet mode and a blocked TCP probe in isolated mode. This
  is a negative egress probe, not a universal firewall claim.

Both final reports show `unrelatedResourcesPreserved: true`: default context,
unrelated container IDs and running states matched the starting snapshots.
Only fresh owned guests were stopped; data volumes were retained. Locally all
mutations used `desktop-linux`; default `ser9` and its remote daemon were untouched.
Mac mini also kept its existing default context.

## Evidence and source identity

Gitignored private evidence remains in this implementation worktree:

- Local: `artifacts/e2e-nipsaD/report.json`, source SHA-256
  `cd74daf0867742ea1635b9f19217f2d8e9e633c6d3db98c22c2400feeac09109`.
- Mac mini: `artifacts/remote-qa/538227d7-550b-42c7-bfe7-cf3303863418/report-final.json`,
  source SHA-256 `167a90c36f715aeae523483033441fdc14de146936d53fa7460426f533c517a1`.
  `REMOTE-QA.md`, source/patch manifests and the initial failed report are retained.
- Remote reports remain under the new private directory
  `/Users/bujosa/computer-mcp-private-qa/538227d7-550b-42c7-bfe7-cf3303863418/source/artifacts`.

These runs tested snapshots based on `8726bc6`; that original commit does not
contain the subsequent fixes. Remote-only QA commit `8adee7b` records the
transferred snapshot, not an upstream product commit. Runtime/UI/test code
matched across hosts; subsequent documentation edits account for differing
source fingerprints. No `.git`, credentials, local state or customer data were
transferred. Artifacts can contain demonstrated content; do not publish them.

## Findings and corrections

Local and independent remote execution reproduced a persistence failure: the old
note survived, but the latest note was lost on immediate stop. Pinned Playwright's
default signal handler and server shutdown closed Chromium concurrently; a second
graceful close killed it before profile flushing completed. The server now owns
shutdown with Playwright signal handlers disabled. Exact unique note assertions
remained enabled and passed on both hosts; profile existence alone was not accepted.

Additional corrected audit findings:

- Desktop helpers inherited root work/owner credentials. Their environment now
  clears before dropping UID; real same-UID `/proc` checks pass without logging
  values. Three owned review guests were rebuilt and private credentials rotated
  while retaining identity/data.
- HTTP disconnect aborts its lease operation independently of cancellation
  request ordering. Wrong-session/operation cancellation cannot stop that work.
- Concurrent Teach closes share one save and cannot clear a later recording.
  Recorder URLs are bounded; browser recovery requires a leased navigation.
- Per-computer image tags avoid moving another checkout's shared image tag.
  Active checkpoints display Recording/Saving with export disabled.

A later local repeat failed when retained QA projects exhausted Docker's subnet
pool; its report also recorded concurrent unrelated container identity changes.
No application assertion was weakened. Read-only checks confirmed ownership and
zero endpoints on five networks from this task's already stopped disposable runs;
only those empty networks were removed. No container, image or volume was deleted.
The next full fresh run passed, including the unchanged-environment check.
Retained catalogs/networks/volumes consume resources; automatic deletion is pending.

Earlier testing also corrected browser-profile permissions, offline publishing
through a fixed credential-free relay, restart display locks through `/tmp` tmpfs,
separate human authority, the noVNC ESM bundle and a dependency audit finding.
Current real integration covers these paths.

## Manual product/design review

T3 collaborative browser review covered the six Sendtry views at 1280/1440 pixels
and 390 × 844: live noVNC input, file save/read, terminal output, keyboard focus,
take/release, JSON/TOML and work/read setup, configuration/operator/taught-skill
downloads, search/parameters and computer/default commands. Narrow layouts had
no horizontal page overflow; configuration text stays in its container.

Final manual recording created/read a note, showed Recording in library/detail,
saved two reusable steps, became Ready to review and downloaded the skill.
Earlier interrupted recording correctly disabled export (HTTP 409). The practice
page displays its saved note after reload. The default review computer is idle
without active Teach; other review guests are stopped. The actual macOS CLI
browser opener succeeded in earlier review. Operator and exported skill artifacts
also passed the local skill validator; harness discovery itself remains pending.

A disposable loopback helper consumed an owner ticket for the separate preview,
printed no credentials and closed afterwards. It is not product code. Restart
401s were followed by successful reauthorization. Upstream noVNC emits a
VideoFrame cleanup diagnostic in this browser; streaming/input worked. No
appearance/navigation/UI E2E harness, global harness settings or skill installation
was added. Brand asset provenance and pending public terms are in [product](PRODUCT.md).

## Pending validation and support

On head `8726bc6`, GitHub Ubuntu/macOS/Windows jobs failed before any steps because
of account payment/spending restrictions; GitGuardian passed. CI was blocked,
not passed. Billing/settings were unchanged. The Node 22 matrix does not establish
Docker lifecycle support on those hosts.

Windows/Linux host lifecycle, AMD64 guests, harness registration/skill discovery,
native control, isolated macOS/Windows guests and VM/remote adapters remain
pending. SSH was QA transport to Mac mini's local Docker, not an implemented
remote-computer adapter. Public packaging, code/dependency licenses and Sendtry
asset terms are future release decisions. See [security](../SECURITY.md) and
[local handoff](LOCAL-REVIEW.md).
