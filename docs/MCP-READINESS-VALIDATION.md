# MCP readiness and structured results — 17 October 2026 UTC

This acceptance covers the host-side connection check and output contracts on
top of [named assignments](ASSIGNMENT-VALIDATION.md). It is a bounded engineering
check, not a 10/10 rating, security certification or arbitrary-task guarantee.

## Environment and scope

macOS ARM64, Node 24.1.0 and the existing dedicated Linux ARM64 QA guests
`assign-a`/`assign-b` on loopback ports 17880/17881. Every ownership/engine check
used the saved explicit `desktop-linux` context. Their computer/workspace UUIDs
are recorded in the assignment acceptance; neither changed. This slice changes
host protocol/CLI contracts, not guest execution code or UI presentation. The
existing guest images were retained. No native host permission, default Docker
context, unrelated container or remote host was changed.

## Executed checks

| Check                                                                                                   | Result and boundary                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                                                                              | 147 passed, zero failed/skipped, including 14 new readiness/output cases. Uses actual SDK stdio children and synthetic HTTP fixtures for ready/read/assignment/busy, revoked/foreign pins, missing/malformed/public/FIFO grant files, unavailable runtime, foreign task attribution, protocol deadline and sanitized invalid output on legacy/modern MCP.                                                                        |
| `npm run format:check`, `npm run lint`, `npm run build`                                                 | Passed; syntax/build covered 75 JavaScript modules.                                                                                                                                                                                                                                                                                                                                                                              |
| `npm run check:package`                                                                                 | Passed private dry-run inventory: 68 files; no package publication.                                                                                                                                                                                                                                                                                                                                                              |
| `node scripts/assignments-integration.mjs STATE_A STATE_B artifacts/mcp-readiness-20261017/assignments` | Passed on both owned PCs. All discovered named tools advertise object output schemas; successful execution outputs have equal structured/text JSON. New `check` accepted no-assignment, assigned and busy states without acquiring/releasing the existing attempt's lease. Existing simultaneous-PC, task/report/owner verification, cancellation, review revision, revocation and metadata-only audit contracts passed.         |
| `node scripts/integration.mjs STATE_B artifacts/mcp-readiness-20261017/legacy`                          | Passed actual modern/legacy stdio, contained files, browser actions, screenshot PNG with preserved image-first order, bounded terminal, takeover/cancellation, Teach/export/reuse and owner/auth boundaries. Ordinary structured/text JSON parity asserted.                                                                                                                                                                      |
| `node scripts/teach-integration.mjs STATE_B artifacts/mcp-readiness-20261017/teach-active`              | Passed active recording/workflow/info observation before instructions exist, plus real desktop WebM (15,761 bytes, four encoded frames), PNG extraction through MCP, proposal/review, stale/consent/read boundaries, supplied-file reuse, export, video removal and encoder cleanup.                                                                                                                                             |
| `node scripts/desktop-integration.mjs STATE_B artifacts/mcp-readiness-20261017/desktop`                 | Passed actual MCP/X11 guest input, key/button cleanup, takeover cancellation, read scope, browser-correlated Teach and fresh supplied-value browser result. Ordinary structured/text parity asserted. This is a native guest input/security contract, not an owner UI appearance harness.                                                                                                                                        |
| Fresh production dependency install                                                                     | Copied distributable source modules and lockfile to a private path containing spaces/non-ASCII; `npm ci --omit=dev --ignore-scripts`. ESLint was absent. This installation's actual CLI/stdio accepted newly created read/work grants (9/20 tools), rejected wrong workspace pins and rejected both grants after owner revocation. The official client SDK is now a production dependency, pinned at the same version as before. |

`STATE_A/B` were the existing explicit owned state directories under
`.computer-mcp/assignment-e2e-20261017/computers/`. Test grants were written only
inside their isolated QA/artifact catalogs and revoked afterwards. Legacy access
was explicitly enabled on assign-b for the compatibility/media/input suites and
restored to disabled. Both PCs ended ready, without a control lease or active
Teach session, with original IDs and legacy access disabled. Private recordings,
grant files and raw evidence stay ignored under the QA/artifact directories.

The first production-install fixture omitted `runtime/store.js`, imported by
the CLI config module. That incomplete copy failed before protocol startup;
the fixture was corrected to include runtime sources and passed. This was not
a missing package asset or runtime product failure. It is retained here so the
first failed acceptance is not hidden.

## What the new contracts establish

Every tool has an advertised success schema. Core identity, access,
execution, task, attempt, report and owner-verdict fields are typed; evolving
Teach trace/review/video and limit metadata remain JSON objects. Unknown
ordinary top-level fields are stripped. Images stay in MCP image blocks, with
only MIME/timestamp metadata in structured JSON. Malformed successes become a
fixed `invalid_tool_result` error without rejected payload/parser leakage.
Because output validation follows runtime execution, it cannot undo an effect
or authorize automatic retry.

The new `check` launches the real scoped stdio bridge and observes identity and
task discovery. It does not run a model, create/start a task, sample images or
take control. It can add declared `computer-mcp-check` presence/Activity
metadata; this is not a verified model/person identity. A ready result is a
snapshot of connection acceptance, not a reservation or future task success.

## Limits and work remaining

No new paid Claude/Codex run was performed for this host protocol slice. The
prior actual model Teach → review → named assignment → independent verification
remains documented separately, with its exact versions and results. This run
does not re-certify those models against the new structured response format.

No UI source changed; the preceding manual desktop/mobile review remains its
evidence. No new UI test harness was generated. Windows/Linux host execution,
native isolated macOS/Windows guests and persistent IDE registration were not
tested in this iteration. The fresh install reuses existing owned QA guests;
it is not a cold Docker build or novice onboarding study.

Backup/restore/uninstall/update distribution, broader Teach reliability pilots,
accessibility/IDE onboarding and measured resource footprint remain release
gaps in [readiness](READINESS.md). The repository/package stays private and
UNLICENSED. CI remains manually disabled; no workflow dispatch, merge, release
or deployment was performed.
