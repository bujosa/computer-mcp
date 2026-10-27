# Grok Bot reference and Sendtry Computer direction

Rechecked 16 October 2026 UTC against public first-party documentation and this
repository's executed evidence. Grok was not installed or tested during this
review. Vendor descriptions are not our measurements or an independent security
assessment. Source code, recordings, screenshots and assets were not copied.

## What the official documentation establishes

[Grok Bot overview](https://docs.x.ai/grok-bot/overview) describes persistent
agents with role/context, messaging and tools. It combines agent orchestration
with a cloud computer, a broader product than an MCP computer provider.

[Use the computer and apps](https://docs.x.ai/grok-bot/computer-and-apps), updated
12 October, describes an account-owned cloud machine shared by its Bots. Files,
browser sessions and credentials are shared; separate screens do not create
security boundaries. Owners can view work, take over for sensitive steps and
retain durable workspace/browser state. Cloud work can continue with the laptop
closed. Native local execution is a separate permission. Structured connectors
are preferred where suitable, computer interaction for other paths.

[Skills and routines](https://docs.x.ai/grok-bot/skills-routines-and-automations),
updated 12 October, distinguishes reusable instructions from scheduled/event
execution. Teach records visible browser interaction, up to ten minutes without
microphone audio, then produces a draft to review and test. Availability may be
gradual. Skills need inputs/access, decision rules, result checks and failure/
approval boundaries that one demonstration may omit. Test a one-time task before
scheduling it.

Those pages do not specify video encoders, frame sampling, the number or roles
of analysis agents, a skill compiler or a model-training pipeline. We cannot
assert how Grok internally derives a skill from a recording. Our implementation
is independently defined: consented video samples plus action trace, a proposal
from the existing vision-capable harness, owner correction/review, then reuse.

## Does a recording become a task for the agent?

The documented Grok experience ends recording with a Bot-created draft skill for
review and testing. Those Teach instructions describe neither an analysis-job
API nor the internal worker pipeline. See the first-party
[Teach instructions](https://docs.x.ai/grok-bot/skills-routines-and-automations#teach-a-workflow-by-demonstration).

In Sendtry, the saved **workflow** is the unit your agent analyzes: stable ID,
goal, captured trace, optional media and evolving revision. `workflow_analyze`
delivers authorized evidence; the connected agent reasons and saves a candidate
procedure with `workflow_propose`. The draft remains on that same workflow.
Owner review publishes instructions; a later task request asks the agent to use
them with new inputs. No separate queued analysis job or execution attempt is
created by finishing the recording.

The visible handoff is currently manual: **copy/send analysis request → agent**,
then **copy/send reviewed task request → agent**. This keeps model choice and
conversation in the user's existing harness. Automatically dispatching an agent
would require a future harness integration with explicit identity, consent,
cancel/retry and result contracts. It is not implemented by an MCP prompt or
claimed as current functionality. The
[worked example](TEACH.md#worked-example-teach-a-project-note) follows the complete
path without an internal chatbot or scheduler.

## What Sendtry actually provides

| Experience          | Sendtry Computer today                                                                                                          | Limit or owner                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Agent's computer    | Dedicated persistent Linux Docker guest per registered PC; browser, terminal, files, screenshots and bounded native guest input | Container, not a VM/hostile-code boundary; host macOS/Windows does not make those guest OSes      |
| Agent intelligence  | Existing Claude/Codex/other harness connects over stdio                                                                         | Harness owns model, conversation, decisions, approvals and any scheduling                         |
| Several agents      | Read observation alongside one exclusive writer on the same PC; separate PCs for separate state                                 | Agents sharing a PC share files/profile and work authority; no per-agent data partition inside it |
| Owner involvement   | Same live desktop; Take over revokes the agent lease/cancels pending work                                                       | Completed effects remain; inspect partial results before resuming                                 |
| Teach               | Trace plus optional local silent WebM; consented sampled PNGs to a work agent; draft → review → fresh-input reuse/export        | Five-minute/20 MiB clip limits; sampled evidence can omit steps; reviewed is not verified success |
| General tasks       | Goal/success/scope with plan-first handoff in the console and `computer-task` MCP prompt                                        | Retrieval runs no task; clients may omit prompt support and models can ignore instructions        |
| Audit               | Owner-only retained session/tool/control metadata, declared labels, timing and outcomes                                         | No verified person/model identity or task verdict; no task/file/command payloads                  |
| Availability        | Data survives normal stop/rebuild; host Docker and harness must remain available                                                | No cloud compute, phone sync or persistent background task/routine service                        |
| Skills distribution | Project operator SKILL.md and reviewed computer/revision-bound exports                                                          | No automatic installation, cross-PC rebinding, public package or Skills-over-MCP extension        |

MCP supplies an interface; it does not create intelligence, installations or
reliable autonomy. The official [SDK prompt contract](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/packages/server/src/server/mcp.ts)
supports discovery/retrieval of prepared messages. `computer-task` uses that
contract with the existing formatter. It is not an agent-launching tool.

## A practical product flow

1. **Choose a PC:** create/register it, inspect availability and keep its explicit
   UUIDs. The CLI default selects future commands; it never retargets a bridge.
2. **Connect the harness:** add the exact local work/read entry, reconnect, load
   the operator skill and verify identity/capabilities with a real task.
3. **Give a bounded outcome:** supply current inputs, allowed actions, success
   evidence and failure rules. Plan first when execution scope is unclear.
4. **Work visibly:** prefer file/browser tools, bounded guest code and fresh
   screenshot/focus for native input. Owner login steps stay in the owned guest;
   do not put secrets in chat or a demo.
5. **Check the result:** inspect artifacts/page state independently. Tool success,
   model claims and copied requests are not verified outcomes.
6. **Teach recurring work:** record the relevant task, review frame sharing,
   correct/parameterize the proposal and reuse with new inputs. Stop on a changed
   review or unknown partial result. Scheduling stays in the harness.

The inference to test is that this narrow computer/Teach layer makes an existing
agent more useful without another agent platform. Demand, reliability across
tasks and mass-market onboarding are not established.

## Useful tasks and their evidence

- **CSV → report → saved note:** actually executed by Claude and Codex. They
  wrote/ran generators, rejected malformed input, reconciled totals, preserved
  sources, reused reviewed procedures and verified persisted browser cards.
- **Create a small guest CLI:** a template using code/text files and bounded
  terminal calls; request runnable examples and readback. This exact recipe has
  not been separately evaluated. Dependencies/execution must fit the limits.
- **Summarize the current page:** observation can use read access; navigation
  needs work access. Source attribution and writing a report require their own
  scope/checks. This is a template, not a tested cross-site research benchmark.
- **Repeat a taught form:** actual video analysis → corrected review → new-input
  reuse passed in both named harnesses. Other applications, changed forms,
  logins and ambiguous effects need separate validation.

See [tasks](TASKS.md), [Teach](TEACH.md) and [harness evidence](HARNESS-VALIDATION.md).
Deliver artifacts inside the guest; host repositories are not mounted or copied.

## Honest readiness and next priorities

The local developer MVP has working paths. It is not perfect, certified for every
application or ready to promise mass-market unattended operation. Priorities:

1. Broaden clean installation and artifact checks. Claude, Codex and Cursor CLI
   skill/loading and task paths passed. Bounded source-checkout lifecycle QA now
   covers Windows and Linux hosts; the Windows preservation check retained a
   concurrent foreign-container removal failure. See [host QA](HOST-VALIDATION.md).
   The private tarball's real guest build was exercised on local macOS; new
   artifacts on other hosts and editor/desktop UI registration need their own
   acceptance. Hosted CI is intentionally disabled by owner request; local checks remain required. See
   [client acceptance](CLIENT-VALIDATION.md) and [distribution](DISTRIBUTION.md).
2. Broaden task evaluation beyond the six fresh-input form repetitions and
   three deliberate timeouts now checked in those CLIs. Graceful Claude CLI
   termination also stopped its guest process and released control. These
   synthetic checks do not establish a real-world success rate.
3. Explicit task-attempt/verifier attribution before success badges or automatic
   resume. Activity timing cannot supply that provenance.
4. Portable reviewed templates with explicit owner rebinding before cross-PC
   sharing. Separate credentials/video from computer-local review pins.
5. Approved licensing, notices, packaging, contribution/support policy and brand
   terms before publication. Repository stays private/UNLICENSED.

These are priorities, not delivered features. Keep cloud billing, bots, chat and
routines outside this repo. Adapters need demonstrated demand and their own
isolation/permission contract. See [release gates](READINESS.md).
