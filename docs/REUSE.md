# Reuse assessment (read-only)

Inspected local source in private `bujosa/bot-computer`, its `bot-computer-polish`
worktree and `bujosa/desk`’s `desk-polish` README/contracts. No files, branches,
PRs, profiles, running containers or databases in those projects were modified.
No BackChannel repository was used.

## Findings and decision

`bot-computer` already supplies Ubuntu, Chromium/Playwright, Openbox,
noVNC/websockify, an authenticated control API and record/replay. Its current
control layer also owns bots, inference providers, billing/connectors, routines,
libraries and SQLite/FTS. Piblo’s MCP bridge is bot-scoped and its runtime desktop
is shared by the workspace’s bots. That is a different identity/ownership model
from one independent computer per MCP agent/session.

The repository remote is `bujosa/bot-computer`, confirming David’s repository
ownership, but GitHub reports **no license** and no license file was found in the
inspected checkout. Owner access does not resolve future public redistribution
rights for contributions/assets. Consequently this MVP uses no copied Piblo
source/assets, no package dependency on that private repo and no imported state,
credentials, env files or customer data. The implementation is independent.

| Pattern learned                                 | Implementation here                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| Visible browser and lightweight Linux desktop   | Pinned upstream Node/Playwright + Xvfb/Openbox/VNC image                                |
| One control port rather than public VNC/CDP     | Loopback-only API/UI with separately authorized VNC view/control                        |
| Workspace identity pinning                      | New computer/workspace UUID pair with fail-closed volume/client checks                  |
| Lease-aware operations                          | Dedicated per-computer session lease plus human takeover/cancellation                   |
| Human teaching events and reusable instructions | New bounded recorder and JSON workflows; values omitted, no Piblo replay/backend import |
| Persistent data volume                          | New owned volume for files, profile and root-private workflows                          |

SQLite/WAL/FTS is unnecessary for a capped local workflow library; atomic JSON is
smaller and sufficient for the current single-runtime writer. There is no code
sharing package yet. [ADAPTERS.md](ADAPTERS.md) describes future integration through
a reviewed adapter rather than a duplicate Piblo backend.

## Upstream dependencies

MCP uses the official v2 SDK; browser automation uses Playwright. noVNC is sourced
from its official **v1.6.0 GitHub tag archive**, pinned with integrity in the
lockfile. Its ESM source bundles correctly, while the npm 1.6.0 CommonJS package
has a top-level-await incompatibility encountered during this implementation.
The generated noVNC bundle includes a source/license pointer, and its unmodified
package license is served at `/novnc/LICENSE.txt`. esbuild bundles that library
only; the product UI remains plain browser modules/CSS.

This private code is `UNLICENSED`; dependency licenses still apply. Before any
public/open-source distribution, decide this repository’s license, audit
third-party source/notice requirements (including noVNC MPL-2.0 and Linux image
packages), and establish packaging, signing, update and release policy. There
has been no public package release, visibility change or license assertion.

## Sendtry brand reuse

David explicitly requested this independent product under his Sendtry brand.
The existing Sendtry identity was inspected read-only: warm paper surfaces, salmon
accent, ink text and the send-loop mark. Only the owner-provided mark/wordmark
SVG assets were narrowly reused; the wordmark viewBox trims unused whitespace.
No Sendtry product/backend code, configuration, credentials or customer data was
copied. [Asset provenance](../ui/assets/README.md) records the source and pending
public trademark/asset terms. Piblo stays a separate product and integration seam.
