# Review this workspace locally

Latest follow-up: **14 October UTC**, with exact Cursor MCP approval guidance,
`node src/cli.js skill`, actual three-client project skill loading, six new-input
repetitions, three deliberate timeouts and graceful Claude disconnect cleanup.
Earlier advanced reports/Teach/takeover and the newer 16-tool integration passed;
see [validation](VALIDATION.md), [client acceptance](CLIENT-VALIDATION.md) and
[tasks](TASKS.md). The current owned review image is
`sha256:dee61d8529e0a82cbd1099c0bcc3b575565019378e19ec2b1ca1bd9367794366`.
It includes the guarded noVNC feature-probe cleanup and retains the same pins/data.
Desktop/390px guide, keyboard access, live screen and Take control/Release were
manually reviewed. Doctor at 04:24:21 UTC measured 10% guest use,
155,891,904,512 bytes available and returned `ok`.

The Mac mini independently passed 81 tests and real SDK read/work acceptance of
host CLI commit `210df79f`, in a new exact source archive. Its existing QA guests
remained running/idle with older images; no lifecycle update was made remotely.
The noVNC/UI/docs follow-up is local-only evidence. Prior source/image/capacity
observations below are historical, not claims about the latest image.

On 13 October UTC the owned `review-mvp` was rebuilt with the preceding runtime and
screen-first UI and left running, idle with no control lease or active Teach
recording. The rebuild reused unchanged dependency layers and retained
computer/workspace UUIDs, its
private volume, skills and history. Fresh real MCP integration and manual owner
control/Teach checks passed on this image:
`sha256:617f4534086dbe345bb5745a7adfd772ab2da388c9d2e817bcbd59ec1ac42629`.
The latest correction prevents old metadata responses from replacing Take/Finish
results and fixes pending recording settings. A new video demonstration produced
a model-proposed, owner-reviewed procedure that succeeded with new supplied
values after a real page reload. The earlier `f4c3c08` image belongs to the
12 October brand review; Mac mini's earlier snapshot was not updated by these
local UI slices. Real Claude Code and Codex CLI runs also passed work/read/busy
paths, analyzed separate private video demonstrations and reused their own
owner-reviewed proposals. The served operator is version 7, clarifying
post-acquisition revision-check ordering. See [harness validation](HARNESS-VALIDATION.md).

The earlier physical ENOSPC failure remains in [the validation record](VALIDATION.md).
At 03:14 UTC on 13 October, available guest capacity was below 1 GB. A later
read-only doctor at 04:57 UTC measured 66,333,708,288 bytes available and 62% use;
it returned `ok`. Host APFS free space is a separate measurement. Inspect current
capacity before larger writes, recordings or builds; a successful cached rebuild
does not establish cold-build capacity. No Docker
pruning, volume deletion or unrelated cleanup was performed.

The implementation worktree has an ignored, independent review catalog at
`.computer-mcp/review-catalog`. This is local QA state, not state distributed by
the repository. Run the following from this checkout:

```sh
node src/cli.js list --root .computer-mcp/review-catalog
node src/cli.js doctor --root .computer-mcp/review-catalog
node src/cli.js open --root .computer-mcp/review-catalog
node src/cli.js start --root .computer-mcp/review-catalog --open
node src/cli.js config --root .computer-mcp/review-catalog --client codex
```

The saved review default is **review-mvp**, computer
`a70f163f-1e9a-4604-b62b-cce24ddf4be0`, workspace
`6af2848e-2c28-4d84-826e-7e7111bf1ec8`, with its owner console on
`http://127.0.0.1:17670`. `open` or `start --open` is the supported authorization flow;
the bare URL does not authorize an owner. The guest stays running for review, idle with frame sharing revoked. The saved
video example includes a reviewed proposed practice procedure; its new supplied
values were executed and verified through real MCP. See [Teach](TEACH.md).

All three owned review guests received the earlier security/lifecycle fixes.
The running review-mvp additionally has the current Teach/video/analysis, Activity,
guided setup/Teach, sticky session control, compact navigation, authorization recovery and bounded guest desktop-input runtime;
rebuild the other stopped guests before using these new capabilities. Their private work/owner credentials were rotated without changing their
UUIDs or data volumes. Reconnect any existing MCP bridge and use `open` again;
previous owner sessions are invalid. Configuration output still contains only
the same state paths, never credentials.

Open **Activity** to review retained sessions, control/tool time, outcomes and
owner-only JSON exports. It contains local QA operations; no earlier activity is
reconstructed. See [the audit contract](ACTIVITY.md) for attribution, privacy and
retention limits. The latest owned review rebuild preserved its computer,
workspace, saved skills and private history.

The latest **Native desktop input contract** skill retains native click positions
and supplied text/key parameters. Its demonstration covers a native Linux window
and Chromium, including navigation/close and a later owner edit. Desktop input
was also used with new values to save a practice note. Input delivery is verified
separately from task success; scaled screens/frames need fresh native coordinates
and focus checks. See [the desktop contract](DESKTOP.md).

The running review-mvp also includes **Use with agent**. Open a reviewed skill
and prepare its pinned plan/task request with fresh supplied parameters. Copy
requires the current saved review; new drafts and unsaved edits block use. Inputs
clear when you close or leave Skills. Actual file reuse was verified through
MCP, and the console was reviewed at desktop and 390px layouts. See [Teach](TEACH.md).

| Registered computer | Port  | Network                | Handoff state            |
| ------------------- | ----- | ---------------------- | ------------------------ |
| `review-mvp`        | 17670 | Explicit internet mode | Running; default         |
| `offline-review`    | 17671 | Isolated               | Stopped; volume retained |
| `catalog-sandbox`   | 17672 | Isolated               | Stopped; volume retained |

To use another owned review computer:

```sh
node src/cli.js start --name catalog-sandbox --root .computer-mcp/review-catalog --open
node src/cli.js use catalog-sandbox --root .computer-mcp/review-catalog
node src/cli.js config --root .computer-mcp/review-catalog
node src/cli.js stop --name catalog-sandbox --root .computer-mcp/review-catalog
node src/cli.js use review-mvp --root .computer-mcp/review-catalog
```

The real two-computer backend/MCP contract check requires both named guests
running and idle:

```sh
npm run test:catalog-integration -- .computer-mcp/review-catalog review-mvp catalog-sandbox
```

It checks separate identities, leases and files, default selection, pinned stdio,
idempotent start and owner-only catalog metadata. It writes uniquely named QA
files to those selected guests, releases control and restores the prior default.
It does not take over a busy computer or delete data. Stop the sandbox afterwards
if you do not need it running.

Every guest uses its saved local `desktop-linux` context and its own UUID project
and volume. The Docker default remains `ser9`; do not change it. These commands
never target the user's remote machine or Piblo QA containers.

For a new clone/computer, follow [setup](SETUP.md) and `init`; this ignored catalog
will not exist there. No global MCP settings, skill folders or desktop permissions
were changed by this review.

## Independent Mac mini review computers

The authorized Mac mini at `bujosa@10.0.0.14` also retains two independent owned
QA PCs running and idle after the 12 October checks. They are separate from this
Mac's catalog/default; their credentials and private state remain on that host.
Current scoped source, 73 contracts and one real read/work SDK acceptance passed.
The isolated PC preserved its reviewed video-derived procedure and exact prior
trial result. See [the validation record](VALIDATION.md) for snapshot boundaries.

| Mac mini computer | Loopback console               | Network  | Handoff state |
| ----------------- | ------------------------------ | -------- | ------------- |
| `qa-offline`      | `http://127.0.0.1:17671` there | Isolated | Running; idle |
| `qa-internet`     | `http://127.0.0.1:17670` there | Internet | Running; idle |

These URLs refer to the Mac mini when used on that host. No public listener or
new remote adapter was created. An alternate local-port SSH forward does not
meet the console's exact Host/Origin contract. The current local review console
above is the available owner UI on David's current Mac. Running the CLI on the
Mac mini remains host-local Docker control; it does not provide a macOS guest.
