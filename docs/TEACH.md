# Teach a task, understand it, reuse it

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

Exported `SKILL.md` files carry the same computer/workspace and exact revision
pins. They require fetching the current saved workflow, including after a wait
or reconnect, rather than falling back to the embedded procedure if it changes
or becomes unavailable. Export again after changes; older downloads need a
fresh version-3 export. General MCP action tools do not bind effects to that
reviewed revision, so these checks remain agent instructions.

Input names/descriptions come from captured steps, including command cwd, file
content and guest window focus. Other values may still be missing from the
reviewed procedure. Blank fields mean ask for a value, not an instruction to
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
