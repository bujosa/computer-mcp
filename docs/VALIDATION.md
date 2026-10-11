# Validation record

Private Sendtry Computer MVP reviewed on 10 October 2026 (11 October UTC).
Results describe exercised paths; portable code and a CI matrix do not establish
platform support.

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
