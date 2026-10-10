# Validation record

Private MVP review on 10 October 2026. Results describe paths actually exercised,
not support inferred from portable JavaScript or CI configuration.

## Environment and scope

- Host: macOS ARM64, Node 24.1.0.
- Guest: Debian Linux ARM64, Docker Desktop Linux engine 29.4.3, Chromium through
  pinned Playwright 1.64.0, visible Xvfb/Openbox desktop.
- Every Docker operation used explicit `--context desktop-linux`. The default
  context remained `ser9`; no operation targeted that remote daemon.
- Two new owned UUID projects/volumes were used, with loopback console ports
  17670 (internet) and 17671 (isolated). No Piblo containers, profiles or volumes
  were reused. Reference worktrees were read-only.

## Checks

| Command/path                                                   | Result                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------- |
| `npm ci`                                                       | Dependencies installed from the committed lockfile               |
| `npm run format:check`                                         | Passed                                                           |
| `npm run lint`                                                 | Passed                                                           |
| `npm run build`                                                | Syntax checks and actual noVNC ESM bundle passed                 |
| `npm test`                                                     | 7 backend/security contract tests passed on macOS                |
| `npm audit --omit=dev`                                         | 0 known production dependency vulnerabilities reported           |
| `setup`, `doctor`, `start`, `status`, `open`, `config`, `stop` | Local CLI paths exercised; macOS browser opener returned success |
| `npm run test:integration -- <internet-owned-state>`           | Passed against the running guest                                 |
| `npm run test:integration -- <offline-owned-state>`            | Passed through the offline console relay                         |

The corrected owned offline `stop` → `start` passed. Authenticated reads verified
the same workspace UUID, exact file contents, saved workflow and browser-profile
files; the old lease was cleared. A read of the persisted guest browser's local
storage also verified that the saved task value survived the restart.

The real integration smoke checks both legacy and modern official SDK stdio
connections, 13 tools, resource/prompt discovery, pinned computer/workspace
identity, API auth/Host/Origin boundaries, separate read authority, and rejection
of human-session creation with an agent credential. Owner tickets are consumed
once; absent/replayed tickets are rejected. Malformed JSON returns 400.

It exercises an exclusive lease across clients, UID-1000 shell execution, private
root control/environment isolation, deadlines, bounded output, cancellation,
stdio-close release and human takeover that prevents a delayed command effect.
It writes/reads guest files, rejects traversal/symlinks, acts on the visible
browser, validates a real PNG screenshot, saves Teach events, reads them through
MCP/prompt and follows parameterized steps to create a new note. Authenticated
VNC view/control are checked through real RFB handshakes; appearance is reviewed
separately.

## Manual UI and network review

Using the T3 collaborative browser, reviewed Desktop, Files, Terminal and Teach
at 1280 CSS pixels and the responsive console at 390 × 844. Checked keyboard
focus, no horizontal overflow, file save/read and a traversal rejection, terminal
output/exit status, take/release state and a live 1280 × 800 noVNC screen. Native
canvas clicks/keypresses completed the guest form; saving a manual teaching task
produced five reusable steps with omitted input values. Saved workflows remained
visible after runtime recreation. No generated UI appearance/E2E test harness
was added.

The final protected UI also showed the unauthenticated owner-access state, then
an authenticated live screen and human takeover. A disposable loopback helper
consumed a CLI-owner ticket and installed the HttpOnly cookie for the isolated
preview profile without printing credentials; it closed after that review.
The actual macOS `open` command was exercised separately. The helper is not part
of the product.

Internet mode reached public TCP `1.1.1.1:443` and loaded `https://example.com`
(`Example Domain`) in the real guest browser. The isolated guest rejected that
public TCP connection while its authenticated console/MCP remained reachable.
This is a negative egress probe plus Docker internal-network configuration, not
a claim of a portable firewall denying every host gateway/private endpoint.

## Issues found and corrected during validation

- The noVNC npm CommonJS build failed on top-level await. The official pinned
  v1.6.0 ESM tag archive builds and runs; its license remains served locally.
- A root-created browser profile prevented unprivileged Chromium startup.
  Entrypoint ownership and a UID-1000 launch wrapper corrected that boundary.
- Docker Desktop did not publish ports for an internal-only guest network.
  Offline mode now uses a bounded, credential-free fixed TCP relay; the guest
  remains on its internal network. Both modes passed the real MCP smoke.
- A stopped Xvfb left display locks in the container filesystem. `/tmp` is now a
  bounded tmpfs so restart cannot retain them; persistent data stays in the owned
  volume.
- Broad loopback UI bootstrap would have allowed a guest process to impersonate
  a human. Separate owner credentials and single-use tickets now enforce that
  protocol boundary, with per-computer cookies and guest-side rejection tests.
- The initially selected `ws` patch had an audit finding; the pinned version was
  updated to 8.22.0 and the production dependency audit returned zero findings.

A Chromium restore-pages notification can appear after an unclean shutdown;
there is no automatic replay of those tabs. Upstream noVNC can emit a VideoFrame
initialization/cleanup diagnostic; authenticated streaming and native input
worked during review. These are known polish items, not hidden passed tests.

## Pending validation and limits

The CI matrix targets Node 22 on Ubuntu, macOS and Windows for install, format,
lint, build and portable core tests. The POSIX command test and symlink-specific
assertions are skipped on Windows; the actual Linux guest exercises them.
CI status is reported on the PR separately. A green core job is not a Windows
or Linux Docker lifecycle/desktop validation.

Windows/Linux host lifecycle, AMD64 guest operation, Claude Code/Cursor/Codex UI
registration, native host control, macOS/Windows isolated guests, VM/remote
adapters, hostile-code isolation and public packaging/license review remain
pending. The first image build downloads desktop/browser dependencies; this is
not a zero-download native executable. See [SECURITY.md](../SECURITY.md) for
sandbox, network, process-tree and disk-quota limits.
