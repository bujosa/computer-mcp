# Real client acceptance — 3 November 2026 UTC

These are actual subscription-authenticated model/tool runs, not an SDK loop
standing in for a model. Acceptance ran against public main
`8be7318a336ab369b879455aa882f3cbcbb43a31`, operator v10, package 0.1.0.
The local session began on 2 November in America/New_York; recorded executions
are dated 3 November UTC. The requested scope was Claude Code, Codex and Gemini
through Antigravity CLI. Grok and Cursor were not tested in this acceptance.

## Environment and boundaries

macOS ARM64 hosted three newly provisioned, offline Linux guests. Every Docker
operation explicitly used `desktop-linux`; no global context was changed.
Each guest had a new owned project, volume, computer/workspace identity and
loopback-only console port. Existing review PCs and unrelated containers were
preserved. No host mounts, native host control or OS permission changes were
used. This does not test Windows/Linux hosts or isolated macOS/Windows guests.

Each client used a separate named work connection and private temporary agent
project. Connection files, owner cookies, raw transcripts, videos and sampled
images stayed private; none are committed. Existing subscription sessions were
used without adding API keys. No public package, image or Registry entry was
published, and the repository's Check workflow stayed disabled.

The tested clients were:

- **Claude Code 2.1.317:** `opus`, observed `claude-opus-5-5`, high effort.
  Strict MCP configuration contained only the QA server. Built-in tools were
  limited to Read and Skill, with project skill reads and the QA MCP allowed.
  It invoked the actual project Skill loader, then read the exported taught
  reference. Runs used `dontAsk`, session persistence disabled and a budget cap.
- **Codex CLI 0.166.0:** `gpt-6.1-sol`, medium reasoning, ephemeral read-only
  host sandbox, user configuration/rules ignored for this session. Host shell,
  browser, native computer, apps, plugins, hooks and multi-agent tools were
  disabled. Its Code Mode host remained enabled to route MCP tools. The exact
  canonical operator body was supplied inline; **this run does not certify
  Codex native skill-file discovery**. Live `workflow_get` supplied the taught
  method and exact revision.
- **Antigravity CLI (`agy`):** `gemini-4-argon-high`. It read the installed
  project `.agents/skills/sendtry-computer/SKILL.md` and exported taught reference,
  called the workspace MCP and opened its actual returned image artifacts.
  Per-session settings used `request-review`, only this server's MCP allow rule,
  and command/write/URL/unsandboxed deny rules. No global settings were rewritten.
  Antigravity still advertised other built-in tools; this was **not** a proven
  server-only tool sandbox. The transcript contains no calls to native browser,
  command execution, web search, subagents or unrelated MCP servers. Reads were
  project instructions, client-generated MCP definitions and returned images.
  Its MCP-declared client was `antigravity-client` v1.0.0; that is client metadata,
  not a separately verified CLI release number.

Harness tool inventories, approval policy and guest authority are distinct.
The server enforces its grant/task/lease/workspace boundary; it cannot remove
unrelated tools or guarantee a harness's host sandbox.

## Recording → proposed skill → owner review

For each guest the owner recorded a new offline practice-form demonstration,
including silent desktop video: fill project `Garden plan`, fill next step
`List three spring vegetables.`, save, then navigate to the same URL again.
The owner explicitly consented to model analysis and released control.

Each model matched computer/workspace/connection IDs, fetched the owning
workflow, inspected actual timestamped PNG samples and action trace, and saved
an unapproved proposal through `workflow_propose`. The final analysis runs made
five MCP calls each, including two frame-sampling calls. No analysis acquired
control, started a task or executed the demonstrated effects.

All three recovered the synthetic entered values after inspecting intermediate
samples. They distinguished the trace's redacted values from visible images,
proposed `project_name` and `next_step` descriptions without stored defaults,
and explicitly noted that the last video frame preceded the final navigation.
The saved card body was below the sampled viewport. Neither persistence nor
off-screen text was claimed proven by those images alone.

The owner independently inspected the saved page after reload, corrected the
method and reviewed it. The exported instructions remained bound to the owning
computer/workspace/workflow/revision. This is assisted instruction authoring;
it is not model training, automatic owner approval or unattended dispatch.

## Assigned execution and independent checks

The corrected assignment explicitly authorized replacing the practice page's
one current synthetic note. Each client had to create a new standard-library
Python program, parse a supplied CSV, reject invalid rows, write a new JSON
report, reuse the reviewed browser method with computed inputs, inspect a guest
screenshot and handle one deliberate terminal timeout.

The separate owner check requires all of the following, rather than trusting
the final model message:

- Exact report: 3 valid rows, 2 rejected rows at physical lines 5 and 6;
  total 4,000 cents, paid 1,700, open 2,300; vendor totals Orion 1,200,
  Vega 2,300 and Luna 500. The original CSV SHA-256 must remain unchanged.
- Inspect the actual new program and report. A separate owner browser reload
  must show the current project and exact computed summary:
  `Total 4000 cents; paid 1700; open 2300; rejected 2.`
- The one-second timeout probe must create its started marker and stop before
  a delayed write. Its late marker must still be absent beyond the five-second
  deadline. A successful MCP response must not be confused with command success.
- Runtime audit and client trace must show successful `task_start`, then an
  awaited successful exact-revision `workflow_get`, before the first effect.
  Effects must carry the intended connection/task/attempt identity. Observation
  and start events can precede attempt creation; attribution is not backfilled.
- The model report must release its lease and initially leave owner
  verification null. Only after independent checks may the owner mark verified.

All three corrected assignments passed these independent checks and received
separate owner verdicts of `verified`:

- **Claude:** analysis 39.479 seconds / 5 MCP calls; corrected execution
  63.148 seconds / 23 MCP calls, 21 within the saved task's attribution.
- **Codex:** final analysis 64.453 seconds / 5 MCP calls; execution
  118.707 seconds / 25 MCP calls, 23 within the saved task's attribution.
- **Gemini through Antigravity:** analysis 124.411 seconds / 5 MCP calls;
  corrected execution 221.010 seconds / 23 MCP calls, 21 within the saved
  task's attribution. Client-local definition/image reads are additional.

Durations are single observed wall-clock runs, including tool routing/review,
not a speed benchmark. Counts exclude heartbeat renewals and client-local skill
reads. The models identified the expected timeout as `stopped: timeout`,
`exitCode: null`, `signal: SIGKILL`, `truncated: false`; Activity correctly recorded
that command as failed while the enclosing acceptance task could succeed.
The final screenshot in each client showed the current card's heading; only
browser snapshots established its off-screen body text. Independent owner PNGs
were also inspected. Each verified attempt left no lease.

## Failures retained and corrections

**Client setup:** the first Codex setup disabled its Code Mode host, making its
tool gateway unavailable. Restoring that intermediary enabled real MCP calls
without enabling host shell/browser/computer tools. A subsequent analysis
could observe the recording but could not save a proposal with
`approval_policy="never"`: `auto` per-tool behavior can still request approval
for a mutation. The final configuration used `approval_policy="on-request"`
and `approvals_reviewer="auto_review"`, retaining the read-only host sandbox and
the explicit QA server. The proposal was then saved. No blanket permission
bypass or product annotation weakening was used.

Antigravity's published settings schema listed `enableTelemetry`, but the
installed CLI rejected that session key before inference. Removing that
unrelated option produced a valid session configuration. Check settings against
the installed CLI; do not assume every published schema field is accepted.

**Initial scenario:** the first owner-authored review incorrectly required
preserving earlier notes. The practice page intentionally stores only one
current note. Claude reported `uncertain` when the previous card disappeared;
Gemini reported success while omitting that unmet condition. The owner rejected
both initial attempts, preserved their reports, corrected the reviewed method
and created fresh assignments with new output paths and explicit replacement
authority. No interrupted request was resumed and no ambiguous mutation was
blindly replayed. Codex received the corrected scenario on its first execution.

This is a concrete example of why `reported_success` is not owner verification.
The [walkthrough](WALKTHROUGH.md#8-teach-a-browser-task-and-reuse-it) already
describes the practice page's replacement behavior; tests must honor that scope.

## Reproduce the useful acceptance

Start with the [local walkthrough](WALKTHROUGH.md), using a new owned QA PC and
separate connection for each client. Configure only the intended project/server,
confirm real `computer_info`, and run the taught-note exercise with fresh input.
For a richer check, assign a new CSV/report task with explicit acceptance
criteria, authorized output paths and a pinned reviewed method. Independently
read the report, reload the page and inspect Activity before recording a verdict.
Use new assignments and filenames after terminal/uncertain attempts.

For bounded non-interactive Codex testing, the documented review combination
above is significant: `never` does not mean "approve all MCP tools." Do not
disable the Code Mode host merely to remove host shell tools; disable shell and
native computer/browser capabilities separately. These are version-specific
acceptance settings, not a replacement for your organization's managed policy.

For Antigravity, merge the generated generic JSON into the agent project's
`.agents/mcp_config.json`; manually copy the operator into `.agents/skills/`.
Use `agy models` to select an available Gemini model. Grant only intended MCP
access, and inspect the actual transcript/tool inventory. The CLI caches returned
images locally; a later local image read can be how Gemini consumes an MCP PNG.

Primary contracts consulted for this acceptance:
[Claude MCP](https://code.claude.com/docs/en/mcp),
[Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli),
[Codex configuration](https://learn.chatgpt.com/docs/config-file/config-reference),
[Codex review behavior](https://learn.chatgpt.com/docs/cyber-safety/recommended-configuration),
[Antigravity MCP](https://antigravity.google/docs/mcp) and
[Antigravity permissions](https://antigravity.google/docs/permissions?tab=cli).

## Limits

This small synthetic acceptance proves the observed paths, not a reliability
percentage, every tool, complex commercial workflows or every client version.
Fresh native pointer/keyboard control, human-takeover interruption during a live
model command, revocation/restart recovery, Windows/Linux hosts and remote PCs
were not re-certified here; earlier dated runtime contracts remain separate.
Codex native skill discovery and a strict Antigravity server-only tool inventory
also remain outside this proof. Audit client/model labels are declared metadata,
not verified human identity. Raw media and harness-managed caches remain private;
recording plus reviewed instructions does not create a self-training model.

## Local gates and QA closure

`npm run format:check`, `npm run lint`, `npm run build` (80 JavaScript modules),
`npm test` (160 passed, no failures/skips), `npm run check:package` (108 assets,
319 documentation links, private/unpublished) and `npm run check:skill`
(operator v10, MIT) passed. After adding this record, the package inventory
initially rejected the new documentation asset until its explicit required-file
allowlist was updated; the package check and six affected distribution tests then
passed. This change updates documentation and its package inventory, without
changing guest/MCP execution behavior.

The three temporary grants were revoked and only the three new QA computers
were stopped after verification. Their private state/evidence and volumes were
retained. The pre-existing review computers remained running on their original
loopback ports. No unrelated container, volume, remote machine or default Docker
context was modified. Hosted Actions were not dispatched.
