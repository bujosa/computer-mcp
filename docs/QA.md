# Reproduce the private MVP checks

## Manual validation and CI policy

On 17 October 2026 UTC, David requested disabling CI/CD while evaluating real
agent behavior. The repository's only Actions workflow, `Check`, was disabled
through GitHub and verified as `disabled_manually`. This change also replaces
push/PR triggers with `workflow_dispatch`; it does not delete the checks.
No package, container or production publishing pipeline is enabled.

Local validation remains required by risk. Code changes use format/lint/build
and affected contract tests; a real harness evaluation additionally records
client/model versions, task inputs, evidence, observed effects and independent
result verification. Do not equate an agent's final answer or a zero CLI exit
with a successful task. UI presentation is reviewed manually.

To inspect the current hosted state without starting jobs:

```sh
gh workflow list --repo bujosa/computer-mcp --all --json name,state
```

Future reactivation is a separate owner action: enable `check.yml` in GitHub
and explicitly dispatch it once the intended workflow revision is on the
default branch. Automatic push/PR triggers remain absent in this change.
Older billing-blocked runs remain historical failures, not passing validation.

## Local contract and integration checks

Use a source checkout, Node 22.13+ and Docker Engine 28+ with a local Linux
container engine. Install with `npm ci`, then run:

```sh
npm run format:check
npm run lint
npm run build
npm test
npm run test:e2e -- --context desktop-linux
```

On a Linux host, supply the name of its validated **local** context explicitly
(often `default`). The runner refuses SSH/TCP Docker endpoints and Windows
container engines. It does not change the default context or install global
agent settings. Portable core tests do not prove Docker lifecycle or native
desktop support on another platform.

## What the real end-to-end runner owns

`scripts/e2e.mjs` creates a fresh private `artifacts/e2e-*` directory and catalog.
It creates two new UUID computers: one with explicit internet access and one
isolated/offline. Each has its own volume, network and image tags. Console ports
are published on loopback only. No existing computer or profile is adopted.

The runner exercises real CLI commands and official SDK stdio MCP clients:

- Empty catalog, strict options, creation without implicit startup, duplicate
  names, default selection, registration, status, doctor and pinned configurations.
- Work/read authorization, Host/Origin checks, owner tickets and metadata,
  computer/workspace identity, independent leases and files across computers.
- UID-1000 commands, private desktop-helper environments, contained files,
  output/deadline limits, cancellation, HTTP disconnect and human takeover.
- Visible guest browser actions, a real PNG, Teach recording/export, resource
  and prompt discovery, missing parameters and subsequent procedure execution.
- Real optional WebM capture, ffprobe decode, range/download, private media/UID
  access, final input without blur, cwd/outcomes/content parameters, consent,
  MCP PNG/proposal/prompt delivery, stale drafts/read-scope privacy, owner review,
  explicit clip deletion and Teach after Chromium closes.
- Stop/start with the same computer/workspace/files/workflow and saved browser
  note, a new boot UUID, no old lease, and browser recovery after closing it.
- Owner-only activity, scoped read/work identity, modern/legacy MCP labels,
  terminal failures/timeouts, takeover cancellation, payload exclusion and the
  exact retained operation after a real guest restart.
- Native X11 click/key/type/wheel input on the existing xev diagnostic window,
  read/lease denial, takeover cancellation, omitted text/key Teach parameters,
  owner-reviewed export and native typing with actual saved Chromium app state.
- Positive public HTTPS access in internet mode and blocked outbound connection
  in isolated mode. Internet-mode failure can also indicate unavailable DNS/TLS
  or the external fixture; it remains a reported failure for investigation.

`report.json` records environment, source fingerprint/commit, phase timings and
cleanup results without credentials. Screenshots and skills are retained beside
the report. The runner stops **only** its newly owned guests in `finally`, even
on failure; containers, private volumes, networks and image tags are retained.
It checks that the default context and
unrelated container identities/running states match its initial snapshot.
An interruption such as SIGKILL may require manually inspecting and stopping
only the UUIDs recorded in that catalog. It never prunes or deletes resources.
On a shared host, a foreign actor's addition, removal or state change also makes
this comparison fail. Keep that result and investigate separately; the runner
cannot attribute the change and should not silently waive it.

Repeated retained QA projects can exhaust Docker's automatic subnet pool or
consume disk space. Treat a network-allocation error as a failed run; do not
change the daemon, prune globally or delete another project's resources to hide
it. Manual cleanup must first verify this run's exact UUID ownership, stopped
guests and empty network endpoints. Preserve volumes by default; deletion of
task-owned QA volumes requires explicit scope. Cleanup outside the runner is
recorded separately in the validation evidence. The
[Windows/Linux QA record](HOST-VALIDATION.md) includes an explicitly authorized
complete teardown with baseline comparisons and directory-absence checks.

Artifacts are gitignored and may include demonstrated content or local private
state. Do not commit or publicly share the artifact directory.

## Focused Teach integration

For an idle, explicitly owned QA computer whose browser is on `/demo`:

```sh
npm run test:teach-integration -- /absolute/private/qa/state /private/artifacts
```

The backend/MCP script creates new private teaching fixtures, checks actual media
and approval/privacy contracts, and deletes only its own new clip. It closes and
reopens that QA guest's Chromium as a regression check. It issues an owner cookie
in memory without printing it; do not target a personal/shared active computer.
Its fixed test proposal checks the protocol, not a model's interpretation quality.
Manual vision review is separate. Generated media/frames/skills remain private.

## Manual product review

Use an idle computer owned by the review, `start --open`, and the local owner
console. Review desktop streaming/input, Files save/read, Terminal execution,
Teach start/stop, optional video play/download, consent/revoke, proposal correction/discard, review gate and skill/config downloads, work/read setup,
computer/default commands, Activity range/session filters, paging and JSON
export, keyboard focus and compact layouts. Save a practice
note and reload to verify the displayed saved result. Release control afterwards.
UI appearance and interaction are reviewed manually; there is no generated UI
appearance, navigation or E2E test harness.

## Running on a Mac mini through SSH

Use a known, trusted SSH destination and retain strict host-key checking. The
hostname/IP and SSH user must be supplied; do not guess other machines, forward
private keys, disable trust checks or put credentials in command arguments.

Inspect macOS/CPU, Node and Docker contexts first. Use a **new** directory on
that machine, transfer only source (for example `git archive HEAD`) or clone the
private repository through existing authorized access, and run the commands
above in that directory. No global package installs, Docker Desktop restarts,
native accessibility/screen permissions or unrelated resource changes are part
of QA. Keep the new catalog's artifacts private on that host.

SSH is the tester's transport to execute the CLI on the Mac mini. The implemented
computer adapter still uses that host's local Docker daemon. This validates a
macOS CLI host with Linux guests; it does not validate an isolated macOS guest
or implement the future remote-computer adapter.
