# Install the Sendtry Computer preview

For a guided first run, follow the [local stdio walkthrough](WALKTHROUGH.md).
This page covers distribution and
skill installation; [setup](SETUP.md) is the command reference.

Status: 27 October 2026. The complete [repository and history](https://github.com/bujosa/computer-mcp)
are public. Code and the generic operator use **MIT**, with separate Sendtry
[brand terms](../TRADEMARKS.md) and [dependency notices](../THIRD_PARTY_NOTICES.md).
The reviewed stack #9 → #10 → #12 → #13 → #14 is integrated into `main`.
The npm manifest remains `private: true`; npm, Registry, prebuilt images and
GitHub Releases are not published.

[Publication acceptance](https://github.com/bujosa/computer-mcp/blob/main/docs/PUBLIC-LAUNCH.md)
records the exact source commit, anonymous installation, actual MCP checks and
limits. [The earlier review](https://github.com/bujosa/computer-mcp/blob/main/docs/PUBLIC-PREVIEW-REVIEW.md)
is a dated preparation record, including the failures corrected before launch.

## What is being shared

| Artifact                           | Purpose                                                                    | Sensitive/local bindings                                                             |
| ---------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `skills/sendtry-computer/`         | Generic operator instructions, MIT notice and optional harness UI metadata | No credential, connection file, computer/workspace ID or model API key               |
| MCP server / CLI                   | Provision the owned Linux guest and expose its bounded tools               | Owner creates private local PC state and revocable named grants                      |
| Owner-exported taught skill        | One reviewed procedure with its inputs and verification criteria           | Bound to a specific computer/workspace/workflow/revision; task text may be sensitive |
| Trace/video/Activity/private state | Local evidence, audit and credentials                                      | Excluded from the public source and generic skill                                    |

Installing the generic skill does not start Docker, connect MCP, grant computer
access or train a model. The configured external harness supplies inference.
Only the owner assigns work and verifies an agent report. Teaching analysis is
explicitly consented and produces a draft for owner correction/review.

## Install the server from source

Use Node 22.13+ and a local Docker Linux engine (Engine 28+ with Compose).

```sh
git clone https://github.com/bujosa/computer-mcp.git
cd computer-mcp
npm ci
node src/cli.js doctor --context desktop-linux
node src/cli.js init --name my-computer --context desktop-linux
node src/cli.js start --name my-computer --open
```

On Linux use the name of the validated local context, commonly `default`.
Docker Desktop on macOS/Windows supplies a **Linux guest**, not an isolated
macOS/Windows desktop. The CLI refuses remote Docker endpoints and never switches
the global context. See [setup](SETUP.md) for named read/work grants, defaults,
multiple computers and credential-free harness configuration.

## Install from GitHub

From your separate agent project:

```sh
DISABLE_TELEMETRY=1 npx --yes skills@1.7.4 add bujosa/computer-mcp \
  --skill sendtry-computer --agent codex claude-code cursor --copy
```

This exact public repository source was installed without GitHub credentials in
a fresh project on 27 October 2026. The pinned CLI is Vercel's third-party
[skills installer](https://skills.sh/docs/cli), not a Sendtry npm server package.
Without `--global`, installation is project scoped. In CLI 1.7.4, Codex/Cursor
share `.agents/skills/sendtry-computer/` and Claude Code uses
`.claude/skills/sendtry-computer/`. All three canonical assets matched the public
source. This proves installer acceptance; check that your actual harness session
loads the skill before executing tasks. No new three-model trial is claimed.

The environment variable opts out of the installer's telemetry. Review the
installation plan. PowerShell syntax:

```powershell
$env:DISABLE_TELEMETRY='1'
npx --yes skills@1.7.4 add bujosa/computer-mcp --skill sendtry-computer --agent codex claude-code cursor --copy
```

The current anonymous acceptance used macOS, not a fresh Windows run.

## Install the operator from a reviewed checkout

For local development, substitute the absolute checkout path for
`bujosa/computer-mcp` in the installer command. Manual installation is also
possible: copy the **whole** `skills/sendtry-computer/` folder into your harness's
project skill directory. Keep `SKILL.md` and `LICENSE.txt`; optional
`agents/openai.yaml` supplies Codex display/default-prompt metadata. The operator
is self-contained and requires no other local references.

The console and `node src/cli.js skill` provide the main instruction file.
Do not put credentials, `.mcp.json` or named connection files into the skill folder.
Verify your grant with `node src/cli.js check --connection ABSOLUTE_PRIVATE_FILE`.
Load `sendtry-computer`, then ask the harness to observe the assigned computer and
report its identity without taking control. To execute, create a named assignment
in **Tasks** and send its prepared request. Review taught drafts before assigning
the exact workflow/revision and fresh inputs.

## Is npm required?

No. MCP stdio lets the client [launch a local process](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#stdio).
The configured `node /absolute/path/src/cli.js mcp --connection PRIVATE_FILE`
works from a source installation. `npm ci` installs this checkout's dependencies;
it does not publish the server.

A future npm release would simplify versioned installation and `npx` launch. It
requires a separately authorized package/version release, verified npm namespace,
reviewed artifact/provenance and a manifest change: `private: true` currently
blocks `npm publish`. Do not claim `npx @bujosa/computer-mcp` is available today.

The [MCP Registry](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/generic-server-json.md)
is a discovery catalog, separate from npm and the [Agent Skills format](https://agentskills.io/specification).
The checked-in Registry manifest remains an unpublished draft. No Registry badge,
install-count badge, hosted MCP endpoint or prebuilt desktop image is advertised.

## Source publication and further release gates

The owner explicitly chose publication of the full repository/history, including
its author metadata. MIT and separate brand terms are applied. Anonymous clone,
historical commit access, skill installation and the public vulnerability-reporting
status were verified. GitHub secret scanning and push protection are enabled.
The security-report entry redirects anonymous users to sign-in; no external-account
report was submitted. See [security](../SECURITY.md).

CI remains manually disabled at the owner's request. Run format/lint/build/tests,
`check:skill`, `check:package`, dependency audit and redacted secret scans locally.
A green local check is not a GitHub Actions result. Publishing a package/image or
reactivating CI requires its own explicit scope.

Before wider distribution, validate the exact versioned artifact and supported
host/IDE onboarding, update/backup/uninstall and measured task reliability. A
prebuilt guest image additionally needs its exact upstream notices/source review.
Never publish a taught export, raw demonstration, private task data or grant file
with the generic operator.

The current adapter is local Docker Linux. Managed backups, broad unattended
reliability, persistent IDE onboarding, native host control and isolated
macOS/Windows guests remain outside this source preview's supported paths.
