# Install and publish the Sendtry Computer skill

Status: 27 October 2026. Code and the generic operator use **MIT**, selected by
the owner. Repository visibility/default-branch release are still pending. The
npm package remains private; no npm/Registry/container release is available.
See [the reviewed findings](PUBLIC-PREVIEW-REVIEW.md), [LICENSE](../LICENSE),
[brand terms](../TRADEMARKS.md) and [dependency notices](../THIRD_PARTY_NOTICES.md).

## What is being shared

| Artifact                           | Purpose                                                                    | Sensitive/local bindings                                                             |
| ---------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `skills/sendtry-computer/`         | Generic operator instructions, MIT notice and optional harness UI metadata | No credential, connection file, computer/workspace ID or model API key               |
| MCP server / CLI                   | Provision the owned Linux guest and expose its bounded tools               | Owner creates private local PC state and revocable named grants                      |
| Owner-exported taught skill        | One reviewed procedure with its inputs and verification criteria           | Bound to a specific computer/workspace/workflow/revision; task text may be sensitive |
| Trace/video/Activity/private state | Local evidence, audit and credentials                                      | Never included in the public skill/source artifact                                   |

Installing the generic skill does not start Docker, connect MCP, grant computer
access or train a model. The configured external harness supplies inference.
Only the owner assigns work and verifies an agent report. Teaching analysis is
explicitly consented and produces a draft for owner correction/review.

## Install the operator from a reviewed checkout

Create/start a computer and configure its named connection using [setup](SETUP.md).
Verify the grant with `node src/cli.js check --connection ABSOLUTE_PRIVATE_FILE`.
Install the **whole skill folder**, including its MIT notice. From your separate
agent project, use the reviewed checkout as the local source:

```sh
npx --yes skills@1.7.4 add /absolute/path/to/computer-mcp \
  --skill sendtry-computer --agent codex claude-code cursor --copy
```

The pinned CLI above is Vercel's third-party [skills installer](https://skills.sh/docs/cli),
not a published Sendtry npm package. Review its installation plan. Add
`DISABLE_TELEMETRY=1` to its environment to opt out of its installation telemetry.
Without `--global`, this is project scoped. In the tested 1.7.4 installation,
Codex/Cursor use the shared `.agents/skills/sendtry-computer/` directory and Claude
Code uses `.claude/skills/sendtry-computer/`. Installer support does not prove a
particular running harness loaded the skill; check the actual session's result.

Manual installation is also possible: copy `skills/sendtry-computer/` into your
harness's project skill directory. Keep `SKILL.md` and `LICENSE.txt`; optional
`agents/openai.yaml` supplies Codex display/default-prompt metadata. The operator
is self-contained and has no external references required for operation.
The console and `node src/cli.js skill` still provide the main instruction file.
Do not put credentials, `.mcp.json` or a named connection file into this folder.

Load `sendtry-computer` in the harness, then ask it to observe the assigned PC
and report its identity without taking control. For execution, create a named
work assignment in **Tasks** and send its prepared request. For a taught task,
review the draft first and assign the exact workflow/revision with new inputs.

## Future GitHub install entry

Once the reviewed changes are on the selected public release branch and the
repository is public, the corresponding command is:

```sh
npx --yes skills@1.7.4 add bujosa/computer-mcp \
  --skill sendtry-computer --agent codex claude-code cursor --copy
```

This remote/public install is **not verified while the repository is private**.
Do not add an install-count badge, Registry badge or claim a public package exists.
The [Agent Skills format](https://agentskills.io/specification) is an instruction
format; it is distinct from MCP tool discovery, permissions and runtime setup.

## Exact publication gates

1. Review the final commit and stacked PRs in order: #9 → #10 → #12 → #13 →
   the public-preview review PR. No protected branch push or silent merge.
2. Confirm publication scope. Making the existing repository public also exposes
   its Git history and author metadata, not just the generic skill. A skill-only
   repository is a different release. The earlier keep-private/no-merge boundary
   must be explicitly superseded for the chosen scope.
3. Retain the MIT notices and separate Sendtry brand terms. A prebuilt guest image
   requires a review of that exact image's upstream notices/source obligations;
   it is outside this source/skill preview.
4. Enable GitHub private vulnerability reporting when public visibility permits
   it and verify the external reporting path in [security](../SECURITY.md).
   No private email or active reporting service is invented here.
5. Re-run the local gates on the selected release commit: `format:check`, `lint`,
   `build`, `test`, `check:skill`, `check:package`, dependency audit and a redacted
   full-history secret scan. Keep the manual-only/disabled CI policy until the
   owner explicitly changes it. A green local check is not a GitHub CI run.
6. After authorized publication, test the exact remote skill install from a new
   project without private repository access. Review/source installation remains
   separate from npm publication, Registry registration and guest-image hosting.

## Supported preview boundary

The current adapter is a local Docker **Linux guest** on a supported host. No
native macOS/Windows isolated guest, cloud provisioning or personal-host control
is included. New slice validation is macOS ARM64 → Linux ARM64; historical host
results are dated separately. Recovery diagnostics, named task binding and owner
verification are implemented. Managed backup/restore/uninstall, broad unattended
reliability, persistent IDE onboarding and a public release/update channel remain
work for later releases; they are not hidden behind the word "autonomous".
