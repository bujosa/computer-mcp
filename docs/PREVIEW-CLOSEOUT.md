# Source preview closeout — 2 November 2026

The complete repository/history is already public under MIT for code and the
generic operator, with separate Sendtry brand terms. PR #16 integrates the
English-only walkthrough and documentation hub. This closes a **local developer
source preview**, not a managed desktop service or a public package/image release.
The npm manifest remains private, CI remains disabled, and no Registry entry,
prebuilt image, GitHub Release or production deployment is published.

## Exact scope

Closeout starts from `8ec379f`, the merge of PR #16. The executable CLI, MCP,
runtime and UI sources are unchanged by the closeout dependency/documentation
patch. The production dependency lock entries are also identical. Private QA
state, screenshots/video, credentials and raw operation records are ignored and
excluded from the package inventory.

## Dependency finding and correction

A fresh install reported five moderate development findings rooted in
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), affecting
minimatch before 11.0.1 through ESLint. Production-only audit had zero findings.
The closeout pins minimatch **11.0.1** through an npm override and updates the
canonical shrinkwrap; all current dependants are development-only. The complete
audit then reports zero known advisories. That is bounded detection, not a
security certification.

The override crosses a major version because the upstream patch uses a new
matcher. Actual ESLint source/UI/runtime selection, ignored artifact/vendor paths
and a deliberately invalid lint input were checked, in addition to repository
lint. `npm ls --all` succeeds with no invalid dependencies. Retain the override
until ESLint adopts a patched compatible matcher; review future dependency
changes rather than assuming compatibility. No `npm audit fix --force`, runtime
dependency upgrade or permission change was used.

## Fresh host/guest acceptance

Host: macOS ARM64, Node 24.1.0. Explicit local Docker `desktop-linux`, Engine
29.4.3 and Compose 5.1.3. Two new private PCs used distinct identities, projects,
volumes and loopback ports; one isolated and one Internet-enabled. Cached build
layers were available, so these timings are not a cold-install benchmark.
No default context, unrelated running container, parent QA profile or remote
machine was changed.

One post-test idle snapshot measured 300 MiB and 293.5 MiB for the two guest
containers, excluding relay, Docker VM and host overhead. This is one observation,
not a peak-memory, cold-start, inference-latency or sustained-load benchmark.

`npm run test:e2e -- --context desktop-linux` passed all **17 phases**:

- Empty catalog and invalid CLI options; explicit creation without startup.
- Start/doctor and actual MCP/auth/files/terminal/browser/Teach in both guests.
- Two PCs, default switching, pinned stdio and independent leases/files.
- Reviewed procedures and real private WebM capture, decoding and deletion.
- Persistent owner-only Activity, MCP attribution, timings and read scope.
- Bounded native Linux guest input, takeover, Teach privacy and reuse.
- Credential-free client configuration and idempotent registration.
- Internet access on the Internet PC and blocked egress on the isolated PC.
- Restart persistence of identity, files, browser profile/note, Teach and Activity,
  with the old lease invalidated.
- Reopening a closed guest browser under a lease without rebooting its PC.

This suite explicitly enables legacy access in its newly owned compatibility
fixtures. After that run, only those two PCs were restarted and legacy access was
disabled. `scripts/assignments-integration.mjs` then passed against those fresh
guests with actual named stdio: 20 work/9 read tools, structured/text parity,
readiness states, separate PC/grant identity, simultaneous attempts, owner-only
assignment, report versus independent owner verification, cancellation drain,
revocation, reviewed method pins and audit privacy. Its temporary named grants
were revoked. Compatibility testing does not change the new-PC named-only default.

## Local release gates

Clean `npm ci`, format, lint, build (79 JavaScript modules), all **157 tests**,
operator v10 validation and package inventory (**77 allowlisted files**, still
private/unpublished) passed. The extra test checks the lint matcher boundary.
The six touched documentation pages passed 121 local link/heading checks, and
remain English-only. No GitHub Actions job was dispatched.

## Limits and release boundary

No new paid-model, Windows-host, Linux-host, isolated Windows/macOS guest or
manual visual acceptance is claimed by this closeout. Earlier
[named Claude/Codex trials](ASSIGNMENT-VALIDATION.md),
[client acceptance](CLIENT-VALIDATION.md) and
[manual design review](DESIGN-DIRECTION.md) remain dated evidence. The final
changes do not alter the UI. This is not a general task-success rate.

Teach remains demonstration → explicitly shared evidence → external agent
proposal → owner review → new assigned attempt → independent result check.
Recording/copying a request does not start inference or train a model.

The public starting point is the [walkthrough](WALKTHROUGH.md), followed by
[daily operations/update/retirement](OPERATIONS.md) and [recovery](RECOVERY.md).
Managed backup/restore/erasure, automatic updates, a broader reliability pilot,
native/VM/remote adapters and a versioned package release remain future work.
They are not hidden behind a claim that this preview is a finished managed service.
