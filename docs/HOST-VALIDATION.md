# Windows and Linux host acceptance

Executed 14 October 2026 UTC, in newly owned temporary QA directories. Source
and package remain private/UNLICENSED. No release, deployment, native host
control or global Docker-context change was performed.

## Exact source and environments

QA transferred a `git archive` of `cfacff047016593a4bb3ea2531660298e0197306`:
97 tracked files, verified byte-for-byte. Eight source/test overlays added the
media/file-worker budgets, source-path diagnostics and deterministic concurrent
write fixture in this change. Both final lifecycle reports have the same tracked
source fingerprint:
`dd548a9f8dd2cd08528b3e95740dd8af397fbf98f7e6e0595c288a7644d60687`.
Documentation edits made afterwards were not part of that snapshot. The temporary
archives had synthetic Git metadata for the runner; their reported Git HEADs
are not product commits. No history, local environment, credentials, customer
content or existing computer state was transferred.

| Boundary     | Native Windows host                                                               | Native Linux host                                                          |
| ------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Host         | Windows 11 Pro, 10.0.26200, x64                                                   | NVIDIA Jetson AGX Thor, Ubuntu 24.04.4 LTS, kernel 6.8.12-tegra, ARM64     |
| Host Node    | 22.23.3, native Windows executable                                                | 22.23.3, Linux ARM64 executable                                            |
| Docker       | Desktop 4.69.0, Engine 29.4.0 Linux AMD64, Compose 5.1.1, Buildx 0.33.0-desktop.1 | Engine 28.2.2 Linux ARM64, temporary Compose 5.6.0, existing Buildx 0.21.3 |
| CLI context  | Private-config `desktop-linux`, local Windows named pipe                          | Private-config `default`, local Unix socket                                |
| Actual guest | Linux AMD64 container                                                             | Linux ARM64 container                                                      |
| Source path  | ASCII with spaces                                                                 | ASCII with spaces                                                          |

SSH only transported the tests. The Windows CLI did not run in WSL; Docker's
Linux guest engine uses WSL2. The Linux CLI ran on Thor. Jetson Nano received
read-only preflight only: its SSH user lacked Docker-socket permission. We did
not elevate privileges or change its groups, tools or services.

Node archives and the temporary Linux Compose binary matched their official
release SHA256 checksums before execution. Node, Compose, npm caches, Docker
configuration, temporary files and a separately named Docker-container Buildx
builder stayed inside the owned QA scope. No global installation or credential
store was changed. Anonymous public Docker Hub pulls in the private Windows QA
configuration avoided the interactive credential-helper limitation over SSH;
private-registry authentication was not exercised.

## Commands and results

Both hosts ran `npm ci`, `npm run format:check`, `npm run lint`,
`npm run build` and `npm test`. The final overlay reran format/lint/build/tests
without reinstalling unchanged dependencies. Build checked 54 modules and bundles.

| Check                                                                | Windows                                                                       | Linux Thor                                      |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------- |
| Format, lint, build                                                  | Passed                                                                        | Passed                                          |
| Native contracts                                                     | 84 total: 81 passed, 3 skipped, 0 failed                                      | 84/84 passed, no skips                          |
| `node scripts/e2e.mjs --context desktop-linux` / `--context default` | 17/17 functional phases passed; **overall failed** on preservation comparison | 17/17 phases and preservation comparison passed |
| Default-context check                                                | Passed                                                                        | Passed                                          |
| Final explicitly scoped teardown                                     | Passed; original resource baseline retained                                   | Passed; exact resource baseline restored        |

Windows skips cover POSIX read-only file permissions, the guest's POSIX terminal
executor and isolated Python/X11 cleanup environment. These are not Windows
native desktop implementations. Their Linux guest paths were exercised by the
real lifecycle suites; skips are retained in the native test log.

The lifecycle checks include real modern/legacy stdio MCP, scoped authority and
identity, independent leases/files on two computers, catalog/default/pinned
connections, owner-only audit with timings and payload exclusion, browser/PNG,
file/terminal limits, optional desktop WebM, decoded analysis frames, consent and
proposal/review boundaries, new-input skill reuse, native **guest** X11 input,
human takeover, internet/offline policy, persistent restart and browser recovery.
There was no generated UI appearance/E2E harness and no named model CLI evaluation
on these hosts. Earlier model/manual UI evidence remains separate.

Windows report `e2e-JQ9OOM` retains its failed result: a foreign container present
at the runner's start disappeared before its final snapshot. All 17 product
phases passed and both owned guests stopped. This comparison cannot attribute
the disappearance; it was not relaxed, retried to hide it or relabeled as a clean
E2E pass. All original pre-QA containers and their states remained at teardown.
Thor report `e2e-DwOcpI` passed completely. Sum of measured phase times was
183.966 seconds on Windows and 104.767 seconds on Thor, using warm builder caches;
these are not cold-install, model-latency or general performance benchmarks.

## Failures found and resulting changes

- **Non-ASCII build checkout:** both hosts initially failed in BuildKit's
  `x-docker-expose-session-sharedkey` transport header. ASCII paths with spaces
  worked. Doctor now warns about the source path without exposing it; the known
  build error gives recovery instructions using the same explicit state. An
  actual Unicode-source diagnostic probe passed on both hosts without creating
  state. Building from Unicode source paths remains a known limitation.
- **Windows registry helper over SSH:** the first public-image pull failed with
  a Windows logon-session error. Only the disposable QA config used anonymous
  public pulls. Existing registry credentials/configuration remained untouched.
- **FFmpeg thread exhaustion:** on the AMD64 guest, the old decoder failed on a
  real saved WebM with `Resource temporarily unavailable` and a PID-limit hit.
  The same clip produced a valid PNG with one input, filter and output thread.
  Capture and extraction now use those explicit limits; UID, time, output,
  frame and media bounds remain intact.
- **File-worker failure:** a later Windows lifecycle attempt failed with the
  opaque `File worker failed` error. Its exact cause was not established. Node
  file helpers now bound V8/libuv pools to one each, and the guest PID/thread
  ceiling is 256 rather than 192, retaining 2 CPUs and 1536 MiB memory. The final
  two-host functional suites passed with these budgets; this does not prove
  arbitrary concurrent Chromium workloads fit.
- **Concurrent-write fixture:** one Windows contract run missed a same-size
  filesystem metadata change. The fixture now changes the size deterministically,
  retaining the conflict/preservation check without sleeps, retries or a skip.
  This does not establish detection of content changes with identical metadata.
- **Subnet pool:** retained owned fixtures plus unrelated concurrent projects
  exhausted Windows Docker's automatic subnet pool in an intermediate attempt.
  Only previously owned QA resources were inspected and removed before continuing.
  No daemon setting, foreign resource or global prune was used. Capacity remains
  an installation/runtime prerequisite.

## Complete temporary-resource teardown

The user explicitly authorized removal of this QA's leftovers. Fresh read-only
preflight verified the run marker, exact computer UUIDs, owner labels, mounts,
loopback ports, network endpoints, image tags and separately owned builder/cache.
Only these resources were stopped and removed. The QA root was checked again
against the completed cleanup report, removed, and verified absent on both hosts.

Thor returned to exactly 8 containers, 3 networks, 3 volumes and 6 image rows;
every baseline identity/state matched. Windows retained all original 98
containers, 27 networks, 112 volumes and 214 image rows. Concurrent unrelated
projects added 8 containers, 1 network, 4 volumes and 5 image rows; these were
preserved, yielding 106/28/116/219. The temporary foreign container involved in
the runner failure was not in the original baseline. Global contexts remained
Windows `desktop-linux` and Thor `default`. No owned guest, volume, image tag,
builder/cache, copied tool, npm cache or QA directory was retained on either host.
Normal OS/SSH logs were not erased.

Private logs, hashes, failed/successful reports and cleanup/absence evidence are
retained locally under ignored `artifacts/host-qa-20261014/`; they are not a public
artifact bundle. Hosted CI billing, broader Linux/x64 distributions, persistent
IDE setup, non-ASCII Docker builds, native control, Windows/macOS guests and
VM/remote adapters remain outside this acceptance.
