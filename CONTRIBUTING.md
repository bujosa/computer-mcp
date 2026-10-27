# Contributing to the private preview

Sendtry Computer is currently private and UNLICENSED. This guide is for
authorized collaborators. It does not grant public redistribution rights or
select a future open-source license. Sendtry marks/assets are a separate release
decision from the code license.

## Development

Use Node 22.13+ and `npm ci`. `npm-shrinkwrap.json` is the canonical dependency
lock; it is included in a private npm tarball so Docker builds work outside this
checkout. Do not maintain a second `package-lock.json`.

```sh
npm run format:check
npm run lint
npm run build
npm test
npm run check:package
```

The package check is a dry-run inventory, not publication or a Docker test.
GitHub's `Check` workflow is intentionally disabled for this private development
phase; its repository trigger is manual-only in this change. Run these local
gates before a commit/PR. No deployment or publishing workflow is enabled. See
[manual validation and CI policy](docs/QA.md#manual-validation-and-ci-policy).
For an authorized, new QA computer on a local engine, see [QA](docs/QA.md).
Use an explicit context and new catalog. Preserve existing computers, volumes,
profiles and Docker defaults. Never target a personal/shared active computer.
An installed private tarball can be exercised using [distribution QA](docs/DISTRIBUTION.md).

Read [architecture](arquitecture.md) before changing module boundaries, identity,
permissions or persistence. Keep host lifecycle separate from MCP tools and the
guest API. Add meaningful protocol/security/backend tests for changed contracts.
UI presentation is reviewed manually; do not generate appearance/navigation/E2E
UI harnesses. Keep the existing runtime and data ownership boundaries.

## Changes and review

Use an isolated worktree if the checkout is dirty. Name branches `bujosa/<purpose>`,
use Conventional Commits and stage only your changes. Open a focused PR against
the repository's intended base; include behavior, exact validation/skips,
compatibility, data impact and rollback. Do not push protected branches, bypass
checks, merge, publish or deploy without the applicable authorization.

Check both client-facing metadata and tool behavior when changing the MCP bridge.
`--version` and MCP initialization use the installed package version.
Configuration output must contain absolute pinned paths and no credentials.
Do not make a harness connection provision a computer or choose another user's PC.

## Safe reports

Use the private issue templates for bugs and proposals. Include package/client
versions, host and actual guest OS, expected/observed behavior and reproducible
steps. Share only sanitized diagnostic status/check summaries. Private state,
tokens, owner URLs, Docker environment dumps, workspace paths, recordings and
customer data do not belong in issues or PRs. Security reports follow
[SECURITY.md](SECURITY.md); a usable public private-reporting channel remains a
gate before any public release.

## Distribution

`private: true` remains enabled. The manifest in `docs/registry/` is a draft;
metadata/schema validation is not Registry registration or ownership approval.
No workflow publishes npm packages, containers, releases or Registry entries.
The [distribution policy](docs/DISTRIBUTION.md) records pending license,
namespace, notices, artifact and support decisions.
