# Product gaps and release gates

Updated 14 October 2026 UTC with actual named-client/recovery acceptance,
independent Mac mini checks and [native Windows/Linux QA](HOST-VALIDATION.md).
The market assessment originates at `3f5c6fc`,
11 October (GitHub research snapshot 12 October UTC).
This is a product/architecture review, not a release,
security certification, customer study or promise to implement every item here.
Recommendations below remain proposals except where explicitly marked delivered.
Source remains private and UNLICENSED; [market evidence](MARKET.md) and
[validation](VALIDATION.md) separate
observations from hypotheses and executed checks.

## Overall judgment

Actual Claude/Codex work/read/Teach/reuse, advanced reports and a Claude takeover
are recorded in [harness validation](HARNESS-VALIDATION.md). The newer
[client acceptance](CLIENT-VALIDATION.md) adds Cursor CLI, operator loading in all
three CLIs, six fresh-input repetitions, three deliberate command timeouts,
Claude prompt invocation and graceful CLI-disconnect cleanup. These are bounded
synthetic checks, not a reliability rate or all-client/host support.
The [official Grok comparison](GROK-COMPARISON.md) maps the intended provider scope.

The private developer MVP has a coherent working loop: a persistent dedicated
Linux guest, an existing agent connected by stdio, a shared owner console,
exclusive control, demonstration evidence, reviewed instructions and real reuse
with new inputs. Recorded/reviewed tasks and independent operator acceptance
are meaningful evidence. They do not establish reliable automation across tasks,
low installation friction, repeat customer use or support for every harness/OS.

An owned desktop, MCP and video capture each have established alternatives.
The positioning to test is **teach your existing agent how you work on its own
computer, then check what it actually did**. The first audience should be
developers/automation builders doing recurring tasks that cross browser,
workspace and terminal. Browser-only tasks face simpler substitutes; consumers
who just want an agent on their existing PC face lower-friction native tools.

Keep Sendtry Computer as the product, with `computer-mcp` as its interface/repo.
Distribution reach through coding-agent integrations is an opportunity, not
evidence of millions of users. Validate repeat usefulness before more dashboards,
adapters or infrastructure.

## Existing strengths and evidence

| Product area       | Implemented evidence                                                                                                                     | Practical limit                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Computer ownership | UUID/workspace pins, owned project/volume, persistent files/browser/Teach, catalog/default                                               | Changing default does not retarget connections. Docker container isolation is not a hostile-code VM guarantee.                                            |
| Shared work        | Same guest screen, read/work/owner separation, exclusive leases, takeover/cancellation                                                   | One current writer; no collaborative multi-cursor or cloud identity system.                                                                               |
| MCP                | Official SDK, modern/legacy stdio, 16 tools, resources/prompts, real SSH SDK and Claude/Codex/Cursor CLI acceptance                      | Temporary project/per-invocation registration exercised; editor/desktop UI menus and other harnesses are not certified.                                   |
| Teach              | Real guest WebM, bounded sampled frames, consent, draft/owner review, v5 export and pinned new-input request                             | Owner sends a request to the existing agent. No internal model runner or automatic video-to-skill job.                                                    |
| Execution          | Claude/Codex advanced reports; six fresh-input form repetitions across three CLIs, reload and independent artifact checks                | Synthetic fixtures, not arbitrary task reliability or a matched Teach-versus-prompt evaluation.                                                           |
| Audit              | Local SQLite session/action/outcome/control times, owner filters/export, bounded metadata retention                                      | Declared client labels/shared work credentials do not verify a person/model. Tool completion is not task success.                                         |
| Design             | Sendtry palette, sticky control, grouped navigation, Skills/detail, guided Teach/connect; manual desktop/compact and delayed-copy checks | Full accessibility audit and all delayed-response/view transitions remain pending.                                                                        |
| Recovery           | Storage/process bounds, takeover, three named-client timeouts, graceful Claude termination, restart persistence and read-only doctor     | Hard-crash/client-specific fault coverage is incomplete; hosted CI is intentionally disabled; local gates and manual harness evaluations remain required. |

The preceding CLI closure passed 81 contracts locally and independently on the
Mac mini. Real local guest integration and remote read/work SDK acceptance also
passed. The remote guest intentionally retains its older image; the new host
bridge/CLI was tested there from exact archived commit `210df79f`. The local
guest was rebuilt for the final Cursor setup guidance and retained its pins/data.
Earlier Teach/lifecycle evidence belongs to its recorded source. Exact checks,
source/image boundaries and manual UI scope are in [validation](VALIDATION.md).
After the final rebuild, doctor at 04:24:21 UTC measured 10% guest use and
155,891,904,512 bytes available; the earlier near-full condition is historical.
One idle/view-session snapshot reported 306 MiB memory and image logical size
1,620,852,456 bytes. Cold/warm/active/capture benchmarks remain pending.
No automated UI appearance/E2E harness or competitor runtime was installed.

The newer host slice passed 84 contracts on macOS and Linux ARM64, and 81 with
three documented POSIX-only skips on native Windows x64. Its 17 functional
lifecycle phases passed on Windows 11/Linux AMD64 guests and Ubuntu 24.04/Linux
ARM64 guests. The Windows runner still returned failure: a foreign container
disappeared during its preservation comparison. All original baseline resources
were present at scoped teardown; the failure was retained rather than waived.
Temporary QA directories, tools, guests, images and builder caches were removed
from both hosts after ownership checks. This closes bounded host evidence, not
the broader installation, performance, attribution or public-release gates.

## Ordered delivery gates

[Distribution preparation](DISTRIBUTION.md) now adds standard installed-version
and MCP display metadata, native VS Code configuration output, a private package
allowlist/check, canonical packaged shrinkwrap, contributor/report guidance and
a schema-valid unpublished Registry template. An actual private artifact built
a new guest and passed SDK read/work acceptance outside the checkout on macOS
ARM64. These close specific packaging failures; license, ownership, multi-host
artifact/editor setup, supported update/uninstall and public distribution gates
remain pending. No public package or Registry entry was created.

“Before public preview” means before claiming the corresponding supported path,
not authorization to publish. A narrower first release can advertise only
platforms/harnesses actually exercised. Later items are conditional on pilot need.

| Order                                              | Missing outcome                                                                          | Existing starting point                                                                                             | Next bounded deliverable                                                                                                                                                                                                    | Acceptance evidence                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 — before public preview                          | A new user gets from checkout/prerequisites to a verified task without bespoke help      | `src/cli.js`, `src/connection.js`, `docs/SETUP.md`; pre-creation doctor checks engine/Compose and owned capacity    | Complete a fresh installation walkthrough using the delivered diagnostic; add phase/error recovery and inspectable client registration/removal. Measure each phase; choose packaging after license review.                  | Fresh owned catalogs on each advertised host; actual named harness versions load MCP and operator skill; read and work tasks verified; two client launches/disconnects; default/pins preserved; paths with spaces and non-ASCII tested. Proposed goal: first verified task in ten minutes **after prerequisites**, reported as a target until measured.            |
| 2 — before public preview                          | “Lightweight” has measured startup/storage/runtime evidence and useful capacity recovery | `src/docker.js` resource ceilings, bounds/retention, real ENOSPC and near-exhausted network evidence                | Extend the delivered owned-storage diagnostic for provisioning constraints; cold/warm/idle/active resource report. Design lifecycle update/backup/uninstall around exact owned identities, with inspectable deletion scope. | Report image/build bytes, cold build/warm start, actual RSS/CPU/disk for one idle/active PC, screenshot/stdio latency and capture overhead on specified hardware. Test low guest disk, no daemon, port conflict and unavailable network capacity without deleting unrelated resources. A 1536 MiB cap or a fast SDK trial is not measured footprint/model latency. |
| 3 — first Teach pilot                              | Demonstrations make repeated tasks more useful than an ordinary prompt                   | `runtime/analysis.js`, `teach.js`, `skill.js`, operator v8; video-derived reviewed reuse and six fresh-input checks | A bounded private Teach evaluation and clearer evidence review: sampled timestamps, missing actions, input parameters, observed result and uncertainty. Keep analysis in the selected external harness.                     | Six synthetic task families, five new-input/state variants and two named vision configurations: proposed 60 taught trials plus matched baseline using the same environments/models. Record owner corrections, interruption, changed selectors, budgets and actual result. No pass rate is claimed; paid model scope must be set before running inference.          |
| 4 — after the evaluation exposes attribution needs | The owner knows which taught attempt ended and who/what checked it                       | Metadata-only Activity, exact reviewed revision, pinned handoff, operation/session IDs                              | Design a small task-attempt contract linking workflow/review/computer/session and explicit verifier attribution. Display reported, owner-reviewed and fixture-checked results separately.                                   | Stale/missing review rejected, foreign session/computer cannot finish it, retries are idempotent, restart marks uncertain work, takeover/cancel preserves partial-effect truth. A tool error/success or copied request never becomes verified task success. Do not relabel historical Activity.                                                                    |
| 5 — before multi-agent sharing                     | Agents can be revoked separately and audit attribution matches their granted identity    | Existing read/work/owner credentials, immutable per-process session, lease generations                              | Host-owned per-agent credentials/rotation/revocation with explicit read/work grants; trusted credential identity separated from declared client/model metadata                                                              | Revoke one agent while others retain intended scope; expired/revoked credential cannot mutate/renew/finish; takeover clears active input/processes. Never use client labels as authorization or claim verified model identity. No organization/IAM/cloud service required.                                                                                         |
| 6 — before public distribution                     | Users can legally build on the code and know how to contribute/get help                  | `private: true`, `UNLICENSED`, `SECURITY.md`, brand assets/provenance                                               | Decide code license separately from Sendtry marks/assets; inspect exact dependency/image notices; add contribution/support/version policy and a real private vulnerability channel                                          | Approved license/notices/brand rules, reproducible versioned artifact/setup, clean supported-host checks, credential-free diagnostics and no secrets/customer recordings in examples. Existing private-contact wording must be replaced with a usable reporting path before publication.                                                                           |
| 7 — after pilot demand                             | A skill can be shared or discovered without silently binding to a stranger's PC          | Reviewed exports, Resources/prompts and identity/revision pins                                                      | Separate reusable template from local computer binding; reviewed import/rebinding with capability checks. Evaluate optional Skills over MCP only after actual host/SDK support                                              | Imported instructions treated as untrusted; no video/credentials copied; new owner approves bindings/review; foreign/stale pins fail; manifests/caches preserve source identity. Existing export/download remains fallback. A download is not proof that a harness loaded a skill.                                                                                 |
| 8 — after supported core is useful                 | Additional machines/OSes without misleading isolation claims                             | Adapter seams in [ADAPTERS.md](ADAPTERS.md)                                                                         | One demanded VM/remote/native adapter at a time with its own auth, lifecycle and ownership contract                                                                                                                         | Actual guest OS and host/harness version tested; reconnect/identity/stop/persistence verified. Native mode explicitly controls an existing host, needs specific OS permissions and is not agent-owned isolation. No broad host permissions or exposure are authorized by this review.                                                                              |

## Activation progress and remaining work

Activation has been improved with executed evidence:

1. The owner explicitly chooses a local Docker context. Before creating state,
   explain host OS versus Linux guest, prerequisites and likely capacity errors.
   **Delivered:** `doctor` now runs before a computer exists, checks Node/local
   Linux Engine/Compose, rejects saved-context overrides and distinguishes host
   space from measured owned running guest space. It does not start stopped
   guests, inspect network-pool capacity or register a harness.
2. **Delivered:** credential-free config generation, guided client setup and
   `node src/cli.js skill`, which prints the exact operator without state/Docker.
   Actual Cursor failure exposed separate project trust/MCP approval; guidance
   now explains exact-server enablement. No installer rewrites user config.
3. **Exercised:** fresh temporary projects with spaces/non-ASCII, actual skill
   loading in Claude/Codex/Cursor CLI, read/work results, awaited revision checks,
   timeouts and own-lease cleanup. Catalog contracts separately verify defaults
   cannot retarget a bridge. Fresh human onboarding and supported-host lifecycle
   trials remain necessary; this was an engineering acceptance, not a user study.
4. Add owned recovery instructions and resource measurements. Host APFS free space
   does not establish free Docker guest space. Stop retains state intentionally;
   support needs a safe lifecycle/removal story as catalogs grow.

The remaining host/IDE onboarding, broader task evaluation, inspectable optional
installation/removal and footprint measurements are still pending. No new
adapter, task schema, cloud gateway or automatic runner was added here.

## Task-attempt boundary to design before implementation

The runtime owns identity/revision checks and bounded durable metadata; the
existing harness owns reasoning/effects; the owner console prepares requests and
reviews evidence. A future attempt identifier must be attached to participating
calls by an authorized session rather than inferred from a time range. Existing
tool callers remain valid without an attempt, and Activity semantics stay intact.

Keep separate terminal status (completed/failed/interrupted) and verdict
(unverified/agent-reported/owner-reviewed/fixture-checked). A verifier's identity,
method and scope matter; a DOM assertion is not an independent system-of-record
proof for an external transaction. Only an authorized verifier can attest its
own result. The currently exercised demo checks a rendered card after reload;
it is not a financial/healthcare or remote-backend integrity certification.

Before code, define versioned schemas, session/computer/workflow binding,
idempotency, lease revocation, boot/crash recovery, bounded retention and
authorization. Proposed retries must not repeat uncertain effects automatically.
Use a new store/schema with explicit migration or an independently versioned
bounded store; do not silently turn the current audit into a task-payload database.
Re-export/import and pinned revision races need contract tests. Presentation
continues to use manual visual review.

No task input/content, model prompt, screenshot or video should silently enter
Activity. Pilot reports can use authorized synthetic data and separate retention;
actual customer recordings require their own consent/storage rules. Security
boundaries are enforced by credentials/leases/containment, while agent skill text
remains procedural guidance.

## Design and distribution work

Keep the established Sendtry visual system. The guided Teach/connection and
screen-first session/control and grouped-navigation slices are implemented; see
[the current direction](DESIGN-DIRECTION.md). Owner-access recovery also clears
late responses from the old session. Actual session invalidation/recovery passed
after an owned guest restart; a held info response followed by pagehide performed
zero late clipboard writes in the manual task-form check. Other delayed-response
paths and a full accessibility audit remain to be exercised.
Every important state needs an obvious next action and accurate language: recording, consent
allowed, proposal waiting, reviewed, request prepared, actual attempt interrupted.
Avoid an activity dashboard claiming “success” from tool counts.

Provide two or three reviewed synthetic examples with clear prerequisites,
parameters, expected output and recovery. Choose tasks spanning more than one
surface (for example browser → contained file → terminal → browser) only when
supported input/download/upload paths exist; proposing an example does not claim
those missing paths are implemented. Publish reproducible evidence after release
authorization. Automatic login/session transfer, credential vaults and secret
redaction are separate integrations, not implied by local video storage.

Current observed limits worth fixing before broader distribution include
download/upload ergonomics, drag/clipboard support, review history/diff and
portable skill import. Their priority should follow real task failures. Automatic
recording redaction would need its own proof and consent; until then the UI must
keep its explicit warning that visible secrets can enter video/model frames.

Community work is product work: contribution setup, architectural boundaries,
bug templates with safe diagnostics, releases/support policy and external
contributor experience. License and trademark decisions remain David's pending
release choices; this review selects neither license nor publication date.

## Pilot and decision evidence

Propose 5–10 willing developers already using coding agents. Recruiting or
contacting them is not part of this review's authorized work. Observe fresh
activation, first verified task and repeat use later, with their chosen harness
and a narrow safe task. Track elapsed wall time, help needed, task result,
interventions and whether Teach saved effort compared with a prompt/script.
Operational tool time alone is not total task time, model cost or human effort.

Continue the direction if users repeatedly choose the reviewed Teach loop and
can install/recover without bespoke help. If they only need a browser, reduce the
default burden or evaluate an adapter rather than making the desktop mandatory.
If repeated taught attempts fail or require as much correction as a fresh prompt,
improve evidence/parameters/verification before expanding features. A pilot can
invalidate the positioning hypothesis; GitHub stars cannot settle it.

Hosted CI payments/spending remains an external blocker. The latest local Docker
capacity check is healthy; available capacity must still be rechecked for builds.
This document does not alter billing, Docker defaults/resources, repository
visibility, licenses, host permissions or any production system.
