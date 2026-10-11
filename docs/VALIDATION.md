# Validation record

Private Sendtry Computer MVP reviewed on 10 October 2026 (11 October UTC).
Results describe exercised paths; portable code and a CI matrix do not establish
platform support.

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
