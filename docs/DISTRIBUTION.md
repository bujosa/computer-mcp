# MCP distribution and release preparation

Current update, 27 October 2026: code and generic skill now use MIT. The
operator has a standard `skills/sendtry-computer/` package; see
[public source/skill installation](PUBLICATION.md). The full repository/history
and reviewed default branch are public. npm, Registry, GitHub Releases and
prebuilt images remain unpublished. The dated
research/private-artifact record below is historical, including its then-current
UNLICENSED metadata; it does not override the current root LICENSE.

Research checked 14 October 2026 against primary project documentation and
[pinned GitHub metadata](research/distribution-20261014.json). This is a
distribution study, not a customer survey or reliability comparison. Competitor
servers were not installed or executed; no source implementation was copied.

## What established MCPs ship

| Project                                                                                | Observed distribution                                                                                   | Useful pattern for Sendtry Computer                                                                           |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp)                | npm/npx, client examples/install links and a Registry manifest                                          | Put the smallest working installation first; separate configuration and capabilities from detailed reference. |
| [GitHub MCP Server](https://github.com/github/github-mcp-server)                       | Hosted HTTP endpoint plus local Docker/binary paths, client guides and permission/toolset documentation | Explain transport, credentials and local versus hosted responsibility; a remote URL is a distinct service.    |
| [Context7 MCP](https://github.com/upstash/context7/blob/master/packages/mcp/README.md) | Remote endpoint and local npm/npx, client-specific setup and troubleshooting                            | Offer exact client formats and diagnose runtime/path differences instead of claiming universal setup.         |

At the snapshot, these public repos had approximately 38k, 34k and 63k stars.
Stars indicate visibility, not active installs, safe permissions or task success.
The report retains exact counts/revisions rather than turning them into a support
claim. Common packaging choices are ecosystem conventions, not MCP requirements.

The [official MCP Registry](https://modelcontextprotocol.io/registry/about)
stores metadata for publicly accessible servers; it remains in preview. Its
[publishing guide](https://modelcontextprotocol.io/registry/quickstart) ties npm
`mcpName` to the manifest and authenticated namespace. A valid schema alone does
not prove package/namespace ownership or registration. The Registry is discovery;
it does not provision our user's computer, replace consent or host our runtime.

## Chosen boundary

Keep **Sendtry Computer** as the display brand and `computer-mcp` as the stable
CLI/MCP technical name. The existing owner CLI explicitly creates/starts a
computer. A client then launches its pinned bridge by **stdio**. The bridge does
not build Docker images or select a different default PC during connection.
The [stdio contract](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
reserves stdout for protocol messages. No public HTTP endpoint, OAuth service,
remote adapter or cloud provisioning is added to imitate hosted products.

Absolute Node/CLI/state paths remain the recommended client launch configuration.
They avoid working-directory assumptions and runtime package downloads in the
MCP startup deadline. Public npm/npx can be an installation channel after release
approval; it should use a reviewed exact version rather than retargeting an
existing computer through an implicit update. Skill loading and MCP approval
remain separate actions.

## Delivered privately

- Standard npm repository/homepage/support keywords and proposed Registry name.
  `private: true`, `UNLICENSED` and the existing package scope remain intact.
- `--version`/`-v`, sourced from installed metadata before setup. MCP initialization
  reports the same version plus title **Sendtry Computer**, description and repo
  website. This follows [MCP initialization metadata](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle).
- `config --client vscode`: native `servers`/`type: stdio` JSON, alongside existing
  generic JSON and Codex TOML. Generated paths stay pinned; no credentials or
  automatic editor/global-settings writes. See [VS Code's contract](https://code.visualstudio.com/docs/agent-customization/mcp-servers).
- An explicit npm file allowlist and `check:package` dry-run/privacy inventory.
  Only runtime/source/required build assets and selected user docs are included;
  local computer state, QA artifacts, tests, env files and generated vendor bundles
  are excluded. Source content still requires secret and dependency-notice review.
- Canonical `npm-shrinkwrap.json`: npm includes this CLI lock in a tarball, whereas
  `package-lock.json` is not packaged. Docker now consumes the same lock in a
  checkout and installed artifact. See [npm's CLI lock guidance](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json/).
- A non-published [Registry template](registry/server.template.json), using the
  official dated schema, exact package version and required private named-connection file.
  Create a read grant for observation; work grants need owner-assigned tasks.
  The template no longer points at owner state or offers an access override. It declares no remote endpoint. The proposed
  `io.github.bujosa/computer-mcp` name has not been registered/reserved.
- Private contributor, bug-report and PR guidance, including safe diagnostics,
  explicit QA ownership, validation and rollout notes.

## Check the private artifact

Run source checks first. These commands create only a local tarball under ignored
artifacts; they publish nothing:

```sh
npm ci
npm run check:package
mkdir -p artifacts/package-review
npm pack --ignore-scripts --pack-destination artifacts/package-review
```

Inspect the tarball inventory before transferring it to an authorized private
recipient. `check:package` is an inventory guard, not proof of licensing or a
vulnerability scan. Do not run unscoped `npx computer-mcp`: an unrelated package
could use that name. There is no advertised public install command today.

To test an artifact, install the exact file in a **new private test project**
with `npm install /absolute/path/to/the.tgz --ignore-scripts --no-audit`, then run
its local `node_modules/.bin/computer-mcp --version` on POSIX. On Windows use
`node_modules\.bin\computer-mcp.cmd --version`. Use no global install/link and do
not overwrite an existing project. A stable installation must remain available
at the absolute path recorded in its MCP entry; deleting it breaks that entry.
Local artifact installation is separate from starting the guest.

For a Docker lifecycle test, supply an explicit local context and new private
catalog. Inspect the exact owned UUIDs before cleanup. `stop` retains data and
other resources; the QA operator must record a separately authorized teardown.
Existing guests and client configs need no migration for these bridge metadata
changes. A source checkout update renames the lock; use `npm ci` normally.

## Executed acceptance, 14 October

PASS source `npm ci --ignore-scripts`, format/lint/build (58 modules), 88/88
contracts without skips and `check:package`. The canonical shrinkwrap's complete
dependency data matches the prior lock; no dependency version was changed.
PASS Python `jsonschema` validation of the draft against the official dated
schema (including formats). The first description exceeded its 100-character
limit and was shortened before validation. This proves syntax, not Registry
ownership or public package availability.

The actual private tarball contained 56 files, 150,358 compressed bytes and
554,853 unpacked bytes, SHA256
`314cf108e8b6469eb54e47c15dcff5f9176dc76dc221245efb525755b80080d8`.
These measure source/assets, excluding installed dependencies and the guest
image. Later documentation and generated-lock formatting edits are not part of
this tarball; the complete dependency data is identical.

PASS installation in a new private temporary project outside the checkout, with
spaces in the install path, isolated npm configuration/cache and no global link.
Its real local binary printed the exact version/operator skill. That installed
package created and built an offline Linux ARM64 guest using its packaged
Dockerfile, shrinkwrap and assets on macOS ARM64, Node 24.1.0 and local Docker
29.4.3. PASS generated VS Code read/work entries launched the installed bridge
through official SDK 2.3.1 clients: legacy/modern initialization metadata, seven
read/16 work tools, pinned identities, a written/read file, terminal output,
browser snapshot, PNG and lease release. This is executable configuration
acceptance, not a VS Code editor UI/trust walkthrough or named-model evaluation.

Initial source/QA fixtures assumed macOS `/var` and `/private/var` were different
paths; the assertions were corrected to compare canonical paths. No runtime path
containment was weakened. The package inventory initially caught the missing
shrinkwrap in the explicit file allowlist; it was added before packing.

PASS exact-owned cleanup after fresh resource/marker inspection: QA guest/relay,
networks, volume, image tags, builder/cache, isolated npm tools/cache/project and
temporary root removed. Original container identities/states, networks, volumes
and effective Docker context matched the before snapshot. The existing review
PC remains healthy, with its original image/data; bridge metadata needs only a
new MCP connection. Private logs/reports are ignored under
`artifacts/distribution-20261014/`. No UI presentation change or generated UI
test harness was added. New artifact installation on Windows/Linux hosts remains
pending; earlier source-host evidence is not reused as package acceptance.

## Gates before npm, Registry or image publication

1. Code/skill MIT and separate Sendtry brand terms are delivered. Approve the exact
   image notices before any binary image release. The private GitHub
   security-reporting channel is now enabled; public status and sign-in redirect
   are verified, with no external-account test submission.
2. Verify npm scope/package and Registry namespace ownership. A future Sendtry npm
   scope must be proven; metadata does not reserve it. Do not rename or publish
   based on the display brand alone.
3. Repeat fresh artifact installation/lifecycle on advertised host versions and
   named editor/desktop setup; test update, backup and exact-owned uninstall.
   Docker/Chromium remain prerequisites and a substantial guest download. A small
   source tarball is not a light desktop image or ten-minute cold-install proof.
4. Decide the separately authorized CI/release policy; pin a reviewed version, record changelog/support policy,
   hashes and provenance. No release/publish workflow is enabled in this change.
5. Publish only after explicit authorization, then register the actual released
   package using verified ownership and current Registry requirements. No
   speculative registry badge, one-click public install or hosted-service URL.

Public source checkout and generic skill installation are available now. Public npm, prebuilt OCI/MCPB artifacts,
GitHub releases and Registry publication remain pending. An OCI image containing
the MCP bridge alone is not an owned desktop; mounting a Docker socket into it
would add host authority and needs a separate architecture review.
