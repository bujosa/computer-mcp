# Screen-first design direction

12 October 2026. David requested a cleaner, friendlier console and a design
opinion from **Claude Opus 5.5, xhigh**. The read-only advisor inspected the
`c6e1129` UI, product/design/readiness documents and three real desktop/compact
captures. Its recommendation was a screen-first work surface with fewer layers,
grouped navigation, persistent control and clearer task actions. This is expert
design advice, not a user study or accessibility certification.

## Delivered first slice

The Sendtry identity stays in the mark, restrained coral actions and warm neutral
surfaces. The console now starts with the actual job:

- **Screen** opens directly on the guest. **Computers** names the catalog, so a
  screen and a collection of computers have distinct labels.
- Navigation groups **Workspace**, **Tools** and **Setup & history**. A compact
  menu exposes every view without a clipped horizontal strip. Escape closes it;
  choosing a view closes it and focuses its heading.
- One sticky session bar shows the authorized computer, connection and control.
  Free control offers Take control; an occupied lease offers Take over; own
  control offers Release. Buttons retain existing authority/busy guards. Keyboard
  focus follows the replacement control. The name and actions disappear on 401.
- The same bar holds recording/Finish and live notices. Release stays unavailable
  during a demonstration; Finish is the visible save action. A successful desktop
  connection removes the redundant canvas status overlay.
- Titles name their views. Marketing headings, the sidebar selector card and
  repeated brand statements are removed. Desktop entry points become compact
  Teach/connect shortcuts.
- Teach setup shows its recording form, then returns to the retained library.
  Saved instructions/review precede expandable demonstration evidence;
  uncertainties remain visible. Review and trial actions use a quieter hierarchy.
- Connect retains three explicit, manually navigated stages. Short stage labels
  have complete accessible names. Client/access selection appears before the
  repeated explanation; reopening instructions live with the computer catalog.
- Text formerly below 11 px is enlarged, fields/buttons use 13 px and muted text
  is darker. A skip link and measured sticky-header offset protect keyboard focus.

The implementation uses the existing DOM, runtime data and actions. No model
runner, dashboard, new API, schema, adapter, permission grant or automatic client
installation is introduced. A copied request, approved procedure or online PC
still does not establish agent connection or verified task success.

## Evidence and remaining work

Manual review exercised the real owned local Linux guest at 1280×800 and 390×844,
then restored the normal browser size. Screen content starts at approximately
139 px instead of the earlier 331 px at the measured desktop layout. The compact
agent selector starts at approximately 343 px instead of about 695 px in the
earlier capture. These are layout observations, not installation-speed metrics.
The advisor's tighter 120/300 px targets are not fully reached in this slice.

Review covered free/owner/API-work control, takeover, keyboard focus, menu/Escape,
client/read configuration, setup stages, reviewed-skill trial preparation and
parameter cleanup, unsaved-review error visibility, an actual one-step trace
recording/Finish, file save/readback, terminal `pwd`, Activity, catalog and owner
access recovery. Visible text checked on compact Connect had an 11 px minimum;
this is not a whole-application WCAG audit. The recording used no video/inference.

Files/Terminal beside the screen, better parameter labels, deeper notice
deduplication and measured user testing remain follow-ups. Compact Skills
list-to-detail navigation is delivered in the brand-polish follow-up below.
Horizontal guest letterboxing remains: the Linux desktop's
fixed native geometry is preserved. Named-harness installation and additional
host/guest OS claims still require their own validation.

See [product behavior](PRODUCT.md) and [exact validation](VALIDATION.md). Private
advisor output and real captures remain in ignored
`artifacts/design-direction-20261012/`; no customer recordings or credentials
are distributed. Publication/code/Sendtry brand licensing remains pending.

## Brand polish before the authorized private merge

David subsequently requested a more polished design and explicitly authorized
merging the feature PR. This permits a private source merge, not public release
or a license/visibility change. The product stays focused on an agent-owned
computer, shared control and reusable reviewed skills.

Read-only inspection confirmed the current Sendtry app/frontend use decorative
coral `#d06a54`, warm canvas `#f6f1ed` and the same loop mark. The console's quieter
`#f8f7f5` canvas and white panels adapt that identity to a work surface. Open source
does not dictate a palette. Brand provenance and pending redistribution terms
remain in [asset notes](../ui/assets/README.md) and [reuse](REUSE.md).

The follow-up adds a distinct Computers icon, restrained selected edges, neutral
preview/review badges, subtle panel boundaries and neutral disabled controls.
Compact Take/Release targets are 44 px high. Skills uses library → detail with
Back to skills; search/card focus and local review edits survive returning to
the same unchanged revision. Trial inputs clear and video pauses on return;
changed revisions still load current saved data. Desktop keeps the split layout.

Manual review found Finish could lose keyboard focus when the guide rendered
before the updated recording state. The completion handler now refreshes state
before restoring focus. A new real trace demonstration saved successfully;
Review manually received focus and Enter moved to Procedure for the agent.
This is observed ordinary completion, not delayed-response fault injection.

Actual compact review showed the search near 240 CSS px, no horizontal overflow,
search/empty results, pressed selection and retained review fields. Plan remains
default; a temporary trial value disappeared on return. No review write, video
analysis, new model account or permission grant was performed. See
[validation](VALIDATION.md) for final gates and image/source evidence. Private
captures live under `artifacts/brand-polish-20261012/`.
