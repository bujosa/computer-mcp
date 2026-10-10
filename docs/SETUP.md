# Setup and harness integration

## Install/run from this private checkout

Use Node 22.13+ and `npm ci`. No package publication or global installation is
needed. Commands are `node src/cli.js <command>`. `npm start -- <command>` is also
available. `setup` checks a local Docker Linux engine, then creates a new private
state directory. It refuses to replace an existing config. Names contain
lowercase letters, digits and hyphens; different computers need different ports.

macOS/Windows defaults to context `desktop-linux`; Linux defaults to `default`.
Pass an explicit local `--context` if your Docker installation uses another
name. Never switch a global Docker context for this product. `doctor` reports the
saved context, host platform and actual engine architecture. An SSH/TCP context
is refused even if its name looks local. Docker Engine 28+ is required because
older engines have documented caveats for localhost-published ports.

For isolated/offline work:

```sh
node src/cli.js setup --name coding --context desktop-linux --port 17670
node src/cli.js start --name coding
node src/cli.js open --name coding
```

For public browsing/dependency downloads, select internet at setup of a new
computer:

```sh
node src/cli.js setup --name web --context desktop-linux --port 17671 --network internet
node src/cli.js start --name web
```

The new guest can then reach the Internet and potentially LAN/host services
reachable from Docker. There is no implicit native host control or filesystem
sharing. A new owned named volume is used; there is no project/volume reuse.

`--state /absolute/private/path` selects a computer directory directly. Use it
consistently across commands. This path contains work and owner credentials: do not commit,
share or paste its contents. Protect Windows directories with appropriate user
ACLs. In PowerShell use Windows absolute paths; do not paste POSIX paths into a
Windows configuration.

`open` authorizes the console using a 30-second, single-use ticket; the ticket is
removed from the browser URL immediately. Opening the bare console URL does not
grant control. Run `open` again after restarting the guest or switching browsers.
The agent's work/read credentials cannot create an owner session. Do not share
the private host state or copy an authorization URL.

## Claude Code / Cursor / generic stdio

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
use the documented stdio MCP configuration/add flow. In Cursor place the entry
in its documented MCP configuration UI/file. Keep credentials out of harness
config and restart/reload its MCP connection after changing entries. Do not use
`npm start` as the MCP command: npm emits informational stdout; invoke Node
and `src/cli.js mcp` directly. Standard SDK stdio interoperability is tested;
Claude Code/Cursor UI registration is not tested in this MVP.

## Codex

`node src/cli.js config --name coding --client codex` emits a TOML
`[mcp_servers.computer]` entry with absolute command/args. Add it using your
Codex installation’s [documented MCP configuration flow](https://learn.chatgpt.com/docs/extend/mcp?surface=cli). Do not overwrite other
servers. Codex harness registration itself is pending manual validation; the
server protocol does not depend on an OpenAI API key or SDK.

For read access, add `--access read` to the generator. The server exposes only
read tools and uses a scoped credential enforced at the guest API. Read mode
still reveals the guest’s screen/files/workflows, so it is observation authority,
not public anonymous access.

## Troubleshooting and recovery

- **Computer busy**: another bridge owns the lease. Release it or take control in
  the console. A crashed bridge’s lease expires after at most 90 seconds.
- **Owner access required**: run `node src/cli.js open` with the same name/state.
  Tickets expire after 30 seconds and are consumed once. Configure a default
  browser if the OS cannot launch it.
- **Offline/startup failure**: run `doctor`; inspect only the container named
  `cmcp-<computer UUID>` using the saved explicit Docker context. Never dump its
  environment or config: Docker inspection can reveal the private credential.
- **Port already in use**: choose another port with a new setup name. Do not stop
  the other listener/container to make room.
- **Identity mismatch**: check the selected config/volume. The client refuses a
  replacement workspace. Do not disable the check or delete a volume to hide it.
- **Lifecycle lock after a crash**: confirm no start/stop command for this
  computer remains active, inspect its owned container, then manually remove
  only `<state>/lifecycle.lock`. There is no automatic stale-lock deletion.
- **Desktop disconnected**: switch away from Desktop and back to reconnect. An
  expired/taken lease changes the socket to view-only on refresh. Closing a
  cancelled browser tab can require choosing the new tab in browser_snapshot.
- **Large files/directories**: use the bounded APIs for text. Use terminal tools
  for guest operations within the intended task, and watch disk usage.

Stop retains the named volume, profile and recordings. There is no automated
cleanup/deletion command. For backups stop the owned computer before exporting
its Docker volume, and back up private host config separately.

## Primary references checked for implementation

- [MCP TypeScript SDK v2](https://github.com/modelcontextprotocol/typescript-sdk)
  and its installed version’s declarations for `serveStdio`, tool schemas and
  per-request cancellation.
- [MCP transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
  for stdio framing and stdout discipline; current v2 discovery is delegated to
  the SDK, not a handwritten protocol shim.
- [Docker port publishing](https://docs.docker.com/engine/network/port-publishing/)
  for loopback bindings and older-engine caveats.
- [Playwright Docker guidance](https://playwright.dev/docs/docker) for guest
  browser dependencies, non-root browser execution and sandbox limitations.

Dependency versions are pinned by package-lock. Open-source release and upstream
license/notice obligations remain an explicit future review.
