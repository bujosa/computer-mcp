# Your first local computer, from setup to a taught task

[Documentation](README.md) · [Command reference](SETUP.md)

This walkthrough connects one local agent to one dedicated Linux desktop. You
will create a file, check the result yourself, then teach a small browser task
and try it with different inputs. Start with disposable example data.

Jump to [installation](#2-install-and-check-prerequisites),
[first PC](#3-create-and-open-the-first-pc), [connection](#4-create-one-private-agent-connection),
[client settings](#5-configure-your-local-harness), [skill](#6-give-the-agent-its-operator-skill),
[first task](#7-complete-and-verify-a-first-task), [Teach](#8-teach-a-browser-task-and-reuse-it),
[daily use](#9-daily-use-and-more-computers) or [recovery](#10-recover-without-broadening-access).

## 1. Understand what runs where

| Part            | Runs where                                                     | Your role                                                                 |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Owner CLI       | Your host computer                                             | Create/start PCs, issue grants, open the console                          |
| Linux desktop   | An owned Docker container and data volume                      | Watch or control the same guest your agent uses                           |
| MCP bridge      | A local Node process launched by your harness                  | Configure its command once; the harness communicates over stdio           |
| Agent and skill | Your existing Claude Code, Codex, Cursor or compatible harness | Supply the model and instructions, approve this connection and send tasks |

The console's loopback HTTP address is for your browser. **It is not the MCP
endpoint.** Do not enter that URL as a remote/HTTP MCP server. The harness starts
`node …/src/cli.js mcp --connection …` as a child process; stdout carries MCP
messages. This follows the [MCP stdio transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#stdio).
Do not configure `npm start` as the MCP command: npm's stdout banners break that
protocol.

You do not need a second terminal running `mcp` manually: the harness owns that
process. Starting the guest with `start` and testing its grant with `check` are
the owner-facing commands; neither starts a model conversation.

Keep the host CLI, harness and private connection file in the **same local
execution environment**. A cloud harness cannot read these paths. A Windows
harness and a WSL harness need their own consistent executable/path setup;
do not copy Windows paths into a Linux process. The current adapter refuses
remote Docker endpoints. Model calls may still leave your computer through
your chosen provider; local stdio does not make inference offline.

| Host                                       | Desktop provided | Support boundary                                                                  |
| ------------------------------------------ | ---------------- | --------------------------------------------------------------------------------- |
| macOS + Docker Desktop                     | Linux guest      | Local ARM64 path exercised; no isolated macOS guest or native host control        |
| Windows + Docker Desktop, Linux containers | Linux guest      | Host setup supported by the CLI; this guide is not a fresh Windows acceptance run |
| Linux + local Docker Engine                | Linux guest      | Host setup supported by the CLI; no new Linux-host acceptance claimed here        |

Containers provide a dedicated workspace, not the isolation of a hardened VM.
No macOS Accessibility/Screen Recording permission or exposure of your host
desktop is required. Native macOS/Windows guests, remote provisioning and VM
adapters are future work. See [architecture](../arquitecture.md).

## 2. Install and check prerequisites

Install Git, **Node 22.13+**, and a **local Linux Docker Engine 28+ with Compose
v2**. On macOS/Windows, start Docker Desktop; Windows must use Linux containers.
Also install/sign in to your chosen agent harness using its own instructions.

In a terminal on that host:

```sh
git clone https://github.com/bujosa/computer-mcp.git
cd computer-mcp
npm ci
node src/cli.js --version
```

All owner commands below run from this checkout. Do not move/delete it after
configuring the harness without regenerating its absolute paths. There is no
published Sendtry npm server package to install; `npm ci` installs dependencies
from source. [Distribution status](PUBLICATION.md#is-npm-required).

Check the explicitly selected local engine:

```sh
# macOS / Windows with Docker Desktop
node src/cli.js doctor --context desktop-linux
```

On Linux, use this instead, substituting your validated local context if needed:

```sh
node src/cli.js doctor --context default
```

Expected: `result: ok`, or a warning you have inspected and resolved as needed.
`blocked` means fix prerequisites before continuing. Doctor does not create a
PC or change your global Docker context. An SSH/TCP endpoint is refused even
if its context has a friendly local name. First image builds download Linux
desktop/Chromium dependencies and need free disk space; guest offline mode
does not make the installation itself offline.

## 3. Create and open the first PC

For macOS/Windows:

```sh
node src/cli.js init --name my-computer --context desktop-linux
node src/cli.js start --name my-computer --open
node src/cli.js status --name my-computer
node src/cli.js list
```

On Linux, change only the `init` context to your local engine, commonly
`--context default`. The saved context is used explicitly for later commands.

Expected: a ready PC, a stable computer/workspace identity and a loopback owner
console. The first registered PC becomes the CLI default. The desktop and its
browser profile/files persist across normal stops and rebuilds in its owned
volume. Your host project is not mounted into the guest.

The new PC is **isolated/offline** by default. The exercises below work offline.
For public websites/downloads, create a separate PC with `--network internet`
at setup. That also permits reachable LAN/host services; it is not an outbound
firewall. [Network and capacity reference](SETUP.md).

If the browser did not open, or an owner ticket expired:

```sh
node src/cli.js open --name my-computer
```

Owner links are single-use and expire after 30 seconds; do not share them.
In **Screen**, choose **Take control** to try the guest. Choose **Release** before
asking the agent to work. Taking control later interrupts an active agent
attempt; inspect partial work before assigning a new attempt.

## 4. Create one private agent connection

Keep the guest running. Create one named work grant for your chosen agent:

```sh
node src/cli.js connection create my-agent --name my-computer --access work
```

The command prints a credential-free JSON config and reports the **absolute
private connection-file path** separately. Keep that file where it was created;
do not paste its contents into settings, prompts, GitHub or a skill. It contains
the secret. The printed config contains only executable/file paths and a unique
server key. Keep those paths local too.

In the following examples, replace `ABSOLUTE_PRIVATE_FILE` with that reported
path, retaining quotes. Do not use the owner's `computer.json` file.

```sh
node src/cli.js check --connection "ABSOLUTE_PRIVATE_FILE"
```

Expected: `result: ready`. A work state of `needs-assignment` is normal here.
This probes the actual MCP bridge by observation without taking a lease or
starting a task. `busy` can also be a valid connection with another controller;
inspect it before work. A ready check does not configure your harness or prove
that its model can complete a task.

To create an observer instead, use a separate label and `--access read`.
Read grants cannot execute tasks or analyze/propose Teach evidence. Do not edit
the file to upgrade or retarget authority. [Grant reference](ASSIGNMENTS.md).

## 5. Configure your local harness

Open the **agent project** where you want to work. It can be a different folder
from this server checkout. Merge the generated entry into existing configuration;
preserve other servers and its generated `computer-…` key. Do not overwrite a
whole config or commit machine-specific settings. Approve/trust only the intended
project/server, then reconnect its MCP session.

### Claude Code

Use the JSON from creation, or reprint it from the server checkout:

```sh
node src/cli.js config --connection "ABSOLUTE_PRIVATE_FILE" --client generic
```

Merge its `mcpServers` entry into the agent project's `.mcp.json`. Start Claude
Code in that project and review its server approval. `claude mcp list` lists
registrations; verify actual tool discovery in the session too.
[Official Claude Code MCP configuration](https://code.claude.com/docs/en/mcp).

### Codex

Generate TOML from the same grant; this does not create another credential:

```sh
node src/cli.js config --connection "ABSOLUTE_PRIVATE_FILE" --client codex
```

Merge the emitted `[mcp_servers.<generated-key>]` table into the agent project's
`.codex/config.toml`. Codex loads project configuration for trusted projects.
Alternatively use your user configuration deliberately. `codex mcp list` checks
registration; reconnect and check actual tools.
[Official Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

### Cursor

Use the generic JSON above in the agent project's `.cursor/mcp.json`. Inside
this server's entry, alongside `command` and `args`, add `"type": "stdio"`
as specified by [Cursor's current MCP configuration](https://cursor.com/docs/mcp).
Enable/approve this exact server in Cursor's MCP settings and reconnect. Keep
the `mcpServers` wrapper; `--client vscode` uses a different wrapper intended
for VS Code.

### Confirm the connection before effects

Ask the harness:

> Inspect the connected Sendtry Computer using computer_info. Report its
> computer/workspace IDs, access and control state. Do not acquire control or
> change anything. If multiple PCs are connected, ask which one I intend.

Compare its IDs to the intended PC in the owner console/status. A named work
connection currently exposes 20 tools; a named read connection exposes 9.
Tool names may have a harness prefix. Registration alone, or an agent claiming
it has access without a real tool response, is insufficient.

## 6. Give the agent its operator skill

The **generic operator** explains identity checks, tools, tasks, control and
recovery. It grants no access and does not start an agent. From your agent project,
choose only the harness you use (replace `codex` with `claude-code` or `cursor`):

```sh
DISABLE_TELEMETRY=1 npx --yes skills@1.7.4 add bujosa/computer-mcp --skill sendtry-computer --agent codex --copy
```

PowerShell:

```powershell
$env:DISABLE_TELEMETRY='1'
npx --yes skills@1.7.4 add bujosa/computer-mcp --skill sendtry-computer --agent codex --copy
```

This is a pinned third-party **skill installer**, not a published Sendtry server
package. Without `--global` it installs in this project. In this version,
Codex/Cursor use `.agents/skills/sendtry-computer/`; Claude Code uses
`.claude/skills/sendtry-computer/`. Review the installer's plan. For an entirely
manual option, copy the whole `skills/sendtry-computer/` directory from the
checkout, retaining `LICENSE.txt`. [Installation details](PUBLICATION.md#install-from-github).

Ask your harness to load `sendtry-computer`; in Codex invoke
`$sendtry-computer`, in Claude Code `/sendtry-computer`. Verify it actually reads
the skill, then discovers the connected MCP tools. Restart if skill discovery
has not refreshed. [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills).
Installing a skill and approving an MCP server are separate steps.

## 7. Complete and verify a first task

Use a fresh PC where `welcome.txt` does not exist. If it does, choose another
new filename and update every reference below. This exercise stays inside the
guest and needs no Internet, installs or host filesystem access.

1. In the owner console, open **Tasks → New task**. Under **Send to**, choose
   the work connection you just created.
2. Set the task name to `Create a welcome file` and enter:

   **What should the agent do?**

   > Create a new UTF-8 file welcome.txt at the workspace root containing exactly
   > these two lines: "Hello from Sendtry Computer." and "This file was created
   > inside the Linux guest." End both lines with a newline. Read it back.

   **What does success look like?**

   > welcome.txt exists with exactly those two lines; the agent reads it back
   > and reports what it observed. I will open the file to check it myself.

   **Scope and limits**

   > Only create this new file. If it already exists, stop without overwriting.
   > No other files, network, installs, host actions or other computers.

3. Choose **Assign task & copy request**, then paste the request into your
   connected agent. Saving/copying does not launch the agent. Release human
   control before execution.
4. The agent checks identity, reads the assignment and calls `task_start`.
   That binds one attempt to its connection/session and exclusive lease. It
   writes/reads the file and calls `task_finish` with the observed result.
5. Open **Files** yourself, read `welcome.txt`, compare both lines and inspect
   the task report. Under **Your check**, choose **Mark checked** only if it
   matches; otherwise **Mark rejected** and explain the discrepancy.

Expected: the real file matches, the report and owner verdict are distinct,
and the agent's lease is released. The agent's success claim is not your check.
The tool-level task scope does not enforce every sentence of a requirement;
review actual effects, especially when granting terminal/network access.

If interrupted, do not replay the request automatically. Observe partial
results and create a new assignment with a new output path when appropriate.
One request has one attempt. [Task lifecycle](TASKS.md).

## 8. Teach a browser task and reuse it

Use the included offline practice form. This is a demonstration → proposal →
owner review → fresh task flow; it does not train model weights or launch an
internal model worker.

1. In **Screen**, **Take control** and choose **Practice task**. In
   **Teach & skills → Teach a task**, name it `Save a project note` and set the
   goal to saving the supplied project/next step and verifying after reload.
   Enable optional Linux guest video if you want visual analysis.
2. In the guest form enter **Project name** `Garden plan`, **Next step**
   `Choose three plants for the balcony.`, then **Save note**. Choose
   **Finish demonstration** and inspect the saved trace/clip.
3. For video analysis, review the visible data, select **Allow agent analysis**,
   then **Copy analysis request** and paste it into your connected vision-capable
   work agent. This permits **all work grants** to obtain sampled frames of this
   workflow. Your provider can receive visible data; raw WebM stays owner-only.
   Consent/copying alone does not run analysis. The trace omits typed values and
   command content; sampled frames can miss important steps.
4. The agent reads/analyzes evidence and calls `workflow_propose` on this saved
   workflow with its current revision. It should explain missing steps and
   propose input definitions such as `project_name` and `next_step`, not hardcode
   your demonstration values. Analysis should not execute the demonstrated task.
5. Choose **Refresh saved skill / Review updated proposal**. Correct the method,
   input descriptions and expected result. Require both supplied values to
   remain visible after reload, then **Confirm review**. With no video, review
   and write the procedure from the trace yourself.
6. In **Try with new inputs**, supply `Launch checklist` and
   `Review the release notes.`. **Prepare a plan first** is the default; send
   that request to inspect the proposed steps. For execution select
   **Do the reviewed task**, choose the named work connection and save/copy its
   assignment. Send it to your agent and release human control.
7. Independently inspect the saved note and reload the practice page. The new
   values must persist. This page stores only the latest note, so this exercise
   authorizes replacing that practice note. Record your task verdict.

**Export SKILL.md** exports the reviewed procedure pinned to this local
computer/workspace/workflow/revision. Keep it private unless you have reviewed
its task data for sharing; it is different from the generic MIT operator.
Re-review/re-export after method changes. Export alone neither installs a skill
nor proves a successful run. [Full worked Teach example](TEACH.md#worked-example-teach-a-project-note).

## 9. Daily use and more computers

From the server checkout:

```sh
node src/cli.js list
node src/cli.js connection list --all
node src/cli.js start --name my-computer
node src/cli.js open --name my-computer
node src/cli.js check --connection "ABSOLUTE_PRIVATE_FILE"
node src/cli.js stop --name my-computer
```

Stop after active work has finished; it preserves data and interrupts any active
attempt. Your harness launches/reconnects the stdio process separately. A ready
`start` reuses the running guest. After deliberately updating a clean checkout
and running `npm ci`, use `start --name my-computer --rebuild` to load new
runtime/UI code. Rebuild interrupts sessions/leases; inspect active work first,
then reconnect the harness. [Recovery](RECOVERY.md).

For a second PC, use a fresh name, then start it and create another grant:

```sh
node src/cli.js init --name second-computer --context desktop-linux
node src/cli.js start --name second-computer --open
node src/cli.js connection create second-agent --name second-computer --access work
node src/cli.js use second-computer
```

On Linux substitute the local context in `init`. Preserve the second generated
server key if configuring both PCs in one harness. Each has separate identity,
volume, browser profile and grants. `use` changes only the default for future
owner CLI commands; **existing MCP entries never follow the default**. Multiple
agents may observe a PC, but only one controller writes at a time. Different PCs
can work independently.

Use separate grants per agent for attribution/revocation. Inspect **Computers**,
the connections in **Connect agent**, and **Activity** to understand current use. Trusted IDs and task
attempts are recorded; declared client/model labels are self-reported. Activity
is bounded operational metadata, not a full recording of commands, prompts or
human identity. [Audit limits](ACTIVITY.md).

## 10. Recover without broadening access

| Symptom                                           | Next step                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| No guest / connection unavailable                 | Run `status` and `doctor` for the intended name, then start it using its saved local context                       |
| `needs-assignment`                                | Save a task for this exact work grant in **Tasks**, then send its request                                          |
| Read-only connection                              | Observe only; the owner creates a separate work grant if execution is intended                                     |
| Harness has no tools                              | Check its project config, exact executable/private file paths, trust and approval; reconnect, then run `check`     |
| Skill missing                                     | Verify the project skill directory and actual loader; restart discovery; skill installation does not configure MCP |
| PC busy / human has control                       | Inspect who owns control; release your own human control when ready; takeover interrupts other work                |
| Task interrupted / invalid result / response lost | Inspect task/output first; do not repeat effects blindly or resume a terminal attempt                              |
| Console asks for owner access                     | Run `open --name my-computer` for a new single-use owner ticket                                                    |
| Website cannot load                               | An isolated PC is offline by design; create an Internet-enabled PC deliberately if needed                          |
| Agent cannot access a host project                | Copy only intended data into guest Files or create it with tools; the host project is not mounted                  |

Connection files/state live under your private `~/.computer-mcp` catalog by
default; guest data lives in each owned volume. Do not delete either as a generic
repair. Never paste tokens, owner links, environment dumps or private task/video
content into bug reports. [Detailed recovery](RECOVERY.md) and
[security reporting](../SECURITY.md).

You have completed the basic path when the harness makes real observations,
the first assigned file matches your independent check and control is released.
Teach is additionally verified when a reviewed method succeeds with fresh inputs
and you check its persisted output. Start with those outcomes before increasing
task scope. Official client references were checked on 27 October 2026; client
menus and approval behavior can change.
