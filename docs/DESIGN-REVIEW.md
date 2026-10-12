# Sendtry Computer: design review and next slices

The [12 October screen-first direction](DESIGN-DIRECTION.md) is now implemented
as a first slice following David's new request and Opus 5.5 xhigh advice.
It supersedes the earlier control disclosure, sidebar selector card and marketing
headers. The original observations below remain historical evidence.

11 October 2026. Product source reviewed: `e4a04f3`. This document records
observations and proposed work. The implementation follow-up below identifies
the delivered slice; task records, installers and Skills over MCP remain proposals.

Implementation follow-up: the first slice now adds the Teach progress/next-action
guide, direct finish/save, expandable evidence, Reviewed/trial wording, three
selectable connection stages, accurate Activity identity copy and a current-PC
link. The findings below retain the original review context. Task-result records,
automatic skill discovery and installers are still proposals.

12 October closure: contextual control now uses a native disclosure on setup,
history and catalog views, and remains open on mutation surfaces/during own
control or recording. Unauthorized access presents one focused recovery panel
and discards responses belonging to the previous owner session. Current desktop,
390px/keyboard and real owner-session invalidation/recovery received manual
review; the delayed-response race received static review, not a manual fault
injection. A read-only pre-creation/owned-capacity doctor also shipped. See
[current product behavior](PRODUCT.md) and [validation](VALIDATION.md).

## Evidence and limits

Reviewed actual desktop/compact captures of Connect agent, Skills, Activity and
Terminal from the preceding manual Mac mini acceptance. Those captures match
the recorded backend/UI hashes in [validation](VALIDATION.md), not a generated
demo. Private evidence remains in ignored `artifacts/connection-polish-ui/` and
`artifacts/product-recovery-ui/`.

This review also opened the existing local console in T3 at 1280×800 without an
owner ticket and observed the authorization-required state. That local runtime
is the older image on the full Docker engine; it is not a fresh exercise of the
latest runtime. No computer was started/rebuilt, control taken, recording made,
credential copied, OS permission changed or shared resource cleaned. Current
source and prior matching captures support the other observations. This is an
expert inspection, not usability research, a WCAG certification or a benchmark.

## What should be retained

The warm Sendtry canvas, restrained salmon actions, ink typography, consistent
icons and white surfaces form a coherent identity. The real guest screen is
honest about which desktop is being operated. Files, terminal and audit contain
real results rather than decorative charts. Focus/recovery, compact wrapping,
recording visibility and unsaved-review protection already received real checks.

Keep that language. The largest remaining improvement is guidance through work,
especially Teach; a new palette or a heavier UI framework would not resolve it.
Keep the brand boundary described in [product](PRODUCT.md): Sendtry Computer is
its own product/runtime under Sendtry, with no delivery-service dependency.

## Findings

Priorities are proposed implementation order, not measured severity scores.

| Priority | Observed surface                                                                                                        | User consequence                                                                                             | Proposed change and acceptance                                                                                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0       | Connect displays a sizeable configuration block before the first-task verification further down.                        | Copying looks like the finish line; skill installation and verification can be missed.                       | Keep the three steps but expose one recommended next action. Reveal exact config when needed. Only show connection/verification from observed sessions/results; never infer it from copying.                                                           |
| P0       | Teach spans record, save, analysis consent, copied agent request, proposal check, review and reuse.                     | The owner must infer which step is next and whether an agent is actually doing anything.                     | Add a state-derived progress rail: Demonstrate → Analyze or review manually → Review → Try with new inputs. Explicitly label waiting for a connected agent. No fabricated progress.                                                                    |
| P0       | Reviewed skill shows “Ready to use”; Activity shows completed tool operations.                                          | Approved instructions can be mistaken for a proven successful task.                                          | Preserve review readiness, then add a separate trial/result concept only after its backend contract exists. “Reviewed”, “Attempted”, “Owner verified” and “Not verified” have different evidence.                                                      |
| P1       | Take control/Release appears globally, including Connect and Activity.                                                  | A strong unrelated action competes with the actual next step.                                                | Keep controller/authority visible; emphasize takeover on the live PC and mutation surfaces. Retain access to takeover elsewhere through a compact secondary control. Test owner/agent/busy/recording states manually.                                  |
| P1       | Skills has a long form, trace section and several actions. The genuine video-only fixture shows “0 captured steps”.     | Evidence count can be confused with the procedure being empty; long names and identifiers consume attention. | Summarize capture evidence separately from reviewed instructions. Use a readable user task title and put technical IDs in details. The long fixture title was supplied QA data, not automatic production naming. Keep video-deletion/editing recovery. |
| P1       | Sidebar PC card looks like a selector but is informational; switching is performed by owner CLI commands.               | A new user may expect clicking it to redirect the live connection.                                           | Explain “Current computer” and link to Your computers. Show default versus this connection separately. Preserve pinned agent identity; changing a default must never retarget live work.                                                               |
| P1       | Authorization-required page shows a status notice, another recovery panel, disabled controls and a large empty desktop. | The recovery job competes with unavailable content; the exact PC name is unavailable before authentication.  | Use one recovery surface explaining why and the exact supported CLI pattern. Never expose private catalog metadata before owner authentication. Keep diagnostic detail expandable.                                                                     |
| P1       | Activity title says “Know who worked”, while its details correctly explain declared clients.                            | The headline implies verified human/model identity more strongly than the data supports.                     | Proposed copy: “Review sessions. See what happened.” Show declared client/session/access/timezone clearly. Keep time holding control separate from cumulative tool duration and task success.                                                          |
| P1       | Compact captures have contained content, but branding/nav/heading/control consume much of the first viewport.           | Useful task controls and results arrive late on a small screen.                                              | Treat compact as monitoring/review first. Reduce repeated explanatory chrome; keep recording/cancel/next action reachable without hiding recovery. Verify at 390px with keyboard and touch-sized controls.                                             |
| P2       | Skills arrive through manual download/install or a copied pinned request.                                               | Harness discovery remains an extra adoption step.                                                            | Evaluate the official optional Skills over MCP extension after checking SDK/client support. Keep file export and prompts as fallback; no auto-install, auto-activation or permission grant.                                                            |

The progress/next-action rail was delivered in the follow-up described above.
Task outcomes remain proposed functionality; current screens do not have them.

## Recommended first design slice

Improve the existing Teach flow before adding another product dashboard:

1. The library explains the task benefit, with **Teach a task** as its primary
   empty-state action. An existing practice example remains explicitly a demo.
2. Recording keeps one visible **Finish demonstration** action that returns to
   the captured evidence. Explain video/trace limits before capture, not after.
3. Saved evidence offers **Review manually** or **Prepare agent analysis** after
   consent. Preparing a request says that the owner must send it to a connected
   agent; waiting is not “analyzing”.
4. Review leads with the procedure and expected result; video/trace support the
   decision. Draft uncertainties and required parameters remain visible.
5. A reviewed skill offers **Try with new inputs** using the existing pinned
   handoff. Until there is a task-result contract, describe it as preparation,
   keep “Reviewed” separate and direct the owner to inspect the result.

This can initially reuse existing Teach state and prompts; do not add a hosted
model runner or start work from a copied request. Review desktop/compact,
keyboard, read/work authority, pending drafts, revoked analysis, deleted video,
interrupted capture, unsaved edits and owner takeover. Presentation uses manual
visual validation; changes to contracts retain real backend/protocol tests.

## Proposed execution/evaluation boundary

A later bounded task record could link attempt ID, computer/workspace, exact
review revision, declared agent session, start/end, interruption and verifier
outcome. Separate “agent reported success” from owner or explicit synthetic
assertion verification. An attempt must not falsely attribute unrelated session
operations or imply that general tools enforce a revision per effect.

The runtime would own identity/revision validation and persistence; the console
would display evidence and owner review; the existing harness would still plan
and act through MCP. Model selection, billing, chat, schedules and cloud gateways
remain outside this repository's scope. Activity's payload-free operational
contract stays separate. Any task-result schema needs retention, authorization,
crash/idempotency behavior and migration design before implementation.

## Release and learning order

| Slice                 | Deliverable                                                                           | Evidence required before calling it done                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| First                 | State-derived Teach guidance, contextual actions and accurate identity/readiness copy | Manual real desktop/compact review and affected static gates; tests only for any changed backend contracts                                      |
| Next                  | Clean installation and named harness/skill connection                                 | Actual fresh installs on supported hosts/harness versions, resource footprint, first verified task and actionable disk/network failure recovery |
| Then                  | Repeated taught-task trials and narrow result provenance                              | Matched baseline with fresh values/varied state, honest verified/unverified/interrupted outcomes and private retention boundaries               |
| After evidence        | Optional Skills over MCP discovery and additional adapters                            | Official extension conformance, actual supported-client loading/approval and adapter-specific isolation/lifecycle tests                         |
| Before public release | Packaging, license/notices/brand rules, contribution and security process             | Explicit release decisions and clean supported-platform checks; no publication is authorized by this review                                     |

Current local Docker capacity and hosted CI billing restrictions are unresolved
environment blockers. A roadmap does not clear them or certify unsupported
hosts/guests. Do not optimize for a millions-of-users claim before activation,
reuse and ownership are measured with willing pilot users.

See [market review](MARKET.md) for source-backed competition, initial audience,
pricing signals and a proposed private pilot/evaluation.
