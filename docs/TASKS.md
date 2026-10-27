# Give your agent a task

[Actual two-PC Claude/Codex acceptance](ASSIGNMENT-VALIDATION.md) covers the
named assignment flow with reviewed skills and independent owner verification.

Start an owned computer, connect its exact MCP entry to your local harness and
load the [operator skill](../ui/skills/sendtry-computer/SKILL.md). The model and
conversation run in that harness; Sendtry Computer supplies the Linux guest and
its tools. See [setup](SETUP.md) for client paths and commands.

Create a named work connection on the trusted host first:

```sh
node src/cli.js start --name coding
node src/cli.js connection create codex-work --name coding --access work --client codex
node src/cli.js connection list --name coding
node src/cli.js connection list --all
```

Install the exact printed MCP entry, preserving its unique server key and private
`--connection` file path. Each file pins one PC, workspace, grant and access.
New PCs disable legacy shared access. [Named setup and compatibility](SETUP.md#create-and-manage-named-connections)
and [the complete assignment contract](ASSIGNMENTS.md) explain the boundary.

In **Tasks → New task**:

1. Choose an active named work connection on this computer.
2. Give the task a name, goal and observable success criterion. Expand
   **Scope and limits** for allowed paths, sites, dependencies and actions.
3. **Assign task & copy request** explicitly saves the requirements for that
   grant. Send the copied request to the existing agent; release human control.
   Saving/copying does not launch a model or start the attempt.
4. The agent checks `computer_info`, reads `task_list`/`task_get`, then calls
   `task_start` with the assigned task UUID. That call takes exclusive control
   and binds one attempt to its grant/session, boot and lease generation.
5. Observe **Screen** and the task's status. The agent inspects actual output and
   calls `task_finish` with `success`, `failure` or `uncertain`, a factual summary
   and bounded evidence references. It releases only that attempt's lease.
6. Inspect the files/pages yourself, then record the owner verdict and notes.
   An agent success report remains unverified until that separate check.

The request pins computer/workspace/connection/task IDs. Named effects require
both a running assigned attempt and its session's current lease; manually calling
`control_acquire` does not replace the assignment. Read observations, planning
and owner-consented Teach analysis/proposal need neither a task nor a lease.
Task prose cannot constrain every shell command or guarantee model behavior:
terminal access extends beyond the file-tool workspace, and Internet mode permits
reachable LAN/host services. Use narrow requirements and inspect real outcomes.

Each request owns one attempt. Repeated `task_start` by the same bound session
returns that running attempt; a terminal/interrupted request cannot restart.
If the finish response is lost, read `task_get` first. Only an identical report
from the same bound session is an idempotent completion; conflicting reports fail.
The owner must create a new request for a retry. There is no automatic effect retry,
model dispatch, checkpoint/resume engine or reassignment scheduler.

## Prepare a task directly through MCP

Named work clients can retrieve `assigned-task` for an existing queued task:

```js
const assigned = await client.getPrompt({
  name: 'assigned-task',
  arguments: { id: taskId }, // UUID returned by the owner's saved assignment
});
```

This freshly reads only that connection's task, requires a queued/current method
and prepares its request. It creates no assignment and starts no attempt.
`task_start` remains the activation step. The prompt is absent from named read
and legacy connections.

Clients supporting MCP prompts can also list `computer-task` and retrieve it with
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
persists no task text. Named connections reject its `execute` intent; use a saved
assignment instead. Read credentials also reject execute; unknown fields,
invalid/oversized requirements and changed identity fail. The connection defines
the binding; do not supply another PC's IDs.

The host application decides how to show/use the prompt. SDK interoperability
does not certify a Claude/Codex/Cursor prompt menu or automatic model invocation.
Console copying remains available when a harness lacks prompt support.
`taught-workflow` prepares reviewed plans; named execution likewise requires a
saved assignment pinned to that method. `analyze-demonstration` prepares evidence
analysis. Legacy shared work retains its earlier untracked execute-request flow
only when the owner enables legacy policy. None of these prompts starts inference.

In the earlier shared-connection acceptance, Claude Code 2.1.299 discovered and invoked
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

Earlier Claude Code and Codex agents completed this example: seven valid rows,
one rejected row and 510 minutes, separately taught/reviewed procedures and
persisted browser results. The parent independently checked both reports and
unchanged sources. This is a bounded multi-step example, not unlimited autonomy.
See [the harness record](HARNESS-VALIDATION.md#advanced-task-follow-up-14-october-utc).
That historical proof predates saved named assignments; it is not an execution
claim for the current slice.

## Teaching and recovery

**Teach & skills** captures an owner demonstration on the same guest. Optional
silent video supplies consented sampled frames to a work agent, which proposes
parameterized instructions. You review/correct the draft before publishing it.
**Try with new inputs** can prepare a plan or assign an execution trial to a named
work connection, saving its exact reviewed workflow/revision. The operator
skill handles general computer work; the taught skill describes one procedure.
Neither trains a model automatically. See [Teach](TEACH.md).

The saved Teach workflow is a reusable method/evidence record. A saved assignment
is a separate owner request to one grant, with one execution attempt and its report.
Teach form values stay in the open form/copied request; they are not automatically
added to the saved method, assignment requirements or Activity. Finishing a recording does not create a queued analysis job;
copy/send its analysis request, review the returned proposal, then copy/send a
new execution request. Follow the
[project-note walkthrough](TEACH.md#worked-example-teach-a-project-note) to see
the exact owner/agent handoffs and how to independently check the result.

For named reuse, `task_start` checks the pinned method while activating under the
workflow store's mutation queue. The agent then awaits another
ready/reviewed/exact-revision check before its first effect. Runtime checks bind
tracked effects to the active assignment/session/lease; a running taught attempt
blocks method review/proposal/consent changes. Referenced programs and external
pages can still change and need fresh inspection. Earlier legacy work remains
untracked and relies on its procedural revision checks.

**Take over** revokes the agent lease and cancels pending operations. Completed
effects remain. The agent should inspect partial results with read tools and
stop uncertain work, without retrying a mutation or releasing human control.
Revocation, lease expiry/release, disconnect and restart interrupt the assigned
attempt; the agent cannot resume it. Owner cancellation is available without the
agent's token and drains active input before control is reused. An earlier Claude
command was interrupted by takeover; its completion marker stayed
absent after the original deadline and owner control remained intact.

Terminal calls are bounded to 30 seconds, text files to 256 KiB, output to 64 KiB
and desktop input to supported actions. Split larger tasks into verified steps.
Saved queued assignments wait for the external agent to activate them; there is
no background runner, checkpoint/resume engine or retry scheduler.
Long-running autonomy and every client/model are not certified by these checks.

## Privacy and audit

Explicitly assigned requirements, agent reports/evidence references and owner
verification notes are private content persisted separately in the root-only
operations store. Creating/copying an assignment does not mark it successful.
The task name/goal/success criterion/scope limits are 120/4,000/2,000/2,000
characters. Reports allow a 2,000-character summary and up to ten 500-character
evidence references; owner notes are bounded to 2,000 characters. Keep secrets,
raw task payloads and credentials out of these fields. Clipboard and harness
retention are separate.

Unsaved planning and Teach trial values remain transient form/request content.
Leaving/clearing a form does not delete an assignment already explicitly saved.
The operations store holds at most 500 tasks and 500 attempts with a 16 MiB
database ceiling. Terminal tasks become eligible for retention cleanup after 90
days without an update; queued/running work is protected. See
[persistence details](ASSIGNMENTS.md#persistence-and-audit).

Activity records retained sessions and allowlisted tool/control metadata,
including trusted connection/task/attempt UUIDs, declared client labels, timing
and operation outcomes. Activity stores no requirement/report/note text, task
inputs, file contents or commands. Reports and owner verdicts live in the separate
task store, not an inferred Activity success score. Grant labels and client
declarations do not verify people/models. See [Activity](ACTIVITY.md).
