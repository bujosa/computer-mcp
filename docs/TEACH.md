# Teach a task, understand it, reuse it

Teach turns an owner demonstration into evidence, an agent-proposed method and
an owner-reviewed skill. The external agent supplies the reasoning. A saved
workflow is the persistent record of this process; a task request asks an agent
to use it on a particular occasion.

## What is created, and when

| Stage                  | Artifact                                                                            | Meaning                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Start/finish recording | Workflow ID, computer ID, name, goal, timestamps, captured steps and saved revision | A demonstration exists on this computer. `status: ready` means it finished, not that its procedure is approved or has passed a test. |
| Optional video         | Local guest WebM and media metadata                                                 | Visual evidence. Typed values may be visible even though the trace omits them. Raw video remains owner-only.                         |
| Allow analysis         | Consent and a new workflow revision                                                 | Work agents can request sampled frames. This does not launch a model or an analysis task.                                            |
| Agent proposes         | Draft procedure, expected result, uncertainties and source revision                 | A candidate skill on the same workflow, awaiting human correction/review. It is not an executable script or an approved task.        |
| Owner confirms review  | Published reviewed procedure and a new top-level revision                           | Export/reuse becomes available. The review does not certify a successful run.                                                        |
| Prepare a plan/run     | A copied request with computer/workspace/workflow/revision pins and current inputs  | Instructions for the existing agent. There is no durable background task or task-success record.                                     |

Workflow identity stays stable as its revisions change. Workspace identity comes
from the owning computer's persistent volume and is included in exported skills
and prepared requests. The proposal is stored on the existing workflow, rather
than creating another PC or a separate queued analysis job. Recorded workflows,
media and reviews survive normal stops/rebuilds in that computer's private data
volume. See [data boundaries](../arquitecture.md).

There are two explicit handoffs: **analysis request → connected agent**, and
after review, **new task request → connected agent**. The console does not know
how to start an arbitrary Claude/Codex/Cursor session. A harness must already be
connected and receive the request. A skill file is optional for this handoff;
installing it is a separate way to make the reviewed method discoverable later.

## Record, analyze and review

1. Start/open your selected computer. Take control in the owner console.
2. In **Teach & skills**, choose **Teach a task**, name the outcome and optionally include
   guest video. Keep credentials/customer data out of the demonstration.
3. Demonstrate in the live guest, Files or Terminal. The action trace omits typed
   values/commands/content and preserves parameters, cwd and command outcomes.
   Video records the visible guest screen, including values the trace omits.
4. Choose **Finish demonstration** to save and return to Skills. Open
   **Review the demonstration evidence** to play the saved video and
   inspect the trace. Silent clips have a five-minute capture deadline and a
   20 MiB limit; storage reserves 20 MiB per capture within 200 MiB total.
5. For agent reasoning, choose **Allow agent analysis**, then **Copy analysis
   request** and send it to the vision-capable agent connected through work MCP.
   This grants every connected work agent frame access for this workflow. Your
   harness/model provider can receive visible image data. No inference account or
   model is bundled into Sendtry Computer.
6. The agent calls `workflow_analyze` to inspect samples/trace, requests additional
   timestamps if needed and calls `workflow_propose` with the source revision.
   It can propose up to 16 task inputs such as `csv_path` or `project_name`, with
   names/descriptions only. Values and defaults are not part of a definition.
   No lease is needed for this metadata/media handoff. The agent must explain
   uncertainties, missing inputs, failed attempts and unsupported desktop actions,
   without executing the demonstrated effects or copying credentials.
7. Choose **Refresh saved skill** / **Review updated proposal**. Correct the full
   procedure and success criterion, then **Confirm review**. A stale revision
   fails; refresh and review the current proposal. **Discard proposal** preserves
   prior owner-approved edits. Video-free trace review works directly too.
8. Choose **Try with new inputs** to prepare a request tied to the saved review,
   computer and workspace. Supply task inputs or leave them blank for the agent
   to ask. **Prepare a plan first** is the default; **Do the reviewed task**
   requests execution through the existing work connection. Inspect/copy the
   request and send it to your chosen agent. You can also export `SKILL.md` into
   your harness's supported skills directory.

Recording settings stay fixed while Start is pending. Take, Release and Finish
wait for fresh computer state before enabling the next action. If that metadata
read exceeds eight seconds, the console shows the computer as unavailable and
retries; inspect the recovered state before continuing. This does not extend the
runtime's control lease or change its execution deadlines.

## Worked example: teach a project note

This uses only the offline practice page in the agent's Linux guest. It needs
no external account, Internet or new permissions. It is the same class of form
task covered by [client acceptance](CLIENT-VALIDATION.md); the values below are
illustrative. They are not an additional measured benchmark.

### 1. Demonstrate once

Start/open the selected PC and verify the intended computer/workspace. In
**Screen**, take control and choose **Practice task**. In **Teach & skills**,
start a recording named `Save a project note`, with goal `Save the supplied
project and next step and verify them after reload`. Enable guest video if you
want the agent to analyze visual evidence.

Return to the live guest. Enter `Garden plan` in **Project name** and
`Choose three plants for the balcony.` in **Next step**, then click **Save note**.
Inspect the saved card. Choose **Finish demonstration** and wait until saving
completes. Select that saved workflow in Skills. If recording started before
opening the page, navigation may also appear in its trace.

The trace records selectors such as `#project`, `#note` and `#save-note`, with
generated `input_N` parameters for typed values. The specific parameter numbers
depend on captured actions; use the actual names shown by this recording.
The trace does not retain the demonstration text. The optional video can show it.
Browser form saving also needs a click/submit; a fill by itself is not completion.

### 2. Ask the agent to understand it

Play/review the saved clip, choose **Allow agent analysis**, then **Copy analysis
request**. Send the copied request to your existing image-capable work agent.
It contains the selected workflow's real ID; do not substitute an ID from
another computer. The operator skill directs the agent to verify identity and
read the workflow before analysis.

The expected tool sequence is:

1. `computer_info` and `workflow_get` on the owning computer.
2. `workflow_analyze` with the selected workflow ID. Inspect the trace and PNGs;
   request additional `atSeconds` samples when a transition is missing.
3. `workflow_propose` with the returned analysis `sourceRevision` as
   `expectedRevision`, a parameterized `procedure`, observable `expectedResult`
   and explicit `uncertainties`.

The agent should describe how to fill and verify a new note, including missing
steps and failure cases. It must not save another note while analyzing. Sampling
can miss clicks or text, so a plausible narrative alone is insufficient evidence.
It should not retain `Garden plan` as the input for every future run.

For a client with MCP prompt support, an already connected SDK client can obtain
the same kind of request:

```js
// workflowId is the selected saved workflow's UUID on this connection.
const request = await client.getPrompt({
  name: 'analyze-demonstration',
  arguments: { id: workflowId },
});
```

Retrieving this prompt returns messages for the harness; it neither analyzes the
video nor calls the tools. Forward/use those messages in the agent's normal
conversation. Console copying remains the fallback for clients without prompts.

### 3. Correct and publish the method

Choose **Refresh saved skill** / **Review updated proposal**. Check that the
proposed method includes these operations, with this recording's actual input
parameters:

1. Open the local practice page in the guest and inspect a fresh browser snapshot.
2. Fill `#project` and `#note` using this run's supplied values.
3. Click `#save-note` once.
4. Inspect `#result-project` and `#result-note` for exact current values.
5. Reload, inspect again and report whether the same values remain.

Define the expected result as both supplied values being visible after reload.
This practice page keeps one latest note in its guest browser storage; this
example authorizes replacing that practice note, not appending a history or
changing unrelated files/sites. Remove secrets and incorrect assumptions before
**Confirm review**. An agent cannot perform that owner-only approval.

In **Inputs for future runs**, review the agent's proposed input definitions or
choose **Customize task inputs**. For this form, `project_name` and `next_step`
can describe the values more clearly than captured `input_N` names; update the
procedure to use the same names. Add/remove inputs with their descriptions, then
save the review. Definitions contain no values/defaults, and are not compiled
into a script. Without customization, older skills keep their captured inputs.

### 4. Reuse with different inputs

In **Try with new inputs**, supply `Workshop plan` and `List the tools needed
for Saturday.` in the parameters corresponding to the two fields. If you
customized them, those are `project_name` and `next_step`. Start with
**Prepare a plan first** if you want to inspect the intended steps. A plan must
not acquire control or change the practice note.

For an actual attempt, choose **Do the reviewed task**, inspect/copy the request
and send it to the work agent. Release human control first. The agent checks the
pinned identity and review, acquires control, awaits another successful exact
ready/reviewed revision check, then fills/saves/verifies using the new values.
It releases its own control on completion/failure. If the owner edits the review
in between, prepare a fresh request rather than silently using another revision.

### 5. Check what happened

Independently inspect the guest's saved card after reload. It should show
`Workshop plan` and `List the tools needed for Saturday.`, with no old demo text.
Ask the agent to report the workflow ID/revision, actual observed result and any
uncertainty. Activity supplies separate tool/session metadata; it is not a task
verdict. If a submission or response is ambiguous, inspect before repeating it.

Exporting `SKILL.md` packages the reviewed instructions for future discovery. It
does not contain a recording player, embedded model or proof of this run's
success. Keep the same computer/workspace/review checks for later uses.

## Saved states and recovery

| What you see                          | What to do                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Recording / Saving                    | Finish and await the saved result; exporting is unavailable.                                                                                |
| Completed demonstration, not reviewed | Inspect its trace/video. Review the trace directly or send an authorized analysis request.                                                  |
| Frame access allowed, no proposal     | Send the request to the connected work agent and inspect its response/tool activity. Refresh the saved skill; consent alone creates no job. |
| Pending proposal                      | Correct and confirm the current proposal, or discard it. An earlier review does not override a pending draft.                               |
| Reviewed                              | Prepare a new plan/run or export. Verify a real execution separately.                                                                       |
| Changed revision / stale request      | Refresh, inspect and prepare a fresh request/export for the intended saved review.                                                          |
| Interrupted recording                 | Inspect partial evidence and make a new completed demonstration before export/reuse.                                                        |
| No video / text-only agent            | Review captured steps manually. Video-only demonstrations need a proposal before review; unsupported evidence may require teaching again.   |

No automatic retry, scheduling or analysis queue is created by these states.
For tool access/lease/limit recovery, see [the operator contract](TOOLS-AND-SKILLS.md).

## Use a reviewed skill

On a compact screen, choose a task from the searchable library to open its
detail. **Back to skills** preserves the search, focuses that card, pauses video
and clears prepared trial inputs. Returning to the same unchanged revision keeps
your unsaved review fields. Selecting another task, selecting a changed revision
or **Refresh saved skill** loads saved data instead. Unsaved review changes still
block preparing/exporting instructions; navigation never saves them implicitly.

The teaching guide highlights Demonstrate, Understand, Review or Try new inputs
from the current recording, selected skill and open review. Its next action opens
the relevant existing control. Frame consent and copied requests do not start an
analysis job; a connected vision agent must submit the proposal. Structured trace
review can proceed manually. A zero-step video without a proposal cannot yet be
reviewed; the guide directs the owner to video analysis or a new demonstration.

**Reviewed** describes saved instructions. Trying with new inputs defaults to
planning and prepares a request; it does not record task success or launch an
agent. Task verification remains with the agent and owner inspecting actual
results. The operational Activity history contains tool outcomes separately.

An approved video-only procedure remains editable after its proposal is accepted
or its video is deleted. Saving edits creates a new reviewed revision. Save review
changes before using, copying or exporting; those actions use the persisted review,
not unsaved form text.

The request tells the agent to check `computer_info` against both IDs and fetch
`workflow_get`. It must require `status: ready`, `reviewed: true` and the exact
saved revision. A changed skill, pending proposal or wrong computer needs a fresh
review/request. The owner endpoint checks again before copy; a change detected
while Skills is open clears the prepared request. Unsaved edits must be saved
before preparing it. The server returns instructions, not an execution runner.
Consent changes also update the workflow revision. Prepare a fresh request after
revoking frame access rather than reusing a request pinned before revocation.
Pin the workflow's top-level `revision`. An accepted proposal's
`review.sourceRevision` is provenance for the analyzed source, so it can differ
from the current published revision; owner review creates a new revision.

Exported `SKILL.md` files carry the same computer/workspace and exact revision
pins. They require fetching the current saved workflow, including after a wait
or reconnect, rather than falling back to the embedded procedure if it changes
or becomes unavailable. Export again after changes; older downloads need a
fresh version-5 export for reviewed task-input definitions. After acquiring control, await another successful
ready/reviewed/exact-revision `workflow_get` check before any mutation, including
navigation. Never run that check in parallel with an action. General MCP action tools do not bind effects to that
reviewed revision, so these checks remain agent instructions.

Input names/descriptions use the owner's published `review.parameters` when
present. Up to 16 definitions have unique lowercase names (1–64 characters,
letters/digits/underscores, starting with a letter) and descriptions of 1–300
characters. The owner can edit an agent's proposed list before confirming it,
explicitly publish no named inputs, or return to captured action inputs.
Draft definitions never replace the current review automatically. A change
creates a new revision and invalidates previous requests/exports.

Older reviews fall back to captured steps, including command cwd, file content
and guest window focus. A higher-level procedure can now ask for a CSV path and
report destination rather than the raw demonstrated terminal command; the agent
still derives only actions authorized by the reviewed procedure and new request.
The protocol stores no executable binding or permission grant in a definition.
Other values may still be missing. Blank fields mean ask for a value, not an instruction to
write an empty value. Inputs are limited to 2,048 characters each and 16,384 in
total; larger inputs need a separate authorized handoff. Values are literal JSON
data in the copied request. They stay in the open owner form, are never sent to
the preparation endpoint or persisted in Teach/Activity, and clear on close,
leaving Skills, refreshing the skill, authorization loss or page unload. The
**Back to skills** action also closes the trial and clears its values. The
clipboard and any harness you send the request to receive the copied values;
keep credentials and secrets out.

The MCP prompt `taught-workflow` accepts `id`, optional `expectedRevision` and
`intent` (`plan` or `execute`). Existing ID-only use remains valid and defaults
to planning. Read access can plan, but requesting execute is rejected. A hidden
pending draft is represented by `reviewed: false`, including when a prior owner
review still exists. Rebuild older guests/bridges before using this contract.

For execution, the agent acquires control for mutations, stays within the user's
requested task, verifies the saved expected result with actual evidence and
releases control on completion/failure. Preparing/copying is recorded as
**Prepared a skill request**; it does not prove that a task ran or succeeded.
There is no automatic replay, model invocation or new permission grant.
After acquisition, the operator skill requires another workflow read whose
ready/reviewed/exact-revision response completes before the first mutation,
including navigation. It must not run the read in parallel with an action.
This remains agent guidance, not an atomic runtime lock on workflow revisions.

The MCP prompt `analyze-demonstration` supplies the analysis request. The tools
return regular MCP text/PNG images rather than an invented WebM content block.
Each call samples up to three 640×400 frames (512 KiB each). Default samples
cover the start/middle/end of the encoded frame estimate; `atSeconds` requests
more specific samples. Sampling can miss rapid actions and cannot establish that
all video was understood. A compatible image-capable agent must do the reasoning;
a text-only harness can still use the trace and owner-reviewed skills.

Full WebM remains owner-only. **Revoke frame access** blocks subsequent reads,
cancels extraction and hides pending drafts from work readers; it cannot recall
material already received. Read-only MCP never receives pending drafts or analysis
tools. **Delete video** requires an explicit confirmation, frees that clip and
preserves the workflow/skill; pending generated text is not automatically erased.
Owner review publishes the approved procedure to connected agents.

A recording does not train a model or create new execution abilities. The MVP
executes Chromium/browser, terminal, contained files and bounded Linux guest
mouse/keyboard input through `desktop_action`. Video can show other guest windows;
proposals must mark uncertain targets/keys and verify fresh native coordinates and
focus before reuse. There is no automatic blind replay. See [desktop](DESKTOP.md).
Interrupted recordings cannot export until a new completed demonstration; an
interrupted clip may be incomplete. Rebuild selected guests after updating source.

Primary prompt contracts: [official MCP TypeScript SDK v2](https://ts.sdk.modelcontextprotocol.io/v2/servers/prompts)
and [MCP user-controlled prompts](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/server/prompts.mdx).
