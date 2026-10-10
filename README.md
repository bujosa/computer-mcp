# computer-mcp

Give any MCP agent its own computer, and share its screen when you want to help.

This private MVP runs a dedicated **Linux desktop in Docker**, with Chromium,
a bounded command runner, a workspace file explorer, desktop screenshots and
**Teach**: record browser steps and save reusable instructions. A small Node CLI
starts the computer; your harness launches a separate MCP bridge over stdio.
There is no model subscription, chatbot, gateway, cloud provisioning or Piblo
backend dependency.

## Start your first computer

Requirements: Node **22.13+**, Docker Engine **28+** with Compose v2 and a **local
Linux container engine**. On macOS/Windows, install Docker Desktop and start it.
The first build downloads Chromium and Linux desktop dependencies; later starts
reuse the image and data. Run these commands inside this private checkout:

```sh
npm ci
node src/cli.js setup --name my-computer --context desktop-linux
node src/cli.js start --name my-computer
node src/cli.js open --name my-computer
```

On Linux with a local Docker Engine, use `--context default` for setup instead.
The CLI always supplies the saved context explicitly and never changes your
Docker default. Remote SSH/TCP contexts are refused. When the machine’s default
context points at another computer, it is not used automatically on macOS or
Windows.

The console opens at **http://127.0.0.1:17670**. Take control to use the live
desktop, edit files or run commands. Release control to let the agent acquire its
own lease. Stop preserves the data:

```sh
node src/cli.js doctor --name my-computer
node src/cli.js status --name my-computer
node src/cli.js stop --name my-computer
```

Computers default to an **isolated/offline Docker network**. The included teaching
sandbox works offline. To use public websites or download dependencies, create a
separate computer with `setup --name web-computer --port 17671 --context
desktop-linux --network internet`. Internet mode also allows connections to
reachable LAN/host services; it is not an outbound security firewall.

## Connect an agent

Start the computer first, then generate a credential-free stdio configuration:

```sh
node src/cli.js config --name my-computer
node src/cli.js config --name my-computer --client codex
```

Copy the JSON `mcpServers.computer` entry into your harness’s MCP settings (Claude
Code, Cursor or another stdio client). The second command emits a Codex TOML
entry. Both use absolute Node/CLI/state paths, so harness working directories do
not matter. See [setup and harness notes](docs/SETUP.md). Harness-specific UX has
not been validated merely because the standard MCP client works.

For observation-only access, generate configuration with `--access read`. The
bridge uses a distinct derived credential; the guest enforces that scope as well
as filtering the tool catalog. No runtime credential is printed in either
configuration. Keep the local state directory private: the owner’s credential
lives there, and any process able to read it has computer authority.

Ask your agent to:

> Read computer_info, acquire control, explore the browser, write hello.txt in
> the workspace and run a command to read it. Capture a desktop screenshot and
> release control when finished.

Tools: `computer_info`, `control_acquire`, `control_renew`, `control_release`,
`browser_snapshot`, `browser_action`, `desktop_screenshot`, `terminal_run`,
`files_list`, `files_read`, `files_write`, `workflow_list`, `workflow_get`.
MCP also exposes a pinned identity resource and a `taught-workflow` prompt.

## Teach a task

1. In the console, **Take control** and **Open teaching sandbox**.
2. Open **Teach**, give the task a name/goal and select **Start recording**.
3. Return to **Desktop** and complete the form in the guest browser.
4. Return to **Teach** and **Save recording**. Review its recorded steps and
   instructions, then release control.
5. Ask the agent to read the saved workflow and perform it using values you
   supply for the named parameters.

Teach captures main-frame navigation, clicks and changed text inputs. Typed
values and terminal commands are omitted; secret-like input fields are skipped.
Workspace writes/console commands contribute instruction markers. The recording
is an event trace, not a video or universal desktop macro. Workflows are
instructions for a harness to interpret using the tools; there is no automatic
blind replay. URLs/paths and visible screens can still contain sensitive data;
review before sharing. Partial recordings survive crashes as `interrupted`.

## Platform support

| Server/CLI host                         | Guest provided by this MVP                                                   | Validation                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| macOS ARM64 + Docker Desktop            | Linux ARM64 desktop                                                          | Local lifecycle, MCP, browser, terminal, files, screenshots and Teach exercised      |
| Linux + local Docker Engine             | Linux desktop matching image architecture                                    | Guest runtime exercised; Linux host lifecycle pending                                |
| Windows + Docker Desktop, Linux engine  | Linux desktop                                                                | Portable CLI/core contracts targeted; Windows lifecycle pending                      |
| macOS/Windows/Linux native host control | Existing host desktop                                                        | Not implemented; requires explicit OS permissions and gives no agent-owned isolation |
| macOS guest VM                          | Isolated macOS only with appropriate Apple hardware/licensing and VM adapter | Not implemented/tested                                                               |
| Windows guest VM                        | Windows VM with its own agent service and hypervisor adapter                 | Not implemented/tested                                                               |
| Remote owned computer                   | Authenticated adapter plus private transport and ownership verification      | Not implemented/tested                                                               |

Docker on a Mac or Windows machine does **not** create a macOS or Windows guest.
See [adapter boundaries](docs/ADAPTERS.md) and [validation evidence](docs/VALIDATION.md).

## Boundaries and development

Every computer gets a UUID, pinned workspace UUID, unique Compose project,
network and named volume. No host workspace or Docker socket is mounted. Guest
commands run as UID 1000, while the control service and its state are private to
root. Human takeover cancels an active command; cancelling an in-flight browser
action can close that guest tab. Side effects that already happened are not
rolled back.

Use `open` to authorize the owner console with a short-lived, single-use ticket.
Agent work/read credentials cannot establish human sessions. The private host
state contains owner authority; there is no remote multi-user login system.
Raw VNC/CDP ports are not published;
VNC view/control sockets are separately authorized. Containers share a kernel,
Chromium currently runs without its sandbox, and shell process-group cleanup is
best effort against commands that daemonize. This MVP is for an owned agent
workspace, not arbitrary hostile-code hosting. Resource and storage limits are
explained in [SECURITY.md](SECURITY.md).

```sh
npm run format:check
npm run lint
npm run build
npm test
npm run test:integration -- /absolute/path/to/owned/computer/state
```

Integration smoke changes only the selected owned computer, checks its labels
first and leaves small proof files/workflows. It does not launch/manage Docker
for you. Appearance and human control are reviewed manually. Read
[arquitecture.md](arquitecture.md) for modules, identity, permissions, execution
and Teach flow; [reuse decision](docs/REUSE.md) explains Piblo separation.

**Private preview.** `private: true`, `UNLICENSED`. An open-source license,
dependency notice review, public packaging and release policy remain decisions
for a future explicitly authorized release. Nothing here publishes a package or
changes repository visibility.
