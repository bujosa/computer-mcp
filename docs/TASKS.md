# Give your agent a task

Start an owned computer, connect its exact MCP entry to your local harness and
load the [operator skill](../ui/skills/sendtry-computer/SKILL.md). The model and
conversation run in that harness; Sendtry Computer supplies the Linux guest and
its tools. See [setup](SETUP.md) for client paths and commands.

In **Connect agent → Start working**, first **Check the connection**, then choose
**Give your own task**:

1. Describe the goal and an observable success criterion.
2. Expand **Scope and limits** for allowed paths, sites, dependencies and actions.
3. Keep **Prepare a plan first** for inspection and proposed steps, or select
   **Do the task** for authorized execution through work access.
4. Review/copy the request and send it to your connected agent. Release human
   control before execution. Copying starts no agent or job.
5. Observe **Screen** and **Activity**, then inspect resulting files/pages. Ask
   for evidence, partial work and uncertainty, not just a success claim.

The request pins both computer/workspace IDs and calls for capability checks,
scoped work, actual outcome verification and lease cleanup. Copy rechecks the
two IDs with a fresh bounded read. Read access cannot prepare execution.
These are agent instructions. Runtime identity, credentials, leases, schemas
and limits enforce authority; prose cannot enforce arbitrary task boundaries
or guarantee model behavior. Terminal access extends beyond the contained file
workspace. Internet mode permits reachable LAN/host services as well.

## Prepare a task directly through MCP

Clients supporting MCP prompts can list `computer-task` and retrieve it with
string arguments `goal`, `expectedResult`, optional `scope` and optional
`intent` (`plan` by default, or `execute`). With an already connected SDK client:

```js
const prepared = await client.getPrompt({
  name: 'computer-task',
  arguments: {
    goal: 'Read the supplied guest CSV and create a report in a new directory.',
    expectedResult: 'Totals reconcile; source unchanged; report read back.',
    scope:
      'Only that source and a new output directory. No installs or external actions.',
    intent: 'plan',
  },
});
```

Retrieval freshly verifies both connected IDs, uses the console's formatter and
returns a user message. It acquires no lease, performs no requested work and
persists no task text. Read credentials reject execute; unknown fields,
invalid/oversized requirements and changed identity fail. The connection defines
the binding; do not supply another PC's IDs.

The host application decides how to show/use the prompt. SDK interoperability
does not certify a Claude/Codex/Cursor prompt menu or automatic model invocation.
Console copying remains available when a harness lacks prompt support.
`taught-workflow` handles reviewed procedures, while `analyze-demonstration`
prepares evidence analysis. None starts inference or execution.

Actual Claude Code 2.1.299 discovered and invoked
`/mcp__computer__computer-task Inspect Plan Read-only plan` through its normal
MCP command loader. The resulting plan used read tools and acquired no control.
Its [documented parser](https://code.claude.com/docs/en/mcp#execute-mcp-prompts)
splits arguments on whitespace: use the console copy/SDK flow for multiword
requirements rather than assuming shell quotes preserve them. This CLI proof
does not establish Cursor/Codex prompt-menu support. Their tool/skill integration
is tested separately.

## An advanced bounded example

**Goal:** read a guest CSV, write/run a standard-library report generator in a
new directory, produce JSON/Markdown summaries, then publish a note through a
reviewed taught procedure.

**Success:** totals reconcile with valid rows; rejected rows are explained;
source is unchanged; reports read back; the exact note remains after browser
reload; terminal exit/status/output and lease release are checked.

**Scope:** only that source, a new output directory and the local practice page;
no installs, external actions or overwrites. Supply the reviewed revision and
fresh parameters. Resolve browser selectors and native desktop focus from
current observations.

Actual Claude Code and Codex agents completed this example: seven valid rows,
one rejected row and 510 minutes, separately taught/reviewed procedures and
persisted browser results. The parent independently checked both reports and
unchanged sources. This is a bounded multi-step example, not unlimited autonomy.
See [the harness record](HARNESS-VALIDATION.md#advanced-task-follow-up-14-october-utc).

## Teaching and recovery

**Teach & skills** captures an owner demonstration on the same guest. Optional
silent video supplies consented sampled frames to a work agent, which proposes
parameterized instructions. You review/correct the draft before publishing it.
**Try with new inputs** prepares a request pinned to that revision. The operator
skill handles general computer work; the taught skill describes one procedure.
Neither trains a model automatically. See [Teach](TEACH.md).

The saved Teach workflow is a reusable method/evidence record. A new task request
is a separate instruction to the existing agent to plan or use that method with
current inputs. Finishing a recording does not create a queued analysis job;
copy/send its analysis request, review the returned proposal, then copy/send a
new execution request. Follow the
[project-note walkthrough](TEACH.md#worked-example-teach-a-project-note) to see
the exact owner/agent handoffs and how to independently check the result.

For reuse, the agent waits for a fresh ready/reviewed/exact-revision check after
acquiring control and before its first effect. General tools do not atomically
bind every effect to that workflow pin.

**Take over** revokes the agent lease and cancels pending operations. Completed
effects remain. The agent should inspect partial results with read tools and
stop uncertain work, without retrying a mutation or releasing human control.
An actual Claude command was interrupted this way; its completion marker stayed
absent after the original deadline and owner control remained intact.

Terminal calls are bounded to 30 seconds, text files to 256 KiB, output to 64 KiB
and desktop input to supported actions. Split larger tasks into verified steps.
There is no background task queue, checkpoint/resume engine or retry scheduler.
Long-running autonomy and every client/model are not certified by these checks.

## Privacy and audit

Task fields stay in page memory and clear when leaving Connect agent, clearing
the form, losing authorization or changing computer identity. The server does
not persist their text or mark copied tasks successful. Clipboard and harness
retention are separate; keep credentials and sensitive data out of requests.
Goal/outcome/scope limits are 4,000/2,000/2,000 characters.

Activity records retained sessions and allowlisted tool/control metadata,
including declared client labels, timing and outcomes. It stores no full task
prompts, file contents, commands or task completion verdict. Labels are client
declarations, not verified people/model identities. See [Activity](ACTIVITY.md).
