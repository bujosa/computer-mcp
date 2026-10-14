# Real Claude Code and Codex validation

On 13 October 2026 UTC, actual logged-in local CLIs used the private Sendtry
Computer MCP over stdio. These were model-driven tool calls, not SDK fixtures or
scripted browser replay. The owned Linux guest was `review-mvp`; its computer
and workspace pins were checked before work. The host was macOS arm64, with
Node 24.1.0 and saved Docker context `desktop-linux`. The default context stayed
`ser9`. No native host desktop permissions, public release or global MCP settings
were changed.

| Harness     | Version | Model selection                                    | Connection observed in Activity      |
| ----------- | ------- | -------------------------------------------------- | ------------------------------------ |
| Claude Code | 2.1.296 | `opus`, resolved to `claude-opus-5-5`; high effort | `claude-code`, MCP `2026-07-28`      |
| Codex CLI   | 0.162.1 | `gpt-6.1-sol`; medium reasoning                    | `codex-mcp-client`, MCP `2025-06-18` |

## Advanced task follow-up: 14 October UTC

On the same private macOS/ARM64 host and owned Linux guest, both actual CLIs
received the exact request copied through the new **Give your own task** UI.
A temporary clipboard spy forwarded the real write and captured only the
synthetic request; it was restored afterwards. No operator body was pasted into
these prompts. Both completed bounded multi-step tasks in new, separate guest
directories: read CSV, create/run a Python standard-library report generator,
write JSON/Markdown, report/skip malformed minutes, reuse their separately
reviewed project-note procedure with computed values, save once, reload and
verify the persisted card, then release their lease.

Independent parent reads verified both sets of aggregates: seven valid rows,
one invalid row, total 510, done 420, open 90; Atlas 210, Beacon 135, Cedar 165.
Both source files remained byte-for-byte unchanged, SHA-256
`1e1139cfcdb3d500658cc44709f77979a11a510bf53ff4d84be473ca8b99db06`.
Reports explained the rejected row. Claude's persisted result was retained in its
post-reload response; the parent also read Codex's final saved card. Each checked
the ready/reviewed exact revision sequentially after acquisition, before effects.

Both called real guest `desktop_action` for Ctrl+l, local URL text and Return,
with native PNG images and a subsequent saved-card snapshot. Input delivery and
the card were observed; an identical before/after PNG alone cannot prove a
navigation transition. Claude explicitly reported this limitation. Codex's final
answer stated no uncertainty; that statement is stronger than the evidence for
the exact keyboard reload transition, and is not adopted here.

Claude's first advanced run took about 80 seconds; Codex's about 128 seconds.
These are individual runs, not reliability or latency benchmarks.

### Actual project skill loading

The initial Claude advanced run's Skill tool returned `Unknown skill` because
its isolated invocation had empty `--setting-sources`. It honestly reported that
and still completed MCP work using server instructions. That is a failed skill
discovery check, not a fully passing skill-enabled execution.

A separate read-only probe in an owned temporary project used
`--setting-sources project`, native `--tools Skill`, the exact Skill/info grants,
strict MCP config and `dontAsk`; no bypass flag or global settings change.
`Skill(sendtry-computer)` loaded the actual operator body and the model quoted
its cancellation rules, then verified both IDs. Claude strips frontmatter from
the loaded body, so it correctly declined to invent its version.

Codex's initial advanced invocation disabled all host file tools. Its statement
that it was using the skill did not independently establish loading the body.
A separate read-only probe retained a file-reading tool solely for the explicit
project skill read. The actual trace contains only `cat
.agents/skills/sendtry-computer/SKILL.md` as a host command, exit 0; it read
frontmatter version 7 and the storage-full rule, then verified the existing guest
reports and card through read-only MCP. It did not rerun the task or acquire
control. Project-relative paths, restart/invocation and file-read prerequisites
are now explained in Connect agent and [setup](SETUP.md).

These contracts were checked against official
[Claude Code skills](https://code.claude.com/docs/en/skills) and
[Codex skills](https://learn.chatgpt.com/docs/build-skills) documentation.
Cursor/Desktop/IDE skill loading remains untested.

### Named-model human takeover

With the actual project Skill successfully loaded, Claude acquired its agent
lease and issued one 30-second guest command: write a unique start marker, sleep
25 seconds, then write a completion marker. The parent observed the start file
and clicked the real owner console's **Take over** while it was pending.

The tool returned `lease_lost` rather than exit/stopped fields. Claude used read
tools to inspect partial work and the human lease, did not retry or mutate, and
did not release human control. It accurately reported its remaining timing
uncertainty. Parent checks at 02:13:02 UTC, after the original command deadline,
confirmed the start file and absent completion file. Only then did the owner
release control; final lease was null. This tests one actual named harness's
takeover recovery. Named-harness timeout/disconnect injection remains untested.

The owner-only Activity export retained four declared Claude/Codex sessions for
the two advanced runs, takeover and Codex read-only skill probe. All ended as
`client_closed`; takeover's terminal event was `cancelled` / `lease_lost`.
The Claude skill/info-only probe retained MCP source/timestamps but null client
name/version/protocol. This is incomplete declared attribution, not an invented
identity. No full prompt, command, file data or model-verified identity is added
to the audit contract.

Private requests, JSONL, copied skill files, outcome checks and independent reads
are ignored under `artifacts/advanced-experience-20261014/` or owned temporary
directories. They are not shipped as product data or a UI test harness. See
[task assignment](TASKS.md) for boundaries and ordinary use.

## Completed scenarios (13 October)

Both harnesses passed the following model-driven scenarios. Success was checked
against tool responses, independent file/page reads and owner-only Activity,
rather than accepting the final answer alone.

| Scenario                     | Claude Code | Codex CLI | Observed behavior                                                                                                    |
| ---------------------------- | ----------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| Work connection and identity | Pass        | Pass      | Exact computer/workspace pins; dedicated Linux guest, no host control                                                |
| Files and terminal           | Pass        | Pass      | New unique file, exact newline-preserving readback; `pwd` in `/data/workspace`, exit 0, no timeout/truncation        |
| Reuse a reviewed task        | Pass        | Pass      | Current reviewed revision checked; fresh selectors; new supplied values; save once; reload and verify the saved card |
| Desktop images               | Pass        | Pass      | Actual MCP PNG images delivered and inspected; scroll/view actions used to expose the result                         |
| Control cleanup              | Pass        | Pass      | Each released only its own lease; final lease null; Activity session ended `client_closed`                           |
| Read-only connection         | Pass        | Pass      | Observed page/workflow/images; distinguished runtime capabilities from exposed read tools; refused requested write   |
| Human holds control          | Pass        | Pass      | Reported human ownership; no acquisition, renewal, release, retries or task effects; human lease preserved           |

## Teach video, owner review and reuse

Two independent silent guest recordings were made through authenticated owner
control. Each lasted about 6.56 seconds, with 52 encoded frames and four retained
main-frame trace steps. The owner explicitly enabled frame analysis for each.
Claude and Codex then inspected the actual MCP PNG samples and trace, saved one
parameterized proposal each and confirmed it remained unreviewed. Neither
acquired control or performed the recorded task during analysis. Claude requested
three extra timestamps (six samples total); Codex used the three default samples.

Both drafts correctly separated recorded filling/saving from an additional
reload-verification step that the video did not demonstrate. Claude inferred
automatic scrolling; the actual owner had pressed End, which was absent from
the four-step trace. The parent corrected that inference in the owner review
notes, checked the actual PNG evidence/parameters and accepted each exact draft.
Frame access was then revoked before preparing fresh revision pins.

Both models executed their own published procedure with new supplied values,
saved once, reloaded the practice page, verified the saved card with reset input
fields and released their own control. The final pins were:

| Harness | Workflow                               | Reviewed revision used for reuse       |
| ------- | -------------------------------------- | -------------------------------------- |
| Claude  | `ccb42efa-f07e-431d-9464-b957defb7580` | `9662ff19-9de0-465f-b4a0-67ebc7c273c3` |
| Codex   | `8ce6fdce-a5d8-4e5e-80ba-1bb38b3ec590` | `792ca339-09cf-406f-a152-83ec663f5bbb` |

These are actual CLI/model proposal-and-reuse paths, not automatic training or
inspection of every video frame. The model providers receive sampled PNGs; raw
WebM remains owner-only. Owner review corrected evidence before publication.

## Instruction correction from real behavior

Claude's first reuse saved the correct result, but scheduled its post-acquisition
workflow check and first navigation in the same assistant message. It reported
that ordering caveat itself. Although the response stream delivered the read
result first, the model's plan did not establish the required dependency.

The operator skill (version 7) and MCP server instructions now explicitly require
waiting for the post-acquisition ready/reviewed/exact top-level revision response
before the first mutation, including navigation. The repeat placed the check and
navigation in separate assistant turns; the read result preceded the next action.
Codex's reuse also completed that check before starting navigation. All final
reuse calls succeeded. This is stronger agent guidance, not an atomic review lock
on general tools; arbitrary agents can still ignore it. A future execution contract
would be needed to enforce workflow pins on each effect.

One parent QA helper initially expected the review POST response to contain the
derived `reviewed` field; the saved review was already correct. Reading the public
workflow GET confirmed it, and the helper was corrected before the reuse runs.
This was a test-orchestration error, not a failed owner review or an MCP failure.

## Work-run observations

The work runs used reviewed workflow `a80e347a-b4c8-414e-b1f5-9e331da66ef8`
at revision `04a91777-d20b-4b58-b117-17a7ac0ac4f4`. Separate unique files were
created. Independent reads verified both; Codex's saved project/note were also
verified on the actual page after both sequential runs. Claude's persisted result
was present in its actual post-reload tool response and subsequent screenshot.
Read-only and busy runs' requested files were absent. No private state contents
or credentials were supplied to the models.

In this one work task, Claude completed in about 37 seconds and Codex in about
76 seconds. Claude made 20 tool calls; Codex made 28, including additional
snapshots and scroll/image checks. These are observations of one run with
different model/effort settings, not a latency, reliability or quality benchmark.
Both work runs had no failed tool calls or permission denials.

Claude noticed that `review.sourceRevision` differed from the published workflow
revision. This is expected provenance: it identifies the source of the accepted
proposal. Owner approval creates a new top-level `revision`; later consent changes
also advance it. Reuse must pin the top-level `revision`, ready status and reviewed
flag. See [Teach](TEACH.md).

## Temporary harness setup

The test loaded only this computer's explicit stdio entry, using an absolute state
path and the normal `config`/`connectionEntry` format. The state remained private
on the trusted host; config contained Node/CLI/state paths, never credential values.
Existing subscription logins were used. No API key or new account was requested.

Claude used `--strict-mcp-config --mcp-config <temporary-json>`, empty
`--setting-sources`, `--restricted --tools ""`, the explicit
`--allowedTools 'mcp__computer__*'` rule, `--permission-mode dontAsk` and
`--no-session-persistence`. Its built-in host tools and slash commands were
disabled. Each run had 24 turns, a $6 estimate cap and an eight-minute parent
deadline. This was an explicit narrow MCP grant, not a permission-bypass flag.

Codex used `exec --ignore-user-config --ephemeral --sandbox read-only`, per-process
`-c mcp_servers.computer.command=...` / `args=...`, required startup and an explicit
approval grant for this server's tools. Host shell, browser/computer-use, image-file
viewer, apps/plugins/hooks and subagents were disabled for the invocation;
web search was disabled. Parent time and output caps were eight minutes and 4 MiB
per run. Normal CLI settings, other MCP servers, user skill folders and unrelated
checkouts were not modified. The supplied operator skill was included in the
prompt; automatic skill installation/discovery was not tested.

For reproduction, first start an idle owned PC, then generate its exact work/read
entry and use a temporary directory. Supply both UUIDs, a new unique file name,
the current reviewed workflow revision and fresh task values in the prompt.
Keep native tools out of the scenario so a successful host operation cannot be
mistaken for an MCP guest operation. Do not share `computer.json`, add a shell
allowlist for Docker, bypass read scope or take over a person's lease.

Configuration contracts were checked against the installed help and official
[Claude Code CLI](https://code.claude.com/docs/en/cli-reference),
[Claude MCP](https://code.claude.com/docs/en/mcp) and
[Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) documentation.

## Limits and evidence

This verifies bounded local CLI use on one owned Linux guest. It does not certify
Claude Desktop, Cursor, Codex IDE/TUI setup, all models, autonomous long-running
tasks, native host control or isolated Windows/macOS guests. The 14 October
follow-up above adds an actual Claude command takeover test. Named-harness
disconnect failure injection and terminal timeout behavior remain untested; the separate real
MCP/security suites cover those runtime paths with SDK clients.

Private JSONL transcripts, prompt/config files, independent result reads and
Activity metadata are ignored under `artifacts/agent-harness-20261013/`. They are
not published or committed. Activity labels are declared client metadata, not
cryptographic identity or proof of the model/provider. Timing is local operational
evidence; see [Activity](ACTIVITY.md) and [validation](VALIDATION.md).

The full owner export retained 11 CLI MCP sessions (including Claude's ordering
retry), all closed as `client_closed`, with successful retained action outcomes.
Ten had declared Claude/Codex labels. Codex's busy run called only `computer_info`;
its session retained MCP source/actor/timestamps but null client name/version/
protocol. This correlation comes from the actual CLI transcript and timing, not
an invented audit label. Maintenance/info-only reads do not relabel sessions;
activity client names remain incomplete attribution rather than authentication.
The bounded session list is not the full export; it cannot be used as a total
session count when truncated. A parent query above the permitted page limit was
rejected and corrected to the owner export during this inspection.
