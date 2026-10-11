# Teach a task, understand it, reuse it

1. Start/open your selected computer. Take control in the owner console.
2. In **Skills**, choose **Teach a skill**, name the outcome and optionally include
   guest video. Keep credentials/customer data out of the demonstration.
3. Demonstrate in the live guest, Files or Terminal. The action trace omits typed
   values/commands/content and preserves parameters, cwd and command outcomes.
   Video records the visible guest screen, including values the trace omits.
4. Return using **Review & save**, then stop recording. Play the saved video and
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
7. Choose **Check for proposal** / **Review updated proposal**. Correct the full
   procedure and success criterion, then **Confirm review**. A stale revision
   fails; refresh and review the current proposal. **Discard proposal** preserves
   prior owner-approved edits. Video-free trace review works directly too.
8. Export `SKILL.md` to the displayed folder name in your harness's supported
   skills directory. Ask the agent to use it with your supplied parameters. It
   verifies the owning computer, acquires control for mutations, executes within
   your requested scope and checks the reviewed expected result.

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
executes Chromium/browser, terminal and contained-file operations. Video can show
other desktop windows, but generic mouse/keyboard desktop replay is pending;
those actions must remain explicit uncertainties or be adapted to supported tools.
Interrupted recordings cannot export until a new completed demonstration; an
interrupted clip may be incomplete. Rebuild selected guests after updating source.
