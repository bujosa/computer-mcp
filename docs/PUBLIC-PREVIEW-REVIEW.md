# Product and commit review — 27 October 2026

Publication update: the owner subsequently authorized the complete repository
and history. The reviewed stack is on public `main`; see
[source publication acceptance](PUBLIC-LAUNCH.md). The private/publication-pending
statements below record the preparation stage and are superseded by that acceptance.

Review baseline: `68eca5a`, on `bujosa/mcp-readiness-contracts`; the local
default-branch reference was `a0b282d`. A read-only remote check found actual
`main` at `6d2c0e3` (PR #11, merged 17 October), also reviewed below.
Follow-up: `bujosa/public-preview-review`.
This is a source/contract/product review and bounded QA, not an external security
certification or a claim of reliable automation for arbitrary tasks.

## Product judgment

The differentiated product is coherent: give an existing MCP agent a persistent,
separate Linux guest, let its owner share/take over the screen, teach by example,
publish reviewed instructions and assign verifiable work. Browser/terminal/files
and bounded native input operate on that same guest. Named grants, task attempts,
exclusive control and separate owner verification make the execution auditable.

The generic operator can be a useful public developer-preview skill when shipped
with the server/setup path. A skill alone provides instructions; it cannot create
computer access or replace inference. Teach is assisted procedure authoring,
not model training or automatic unattended execution. These distinctions belong
in the install experience, not only in architecture notes.

The screen-led console is readable and consistent with Sendtry's paper/salmon/ink
identity. This review retains that direction, changes the stage label to
"Developer preview" and adds the MIT notice beside the skill download. It does
not introduce another dashboard, chatbot, redesign or UI test harness.

It is not yet a general managed desktop service: backup/restore/uninstall,
release/update distribution, broader host/IDE onboarding, measured resource
footprint and a larger Teach reliability pilot remain work. Container isolation
is not a VM; macOS/Windows hosts do not imply macOS/Windows isolated guests.

## History and commit scope

Inventoried all **58 commits reachable from the baseline HEAD**, including merges,
and all **76 commits across available refs** for the secret scan. No history was
rewritten. Earlier merged slices were reviewed through current ownership/auth,
process/file, control/Teach and distribution boundaries and dated acceptance.
The eleven not-yet-merged commits received the following contract review. This
is not a claim that every historical line was independently certified.

| Commit    | Change and review conclusion                                                                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `88c788b` | Execution/skill guidance and tool audit. Preserve awaited post-acquisition revision checks, actual result inspection and recovery without replay. Generic operator v10 retains these invariants.                               |
| `7c01b3e` | Teach handoff documentation. Analysis and execution are distinct user/harness handoffs; saving/copying never silently invokes a model.                                                                                         |
| `d57a8aa` | Source-review date correction. Historical market/Grok evidence stays dated; no new competitor capability or fresh research claim is inferred.                                                                                  |
| `dc88cb6` | Manual-only CI trigger. Owner's disabled CI policy remains intact; current validation is local/explicit, not a claimed CI run.                                                                                                 |
| `6c86927` | Reviewed task inputs. Definitions have bounded names/descriptions, no defaults/values; supplied values stay literal task data and do not expand scope.                                                                         |
| `72d6527` | Named grants/assignments. Reviewed hashed credentials, namespace-bound actors, pinned workspace/session/boot/lease, task idempotency, interruption and separate report/verdict storage. Actual two-PC contracts passed.        |
| `c540196` | Assigned-task UI. Reviewed named grant setup, task/request handoff, declared presence, reports versus owner verdicts and revocation. No credential/host-command execution in browser; current manual view/skill route checked. |
| `35a0d24` | QA metadata containment. Integration-created connection files use an explicit isolated artifact catalog; no default/private owner catalog is used.                                                                             |
| `9ebd323` | Assigned setup/acceptance docs. Real evidence is distinguished from future OS/IDE claims and semantic task-scope enforcement.                                                                                                  |
| `c2cfab6` | Legacy compatibility acceptance. Legacy remains an explicit owner setting, temporary for compatibility tests and restored to disabled afterwards.                                                                              |
| `68eca5a` | Real stdio readiness and output contracts. Observation-only check does not take/release another process's control. Structured/text/image contracts, malformed-output error handling and no-replay guidance retained.           |

## Findings corrected in this branch

### Security dependencies

The initial production audit reported **two high and one moderate** advisories:
Zod constrained-collection memory exhaustion, body-parser compressed-body denial
of service and qs stringify denial of service. Updated only the affected runtime
resolutions: Zod **4.3.6 → 4.6.7**, body-parser **2.3.0 → 2.4.0**, qs
**6.16.0 → 6.17.0**. Express, MCP SDK and Playwright versions are unchanged.
The final full npm audit reports **zero known advisories** at this date; that is
not proof of absence of vulnerabilities.

Primary advisory records:
[Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
[body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828),
[qs](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw).

### Failed JSON checkpoints

`atomicJSON` left its random temporary file after a handled write/rename failure.
Repeated storage failures could retain unpublished state and consume capacity.
It now opens its own exclusive 0600 staging file, syncs complete content before
rename, closes it and removes only that staging file on handled failure,
including a close error. Regression tests preserve the prior published state
and leave no staged content on write/sync/close/rename failure. A killed process
or filesystem cleanup failure can still leave data; directory power-loss
durability and managed disk quotas are not claimed.

### Date-dependent audit test

Baseline `npm test` produced **146 pass / 1 fail**. The shutdown test created data
under a simulated 10 October clock, then reopened it under the real 27 October
clock. Retention correctly removed the old event, so the test could not find it.
The reopened test store now uses the same simulated wall/monotonic clocks.
Runtime retention rules were not weakened or changed.

### Browser interoperability with the existing default branch

PR #11 already added bounded visible-control selectors and safe HTTP(S) link
URLs in `runtime/browser.js`. The pending structured-result contract would strip
that additive element `url` field after the branches were combined. It now
preserves an optional credential-free HTTP(S) URL, while accepting older guests
without the field. A regression verifies preservation/text parity and rejects
invalid protocols and embedded credentials.

A clean local Git merge tree of the review branch and actual `main` passed all
156 tests, formatting, lint and build. Its runtime was temporarily built only on
the owned public-b QA PC. A real named MCP attempt observed the safe link,
omitted unsafe URLs/password/hidden/file controls, filled a generated selector,
clicked Save and observed the supplied value. Its agent report remained
unverified by the owner. The fixture was guest-loopback only, temporary and
unprivileged with a scrubbed environment. No GitHub merge, Piblo dependency,
existing Piblo access or change in guest authority was introduced. The QA PC was
then restored to the reviewed checkout runtime.

### Public operator packaging and licensing

David selected **MIT** for code and skill. Added canonical notices, separate
Sendtry trademark/artwork terms and source dependency notices. The generic
operator is now `skills/sendtry-computer/` with an MIT notice and optional
`agents/openai.yaml`. CLI output and the existing console URL still work;
Docker and the private npm inventory include the canonical folder/notices.

Operator v10 is self-contained, describes its required MCP environment and
explicitly handles structured output, `invalid_tool_result`, task reports versus
owner verification and observation-only planning. It contains no local PC IDs,
credentials or customer examples. Taught exports remain locally bound owner task
content; this code license does not silently license or publish their data.

The unpublished Registry template also used the preceding shared `--state` /
`--access` launch contract. It now requires the private named `--connection`
file, with no authority override, matching new-PC defaults and the actual CLI.
The manifest remains a draft for an unpublished npm package, not registration.

`check:skill` validates actual YAML/frontmatter, naming, metadata, attribution,
known package files, sizes and symlink rejection. Source/installed-package checks
include the skill. No public install count or Registry publication is invented.

## Executed validation

macOS ARM64, Node 24.1.0, Docker Desktop Linux Engine 29.4.3. Docker commands/checks
used the explicit `desktop-linux` context. Two **new** owned isolated Linux ARM64
QA PCs used loopback ports 17990/17991 and a separate artifact catalog. Existing
user/parent containers, remote contexts, volumes and profiles were not changed.
Private evidence stays ignored under `artifacts/public-preview-review-20261027/`.

| Validation                                                | Result                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                                | **156 passed**, zero failures/skips after fixes. Baseline failure is retained above.                                                                                                                                                                                                                                                   |
| `npm run lint`, `npm run build`                           | Passed; syntax build covers **79 JS modules**.                                                                                                                                                                                                                                                                                         |
| `npm run check:skill`                                     | Passed canonical three-file MIT operator and harness metadata.                                                                                                                                                                                                                                                                         |
| Skill-creator `quick_validate.py skills/sendtry-computer` | Passed. Its older compatibility whitelist rejected the optional `compatibility` field; environment requirements use supported string metadata instead.                                                                                                                                                                                 |
| `npm run check:package`                                   | Passed **74-file** private dry-run inventory including legal/skill assets; no package publication.                                                                                                                                                                                                                                     |
| `npm audit`                                               | Zero known advisories in the resolved dependency tree at review time.                                                                                                                                                                                                                                                                  |
| `gitleaks git . --log-opts=--all --redact`                | 76 commits / about 14.63 MB scanned initially, no findings. Detection is bounded by scanner rules; no "secret-free" certification.                                                                                                                                                                                                     |
| Actual `skills@1.7.4` local discovery/install             | Discovered one skill. Project-scoped `--copy --agent codex claude-code cursor` preserved its content/license in a path containing spaces/non-ASCII. Codex/Cursor share `.agents/skills`; Claude uses `.claude/skills`. Telemetry disabled, no global profile changes. This is installer acceptance, not a new three-model trial.       |
| Private installed-package smoke                           | A local MIT tarball installed outside the checkout with production dependencies only, in a path with spaces/non-ASCII. Its real binary printed v0.1.0/operator v10 and passed actual named read stdio check (9 tools). No dev YAML dependency; grant revoked afterwards. This was not npm publication or remote public installation.   |
| Independent skill forward-test                            | Five simulated scenarios: changed revision after activation, hostile video instruction/omitted inputs, unverified reported success, scaled-frame click and read-only request to use host terminal. The evaluator stopped/kept scope and separated owner review correctly. Not a live MCP or reliability benchmark.                     |
| `scripts/assignments-integration.mjs` on both new PCs     | Passed actual named stdio, schema/text parity, readiness/busy control, separate grants/PCs, assignments, cancellation/revocation, review pin and audit privacy.                                                                                                                                                                        |
| `scripts/integration.mjs` on public-b                     | Passed actual modern/legacy MCP, auth/identity, files/browser/terminal/PNG, process limits, takeover/cancellation, Teach/export/reuse and VNC boundaries.                                                                                                                                                                              |
| `scripts/teach-integration.mjs` on public-b               | Passed real four-frame/19,564-byte WebM, active recording/info, PNG sampling/proposal/review/reuse, consent/read boundaries and cleanup.                                                                                                                                                                                               |
| `scripts/desktop-integration.mjs` on public-b             | Passed actual guest MCP/X11 input, key/button cleanup, takeover, read scope, correlated Teach and observed browser result.                                                                                                                                                                                                             |
| Local integration with `main` PR #11                      | Clean merge tree; 156 tests, formatting/lint/build and actual named MCP browser link/selector/result contract passed. This was an integration-only source export, not a branch or GitHub merge.                                                                                                                                        |
| Manual browser review                                     | Desktop and 390×844 skill-install view reviewed, including legal link and readable wrapping. Console skill download completed once. A repeated browser download-event wait timed out; it is not counted as a pass. Final skill and MIT HTTP resources both returned 200 and exactly matched canonical source. No generated UI harness. |

The installer initially rejected the unsupported `--list --json` combination;
using its documented `--list` succeeded. The first installed-path check expected
a separate Cursor folder, but CLI 1.7.4 uses the shared `.agents` directory; the
actual installation was retained/verified. Neither correction changed product
permissions or hid a product failure. Guest rebuilds retained PC/workspace IDs;
legacy compatibility used for tests was restored to disabled.
The additional browser probe initially supplied `value` instead of the declared
fill `text`, then read verification at the wrong response level. Those probe
assertions failed; the corrected client used the actual schemas and passed.

## Publication and remaining product limits

This branch is ready for owner review as a **developer preview**, not a claim
that every release gate is closed. Source/skill use MIT, but repository visibility
and default-branch publication are separate from the license. The existing
keep-private/no-merge boundary still requires an explicit scoped publication
instruction. Do not publish a private taught skill, raw recording or connection
file with the operator.

GitHub private vulnerability-reporting status could not be verified while this
repository is private (API returned 404); configure/verify it for public access.
No public npm/image/Registry release, visibility change, merge, remote host test
or native host permission change was performed. CI remains intentionally disabled.

No new paid Claude/Codex model run or current Windows/Linux host trial is claimed.
Their earlier evidence remains dated. This review does not establish fresh public
remote installation, broad accessibility/novice onboarding, managed backups,
uninstall, unattended task reliability or isolated native macOS/Windows guests.
[Publication](PUBLICATION.md) records the exact next steps without expanding this
repo into a chatbot, cloud gateway or inference service.
