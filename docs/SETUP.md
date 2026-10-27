# Setup and harness integration

## Install/run from this private checkout

Use Node 22.13+ and `npm ci`. No package publication or global installation is
needed. Commands are `node src/cli.js <command>`. `npm start -- <command>` is also
available for owner commands. `init` (`setup` is a compatible alias) checks a local
Docker Linux engine, creates private computer state and registers it in a local
catalog. It refuses to replace an existing config. Names contain lowercase
letters, digits and hyphens; each computer gets a distinct console port.

macOS/Windows defaults to context `desktop-linux`; Linux defaults to `default`.
Pass an explicit local `--context` if your Docker installation uses another
name. Never switch a global Docker context for this product. `doctor` reports the
saved context, host platform and actual engine architecture. An SSH/TCP context
is refused even if its name looks local. Docker Engine 28+ is required because
older engines have documented caveats for localhost-published ports.

For isolated/offline work:

```sh
node src/cli.js init --name coding --context desktop-linux
node src/cli.js start --open
node src/cli.js list
```

For public browsing/dependency downloads, select internet at setup of a new
computer:

```sh
node src/cli.js init --name web --context desktop-linux --network internet
node src/cli.js start --name web --open
```

The new guest can then reach the Internet and potentially LAN/host services
reachable from Docker. There is no implicit native host control or filesystem
sharing. A new owned named volume is used; there is no project/volume reuse.

## Computers, availability and default selection

Run `node src/cli.js doctor --context desktop-linux` before setup when no
computer is registered. It performs read-only Node, local Linux Engine 28+ and
Compose v2+ checks, with no catalog/state creation or guest startup. On Linux,
pass the explicit local engine context. For a selected/default computer, doctor
uses its saved context; a conflicting `--context` is rejected. Use an empty
`--root` for a separate prerequisite check rather than retargeting a saved PC.

Doctor returns JSON `result: ok|warning|blocked`; blocked checks exit 1, warnings
exit 0. Host filesystem space is separate from Docker guest capacity. Only an
owned running guest is measured, through bounded `df -Pk /data/workspace`;
stopped/uncreated guests remain unmeasured. Guest free space under 256 MiB is critical; under
2 GiB free or 98% used warns before recording/rebuild. Host zero available is
blocked; under 256 MiB warns. These diagnostic thresholds do not guarantee build
or task capacity. Output omits raw Docker errors,
credentials and environment dumps. No resource is pruned or removed.

```sh
node src/cli.js doctor --context desktop-linux
node src/cli.js doctor --name coding
```

The catalog is `~/.computer-mcp/registry.json`. It stores only names, computer
UUIDs, absolute state pointers and the default UUID. Computer credentials remain
in each private `computer.json`; files, browser profile and Teach procedures
remain in that computer's owned Docker volume. No LAN scan or Docker-wide
computer discovery occurs.

The first `init` or `register` becomes the default. Creating another computer
preserves the current default. Select it explicitly when you want to switch:

```sh
node src/cli.js list
node src/cli.js use web
node src/cli.js status
node src/cli.js start --open
node src/cli.js config --client codex
node src/cli.js stop
```

| Command                   | Behavior                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `init --name <name>`      | Create/register; allocate an unused loopback port from 17670–17925, or validate explicit `--port`       |
| `list` / `list --json`    | Probe registered identities without claiming control; mark default with `*` / `isDefault`               |
| `use <name>`              | Persist selection for future CLI invocations; can select a currently stopped PC                         |
| `register --state <path>` | Register existing version-1 state without copying its data or overwriting credentials                   |
| `start`                   | Build/start only the selected owned computer; already ready computers keep boot identity and leases     |
| `start --open`            | Start, then authorize/open the same owner's console                                                     |
| `start --rebuild`         | Rebuild/recreate after a source update; an explicit restart invalidates leases and owner sessions       |
| `status`                  | JSON availability, pinned identity, network, context and active controller kind                         |
| `doctor`                  | Read-only prerequisites before creation; saved context, ownership and running guest capacity afterwards |
| `config`                  | Generate stdio configuration fixed to the selected absolute state                                       |
| `skill`                   | Print the exact operator SKILL.md without requiring/creating computer state or contacting Docker        |
| `mcp`                     | Run the stdio bridge for a harness; does not build/start Docker or open a browser                       |

`list` reports **ready** (reachable, pinned, no lease), **busy** (reachable with
an exclusive lease), **starting** (runtime's authenticated `not_ready` response),
**needs-start** (workspace has not been pinned), **unreachable**, or **error**
(identity/config/auth rejection). Unreachable is deliberately not called stopped:
it can also mean startup, unavailable Docker or a missing listener. Probes have a
1.5-second deadline and at most four run concurrently. They do not take control
or retry mutations. A busy computer still supports authorized read operations.

Selection order is explicit `--state`, then `--name`, then the saved default.
If both state and name are supplied they must agree. Selection never falls back
to a different registered PC because the intended one is busy or unavailable.
For checkouts predating the catalog, the known
`<root>/computers/my-computer` or selected name path is still usable; register it
to include it in `list`. Custom old state directories require explicit registration:

```sh
node src/cli.js register --state /absolute/existing/private/state
```

All commands accept `--root /absolute/private/catalog` to keep an independent
catalog and default, useful for development/test ownership. Default creation
paths then become `<root>/computers/<name>`. Use that root consistently for
catalog commands. An absolute `--state` in generated MCP config remains usable
even when a different root/default is selected or its catalog becomes corrupt.
Existing MCP bridges also retain their session and owning computer across `use`.
To connect an agent to another PC, generate a new explicit config and reconnect
its MCP server; changing the CLI default does not retarget an agent.

State paths contain owner/work credentials: do not commit, share or paste their
contents. Protect Windows directories with appropriate user ACLs. In PowerShell
use Windows absolute paths; do not paste POSIX paths into Windows configuration.
No native host permissions or existing host desktop exposure is involved.

`node src/cli.js --version` (or `-v`) prints the installed package version without
setup, state creation or Docker access. Supply only the version flag. Include
this version with sanitized bug reports rather than sharing private state.

`open` authorizes the console using a 30-second, single-use ticket; the ticket is
removed from the browser URL immediately. Opening the bare console URL does not
grant control. Run `open` again after restarting the guest or switching browsers.
The agent's work/read credentials cannot create an owner session or read
owner-only host connection metadata. Do not share
the private host state or copy an authorization URL.

## Claude Code / Cursor / generic stdio

For VS Code, run `node src/cli.js config --name coding --client vscode`
(optionally `--access read`). Merge the emitted `servers.computer` entry into
the intended user/workspace `mcp.json` through VS Code's MCP configuration UI.
Review/approve that exact server separately. Generation writes no editor file,
changes no trust setting and prints no credentials. Do not overwrite other
servers. The JSON/stdio contract is tested; persistent VS Code editor setup is
not certified. See [official VS Code configuration](https://code.visualstudio.com/docs/agent-customization/mcp-servers).

Run `node src/cli.js config --name coding`. It emits:

```json
{
  "mcpServers": {
    "computer": {
      "command": "/absolute/path/to/node",
      "args": [
        "/absolute/path/to/computer-mcp/src/cli.js",
        "mcp",
        "--state",
        "/absolute/private/state",
        "--access",
        "work"
      ]
    }
  }
}
```

These are placeholders; use the exact machine-specific output. In Claude Code
merge the full JSON into a local project `.mcp.json`, or use its
[documented stdio MCP add flow](https://code.claude.com/docs/en/mcp). Its
`add-json` command takes the inner server entry, not the full `mcpServers` wrapper.
In Cursor merge it into `.cursor/mcp.json` in your project, or use its
[MCP settings](https://cursor.com/docs/mcp). Approve/enable this exact server;
loading the skill alone does not approve its MCP connection. In Cursor CLI use
`agent mcp enable computer`, then `agent mcp list-tools computer` to inspect its
actual tools. The [official CLI guide](https://cursor.com/docs/cli/mcp) distinguishes
server approval from tool permissions. Preserve existing entries and keep
these absolute machine-specific paths local. Keep credentials out of harness
config and restart/reload its MCP connection after changing entries. Do not use
`npm start` as the MCP command: npm emits informational stdout; invoke Node
and `src/cli.js mcp` directly. Standard SDK stdio interoperability is tested;
Actual Claude Code and Cursor CLI loading, operator skills and model-driven
read/work paths passed with temporary project configuration. Claude busy/Take
over paths also passed. Cursor editor and Claude Desktop UI registration were
not tested. See [client acceptance](CLIENT-VALIDATION.md) and
[earlier harness validation](HARNESS-VALIDATION.md).

## Codex

`node src/cli.js config --name coding --client codex` emits a TOML
`[mcp_servers.computer]` entry with absolute command/args. Add it using your
Codex installation’s [documented MCP configuration flow](https://learn.chatgpt.com/docs/extend/mcp?surface=cli). Do not overwrite other
servers. Actual Codex CLI loading and model-driven work/read/busy paths passed
with per-invocation MCP configuration. Persistent TUI/IDE setup is not tested;
see [real harness validation](HARNESS-VALIDATION.md). The server protocol does not
depend on an OpenAI API key or SDK.

For read access, add `--access read` to the generator. The server exposes only
read tools and uses a scoped credential enforced at the guest API. Read mode
still reveals the guest’s screen/files/workflows, so it is observation authority,
not public anonymous access.

## Console connection and skills

In the authorized owner console, **Computers** shows the host catalog loaded
by `open`, its default and current computer, plus copyable create/start/open/use
commands. Run those on the host; the guest UI cannot run Docker or change the
catalog. Other PCs are labelled registered, not assumed online. Reopen after
catalog changes; use the copied `list` command for current availability.

**Connect agent** provides the same exact
machine-specific configuration as `config`. Choose Claude Code, Cursor, Codex or
another stdio client, select work/read authority, then copy or download. Client
selection explains where to add the configuration and save the operator skill.
It shows runtime capabilities separately from the selected credential scope,
not a guessed provider-connection status. The first-task preview checks **both
computer and workspace IDs**. Work requests create/read a fresh uniquely named
check file, run `pwd`, observe browser/desktop and release acquired control; an
existing different file must not be overwritten. Read requests only observe.
Stage three, **Start working**, also offers **Give your own task**: goal, success
criterion and optional limits. Planning is the default; read access disables
execution. Copy freshly checks both identities and starts no execution. Review
the agent's actual result and Activity. See [task assignment](TASKS.md).
Registration in a specific harness UI still needs separate validation.

The operator skill downloads as `SKILL.md`. Place it in a folder named
`sendtry-computer` in your local harness's supported skills directory.

From the source checkout, `node src/cli.js skill` also prints its exact Markdown
to stdout with no setup, Docker, state or installation side effects. Save that
output at the project path below; preserve any existing skill. This is the same
artifact as the console download, not a separate installer or global setting.

| Local client | Project skill file                         | Official instructions                                        |
| ------------ | ------------------------------------------ | ------------------------------------------------------------ |
| Claude Code  | `.claude/skills/sendtry-computer/SKILL.md` | [Claude Code skills](https://code.claude.com/docs/en/skills) |
| Cursor       | `.cursor/skills/sendtry-computer/SKILL.md` | [Cursor skills](https://cursor.com/docs/skills)              |
| Codex        | `.agents/skills/sendtry-computer/SKILL.md` | [OpenAI skills](https://learn.chatgpt.com/docs/build-skills) |

Paths are relative to the harness project's root. Restart/reload the client after
saving, then explicitly invoke `/sendtry-computer` in Claude Code or
`$sendtry-computer` in Codex. Confirm it loaded the instructions. Claude project
skill discovery requires the project setting source: empty `--setting-sources`
suppresses it. The isolated real probe used `--setting-sources project` and
successfully invoked the Skill tool. Codex must be able to read its skill file;
disabling all host file-reading tools can prevent loading the full body. A
separate read-only real probe allowed only the project skill read, then verified
guest reports via MCP. Cursor CLI read its `.cursor/skills/sendtry-computer/SKILL.md`
and completed read/work requests after approval of the configured MCP server.
Loading a skill and approving its MCP connection are separate steps. These
checks changed no global MCP/skills configuration. Details and initial setup
failures are in [client acceptance](CLIENT-VALIDATION.md).

Create the named folder and save the downloaded file there. Check that your
client discovers `sendtry-computer`; restart its session if necessary. These
documented paths do not certify harness registration or automatic selection in
this MVP. The stdio bridge must run on the same host as the CLI/state; a cloud or
remote agent needs a separately implemented and authorized adapter. No global
skills directory or existing client configuration is modified by download.

For taught skills,
**Teach & skills** → select a completed recording → correct the procedure and expected result → **Confirm review** → **Export SKILL.md**; use the exact
folder name displayed below the export button. Review the URLs, selectors,
computer identity and missing parameters before installation/use. Interrupted
recordings need a new completed demonstration before export. The action trace omits typed values and recorded terminal commands. Video and
agent-generated drafts may include visible values; remove secrets and use named
parameters before confirming review. Names, goals and paths can also be sensitive.
See [Teach video analysis and review](TEACH.md) for the complete flow.

Each taught export pins the computer, workspace and saved reviewed revision.
Its instructions require fetching the current `workflow_get` record before
effects; a different revision, pending proposal or unavailable record stops
reuse. Download the skill again after changes instead of using older embedded
instructions. Re-export pre-version-4 downloads to include the explicit
post-acquisition review check; await it before any mutation, including navigation.
This is agent guidance; credential scopes, identity pins and leases are the enforced
tool boundaries.

The format follows the [Agent Skills specification](https://agentskills.io/specification):
a skill folder containing YAML-frontmatter `SKILL.md` and Markdown instructions.
The repo uses required name/description and string metadata, without an
`allowed-tools` declaration or a license assertion. This keeps the artifact
usable with the included local skill validator. Actual discovery and installation
paths depend on the harness; exporting a valid file does not prove every
harness has loaded it. No host configuration or global skill directory is changed
by download.

## Troubleshooting and recovery

- **After updating this checkout**: run `start --rebuild` for the selected computer
  to load the updated runtime/UI. A ready `start` preserves its existing runtime
  deliberately. Older guests may reject new owner setup metadata until rebuilt;
  host config and volume identities are retained.
- **Old taught skill needs review**: existing procedures are retained, but export
  now requires owner review and a success criterion. Missing legacy working
  directories are marked `CONFIRM_WORKING_DIRECTORY`, not assumed to be root.
- **Analysis denied**: use work access and enable frame sharing for that specific
  saved video in Skills. Read-only access cannot analyze or propose. Send the
  copied request to a connected vision-capable agent; enabling consent does not
  itself invoke a model. Refresh the selected skill to see a new proposal.
- **Cursor has the skill but no computer tools**: from that project inspect
  `agent mcp list-tools computer`. If this exact configured server is unapproved,
  use `agent mcp enable computer` and reconnect. Trust the intended project only;
  do not enable unrelated servers to fix this connection.
- **Demonstration changed**: refresh the selected skill and review the current
  draft/revision; do not automatically retry a stale write.
- **Video quota/decode failure**: explicitly delete unneeded clips or record
  steps only. An interrupted video may be incomplete; re-record if needed.
- **Computer busy**: another bridge owns the lease. Release it or take control in
  the console. A crashed bridge’s lease expires after at most 90 seconds.
- **Owner access required**: run `node src/cli.js open` with the same name/state.
  Tickets expire after 30 seconds and are consumed once. Configure a default
  browser if the OS cannot launch it.
- **Offline/startup failure**: run `doctor`; inspect only the container named
  `cmcp-<computer UUID>` using the saved explicit Docker context. Never dump its
  environment or config: Docker inspection can reveal the private credential.
- **BuildKit rejects a non-ASCII source path**: some builders fail with
  `x-docker-expose-session-sharedkey` / `non-printable ASCII`. `doctor` warns
  about the source checkout; the CLI adds recovery guidance for that error.
  Use a checkout path containing ASCII characters (spaces were exercised), then
  start using the same explicit `--state /absolute/private/state`. Keep that
  state/volume and generate a new MCP entry for the new CLI path; do not recreate
  the PC or delete data. Moving the source alone does not move private state.
  Unicode state/client paths are a separate boundary from Docker build paths.
- **Windows SSH registry credential error**: Docker's credential helper may need
  an interactive Windows login session even for public image builds. Preserve
  the user's Docker configuration/credential store. Our SSH QA used its own
  disposable config and anonymous public Docker Hub pulls; it did not copy,
  unlock or disable the user's credentials. This does not establish private
  registry authentication over SSH.
- **Port already in use**: `init` automatically skips registered/in-use ports.
  Explicit `--port` must be free. A listener can still appear between the probe
  and start; choose a new name/port instead of stopping another user's listener.
- **Identity mismatch**: check the selected config/volume. The client refuses a
  replacement workspace. Do not disable the check or delete a volume to hide it.
- **Catalog write failure**: a config may have been created before the catalog
  write failed. Inspect that private directory, then `register --state` to recover;
  never reset its credentials. A corrupt catalog fails closed without automatic
  reset. Catalog commands use `registry.lock`; inspect a crashed command before
  removing only that lock.
- **Lifecycle lock after a crash**: confirm no start/stop command for this
  computer remains active, inspect its owned container, then manually remove
  only `<state>/lifecycle.lock`. There is no automatic stale-lock deletion.
- **Desktop disconnected**: the console reconnects on its next refresh; switching
  away from Computer and back also reconnects. An
  expired/taken lease changes the socket to view-only on refresh. Closing a
  cancelled browser tab can require choosing the new tab in browser_snapshot.
- **Large files/directories**: use the bounded APIs for text. Use terminal tools
  for guest operations within the intended task, and watch disk usage.
- **Storage full**: `storage_full`/507 means a complete replacement could not be
  committed. Inspect the destination before retrying, particularly with older
  servers that could leave a partial file. Compare guest `df -h /data/workspace`
  and `df -i /data/workspace` with host/Docker capacity; free host space alone
  does not establish free Docker guest space. Stop writes and plan scoped capacity
  recovery with the owner. Never prune shared Docker resources or delete another
  computer's volume. A killed file worker may leave its uniquely named staging
  file; inspect ownership/activity before explicitly removing it.
- **Terminal stopped or result unavailable**: inspect output, exit status and
  truncation. Cancel requests termination of that operation; changes already made
  can remain. Inspect the affected file/page before retrying. A completed MCP/HTTP
  response with a nonzero exit code is a command failure.

Stop retains the named volume, profile and recordings. There is no automated
cleanup/deletion command. For backups stop the owned computer before exporting
its Docker volume, and back up private host config separately.

## Primary references checked for implementation

- [MCP TypeScript SDK v2](https://github.com/modelcontextprotocol/typescript-sdk)
  and its installed version’s declarations for `serveStdio`, tool schemas and
  per-request cancellation.
- [MCP image tool results](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
  and [prompts](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts)
  for sampled frame delivery and user-selected analysis instructions. The pinned
  SDK handles the negotiated protocol; no raw WebM content type is invented.
- [MCP transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
  for stdio framing and stdout discipline; current v2 discovery is delegated to
  the SDK, not a handwritten protocol shim.
- [Docker port publishing](https://docs.docker.com/engine/network/port-publishing/)
  for loopback bindings and older-engine caveats.
- [Playwright Docker guidance](https://playwright.dev/docs/docker) for guest
  browser dependencies, non-root browser execution and sandbox limitations.

Dependency versions are pinned by the canonical npm-shrinkwrap lock, included
in private artifacts. Open-source release and upstream
license/notice obligations remain an explicit future review.
