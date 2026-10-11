# Sendtry Computer

A computer to work in. Skills to work with.

`computer-mcp` is the technical repository and CLI for this Sendtry product.

Give any MCP agent its own computer, and share its screen when you want to help.

This private MVP runs a dedicated **Linux desktop in Docker**, with Chromium,
a bounded command runner, a workspace file explorer, desktop screenshots and
**Teach**: record browser steps, review reusable instructions and export
a portable `SKILL.md`. A small Node CLI
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
node src/cli.js init --name my-computer --context desktop-linux
node src/cli.js start --open
node src/cli.js list
```

On Linux with a local Docker Engine, use `--context default` for init instead.
The CLI always supplies the saved context explicitly and never changes your
Docker default. Remote SSH/TCP contexts are refused. When the machine’s default
context points at another computer, it is not used automatically on macOS or
Windows.

The CLI prints the loopback console URL (the first free port starts at 17670).
The first computer becomes the CLI default. Take control to use the live
desktop, edit files or run commands. Release control to let the agent acquire its
own lease. Stop preserves the data:

```sh
node src/cli.js doctor --name my-computer
node src/cli.js status --name my-computer
node src/cli.js stop --name my-computer
```

Computers default to an **isolated/offline Docker network**. The included teaching
sandbox works offline. To use public websites or download dependencies, create a
separate computer with `init --name web-computer --context desktop-linux
--network internet`. Internet mode also allows connections to
reachable LAN/host services; it is not an outbound security firewall.

## Manage your computers

```sh
node src/cli.js init --name research --context desktop-linux --network internet
node src/cli.js list                 # Available, busy, unreachable; * is default
node src/cli.js use research         # Default for future CLI commands
node src/cli.js start --open
node src/cli.js status
```

Every computer has its own UUID, state, port, files and browser profile. Create
chooses a free port; it never takes over another listener. `use` does not move an
existing agent: generated MCP configurations remain fixed to their computer.
`start` preserves sessions when the selected computer is already ready; use
`start --rebuild` after a source update to rebuild/recreate it.

Existing state can be added with `register --state /private/existing/path`.
Selection is `--state` → `--name` → saved default. `--root /private/catalog`
isolates development/test catalogs. See [the local review workspace](docs/LOCAL-REVIEW.md)
for the existing demo computers. The **Your computers** console view shows
registered PCs and copies exact owner commands. [Full command reference](docs/SETUP.md#computers-availability-and-default-selection).

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
`browser_snapshot`, `browser_action`, `desktop_screenshot`, `desktop_action`, `terminal_run`,
`files_list`, `files_read`, `files_write`, `workflow_list`, `workflow_get`,
`workflow_analyze`, `workflow_propose`. MCP also exposes a pinned identity
resource, `taught-workflow` and `analyze-demonstration` prompts.

## Give the agent skills

MCP supplies tools; a skill supplies a reviewed procedure using those tools.
**Connect agent** provides pinned JSON/TOML configuration and the
[Sendtry operator skill](ui/skills/sendtry-computer/SKILL.md). Downloads do not
install settings or change your existing host computer.

In **Skills**, take control, name the task and start recording. Demonstrate it
on the shared Linux guest, then choose **Review & save** and stop recording.
The action trace captures browser events and file/terminal markers, omitting
input values, commands and file contents. Working directories and command
outcomes remain visible for review.

Optionally include a local guest video (no audio; five-minute capture deadline,
20 MiB per clip, 200 MiB total). Review its visible content before choosing
**Allow agent analysis**. Copy the analysis request to your connected vision
agent: `workflow_analyze` supplies sampled frames and the trace;
`workflow_propose` saves its procedure, expected result and uncertainties.
The server adds no model account, API key or cloud inference service. Your
harness/model must support MCP images and perform the reasoning; the console
cannot launch an unconnected agent by itself.

Correct the proposed procedure, parameterize inputs, remove secrets and define
how to verify success. **Confirm review** enables **Export SKILL.md**. You can
discard a proposal while keeping your previous reviewed procedure, revoke frame
access, or explicitly delete just the video while retaining the skill. Material
already received by an agent/model provider cannot be recalled. Pending drafts
are hidden from read-only connections.

This is analysis of sampled evidence, not model training or proof that every
frame/action was understood. Ordinary trace review works without video or a
vision model. The agent can operate guest windows with bounded mouse/keyboard
`desktop_action` input and fresh screenshots. Coordinate replay needs review;
there is no automatic desktop action inference or blind replay.
See [the desktop tools](docs/DESKTOP.md).
See [the Teach guide](docs/TEACH.md) and [setup](docs/SETUP.md).

## Review usage and activity

Open **Activity** in the owner console to inspect sessions, action outcomes,
time holding computer control and cumulative tool execution time. Filter by
session or the last 24 hours, 7, 30 or 90 days; export retained metadata as JSON
for your own future evaluations. History persists in that computer's private
volume across stops and rebuilds. It starts with this feature; older actions
are not reconstructed.

The bridge records the MCP client's declared name/version, access and session
ID. These identify a connection, not a verified person or model; shared
credentials can impersonate session IDs. Commands, paths, file content,
screenshots, video and raw errors are excluded from activity records. Exports
require the owner console; agent credentials cannot read history. Local
retention is bounded, and these timings are not billing or proof of task
success. See [the activity contract](docs/ACTIVITY.md).

## Try the offline practice task

1. In **Computer**, take control and open the practice task.
2. In **Skills**, start a named recording, optionally with guest video.
3. Complete the form on the live guest screen.
4. Return with **Review & save** and save the recording. Review the trace, or
   allow your connected agent to analyze sampled video and propose instructions.
5. Correct the procedure, define a verifiable result and **Confirm review**.
   Export the skill, release control and ask your agent to reuse it with new
   supplied values.

[Teach guide](docs/TEACH.md) explains consent, drafts, limits and recovery.

## Platform support

| Server/CLI host                         | Guest provided by this MVP                                                   | Validation                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| macOS ARM64 + Docker Desktop            | Linux ARM64 desktop                                                          | Full CLI/MCP lifecycle passed locally and independently on a Mac mini via SSH        |
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
npm run test:e2e -- --context desktop-linux
npm run test:integration -- /absolute/path/to/owned/computer/state
```

The [end-to-end runner](docs/QA.md) creates two fresh owned computers and stops
them after checking both network modes, MCP execution and restart persistence.
It retains private reports and volumes. Integration smoke changes only the selected owned computer, checks its labels
first and leaves small proof files/workflows. It does not launch/manage Docker
for you. Appearance and human control are reviewed manually. The console uses Sendtry's
warm paper/salmon identity; [product and design decisions](docs/PRODUCT.md) define
the tools → computer → taught-skill flow. Read
[arquitecture.md](arquitecture.md) for modules, identity, permissions, execution
and Teach flow; [reuse decision](docs/REUSE.md) explains Piblo separation.

**Private preview.** `private: true`, `UNLICENSED`. An open-source license,
dependency notice review, public packaging and release policy remain decisions
for a future explicitly authorized release. Nothing here publishes a package or
changes repository visibility.
