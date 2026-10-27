# Learning a method and using it with new inputs

The user job is: **show my agent how I work, review the method it understood,
then give that method new data on the same owned computer**. The agent chooses
and calls tools; Computer MCP supplies the guest, evidence and enforced access.
Learning here means creating reviewed instructions, not changing model weights.

## The units stay distinct

| Unit               | Owner                                     | Lifetime and purpose                                                                                        |
| ------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Computer/workspace | Trusted CLI owner                         | Persistent guest, files/profile and identity; a connection cannot silently switch PCs.                      |
| Demonstration      | Teaching owner                            | Stable workflow ID, goal, trace and optional private video. Evidence can omit actions.                      |
| Proposal           | Connected work agent after consent        | Draft procedure, uncertainties, expected result and optional input definitions. Cannot approve itself.      |
| Reviewed skill     | Human owner                               | Published procedure/inputs with a new revision; export pins the owning computer/workspace/revision.         |
| Task request       | User and chosen harness                   | Plan or execution for current inputs. Copying does not launch inference or create a queue job.              |
| Observed outcome   | Executing agent plus independent reviewer | Files/page evidence and failure/unknown state. Product Activity is tool metadata, not a task-level verdict. |

## Why task inputs need their own contract

The initial real-client proposals exposed a usability problem. The action trace
intentionally omits terminal commands/text, so its inputs look like `input_2`
(command) and `input_3` (field value). Claude proposed meaningful CSV/output/title
aliases in prose; those aliases did not become actual trial fields. Codex kept
the raw captured parameters. Both could describe the method, but the owner had
to bridge the names and actions manually.

The implemented extension lets an agent propose:

```json
{
  "parameters": [
    {
      "name": "csv_path",
      "description": "Current CSV in the guest workspace."
    },
    {
      "name": "report_path",
      "description": "New JSON report path; never overwrite."
    },
    {
      "name": "project_name",
      "description": "Title for the saved project note."
    }
  ]
}
```

These definitions ask for task data. The reviewed procedure explains how to
inspect the source, invoke the installed reporting program, verify current
totals and derive the note text. A user need not supply a raw shell command or
copy demonstration totals. Values are still untrusted data; the agent must quote
literal arguments and remain inside the authorized scope. The server does not
compile/interpolate the definitions into commands.

## Publish inputs with the procedure

`workflow_propose` optionally accepts at most 16 unique input names and
descriptions. Names start with a lowercase letter, contain lowercase letters,
digits/underscores and are at most 64 characters; descriptions are 1–300
characters. Unknown fields, values, defaults, duplicate/reserved names and
oversized lists are rejected. The runtime repeats validation. Input definitions
can themselves contain mistaken or sensitive prose, so owner review remains
necessary.

The owner sees **Inputs for future runs** beside the procedure and success
criterion. Agent-proposed rows are editable; the owner can add/remove them or
return to the captured-action fallback. Unsaved edits block use/export. The
responsive editor stacks fields when the review column is narrow, rather than
letting controls spill outside it. Values for a trial appear in a separate form.

Approval requires the exact workflow revision and draft ID. It publishes
`review.parameters` atomically with the procedure and advances the revision.
Draft input definitions do not replace published inputs before approval.
Omitted definitions preserve existing proposed/reviewed definitions. Owner
`parameters: null` resets to captured inputs; `[]` explicitly publishes no named
inputs. Legacy records remain usable without a data migration.

The same published names/descriptions feed trial packets and version-5 exports.
Ordinary values stay in the open trial form/copied request, not in these
definitions or Activity. A changed review needs a new request/export. The
operator skill is version 8; earlier operators/exports need updating to explain
the new input model. Old clients can omit the optional definitions.

## How the agent should operate

1. Load the actual operator and task skill bodies. A model's statement alone
   does not prove discovery; inspect the loader result.
2. Read `computer_info` and `workflow_get`. Require the intended computer and
   workspace, ready/reviewed state and exact published revision.
3. Obtain missing current inputs; distinguish supplied data from values derived
   from new results. A plan uses read tools and acquires no control.
4. For a requested execution, acquire a free lease and await another successful
   exact-revision check before any mutation. No parallel action with that check.
5. Use the narrowest supported tools. In the reporting example: inspect files,
   run the guest program, read/reconcile the JSON, inspect current browser
   selectors, fill derived results, save once, reload and inspect the saved card.
6. On failure/ambiguous effects, inspect before any retry and never present an
   older artifact as current. Release only the lease this session acquired.
7. Report observed results, workflow/revision, evidence and uncertainty.

A task can use terminal/browser/files together. A screenshot helps verify UI
state but does not replace checking report values. A verified method can be used
by another compatible harness on its owning computer; cross-PC sharing still
requires an explicit future import/rebinding design.

## Review is substantive

The 17 October drafts correctly separated visual evidence from source-file
inference, but required owner corrections. The video did not reveal the terminal
invocation or demonstrate reload persistence. One draft called CSV record numbers
physical line numbers; quoted multiline records make that wrong. Another
included analysis-only wording in the reusable success criterion. Owner review
clarified these points and added explicit reload/failure checks before export.
See the actual [evaluation and limitations](LEARNING-EVALUATION.md).

## Intentional boundaries and next decisions

There is no hidden model runner, automatic video-to-task dispatch, routine
scheduler or cloud agent account. An adapter that dispatches to a harness would
need explicit model/session identity, owner consent, cancellation, deduplicated
attempts and result attribution; none is inferred from a prompt retrieval.

Runtime credentials, identity, leases and execution/media/file limits are
enforced. General action tools do not atomically bind effects to a workflow
review, and a workflow revision does not pin external pages or mutable referenced
programs. Current-source inspection and scope/outcome checks remain agent
instructions. A future stricter execution contract would need explicit reviewed
artifact provenance and per-attempt verification; Activity timing cannot supply it.

Broader pilots should evaluate missing inputs, changing forms/programs,
partial results, real owner interruptions and fresh client installations. The
bounded synthetic reporting tasks establish working paths, not a measured
success rate across applications or millions of users.
