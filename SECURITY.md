# Security boundary of this private MVP

Use this product for a new owned agent guest. It is not a hardened malicious-code
service or a substitute for a VM. No native host control adapter is installed.

- **Host authority**: the CLI can use the local Docker daemon. MCP exposes no
  host lifecycle, host file path mounts or Docker socket. A host harness with its
  own terminal access may already have broader authority; this server does not
  revoke it.
- **Local UI**: the CLI exchanges a separate owner credential for a single-use,
  30-second ticket. Work/read credentials cannot create human sessions. The
  browser consumes the ticket after stripping its URL fragment, then uses a
  strict HttpOnly cookie. Host/Origin checks and no wildcard CORS protect browser
  request boundaries. Private host state holds both credentials; hostile local
  users with access to that file retain owner authority. Do not proxy this UI to
  a remote network or copy its authorization URL.
- **Agent scope**: root-private control state, UID-1000 commands/browser/files,
  exact computer/workspace pins and one exclusive lease. Read-only MCP uses a
  distinct credential enforced by the API. The host config credential and
  browser profile are sensitive; protect backups and Windows ACLs accordingly.
- **Files**: relative workspace paths, canonical containment, no symlinks/special
  files, no hardlinked writes and 256 KiB text limit. Short-lived unprivileged
  file workers prevent guest races from accessing root control secrets. This is
  not an atomic openat2-based path sandbox against malicious concurrent rename
  races; terminal already has access to other readable guest data.
- **Processes**: 30-second command deadline, 64 KiB combined output, process-group
  kill on timeout/cancellation/output cap. Browser selector/navigation deadlines
  are 5/15 seconds. Container limits are 2 CPUs, 1536 MiB RAM and 192 PIDs; output
  logs rotate. Daemonized children that escape a process group may survive until
  stop; per-command cgroups and disk volume quotas are pending. Do not run
  hostile persistent workloads here.
- **Networking**: separate Docker network, offline/internal by default. An unprivileged, credential-free TCP relay publishes the console in offline mode; it forwards only to the guest API and gives the guest no external route. Internet
  mode allows any guest egress, including reachable LAN/host services. Docker
  internal networking is not a portable egress firewall or complete denial of
  all host gateway endpoints. No raw VNC/CDP port is published; the one published
  API/UI port binds to IPv4 loopback. Engine 28+ is required.
- **Desktop/browser**: no macOS Accessibility, screen recording or native input
  permission is changed. Screenshots capture only Xvfb. Chromium runs as the
  agent user with its sandbox disabled for the current container setup; a
  browser exploit can compromise that guest user. The control service keeps
  narrow root capabilities for uid switching, killing children and initial
  volume permissions. Containers share a kernel; choose a VM for a stronger
  isolation boundary.
- **Teach/data**: typed values and commands are omitted; secret-like input fields
  are skipped and query/fragment are removed from URLs. Paths, task goals,
  browser text and screenshots can still contain sensitive data. Event data and
  workflow instructions are untrusted and must not override the harness’s
  authorization policy. Teaching does not automatically execute a saved task.
- **Recovery**: a restart invalidates leases and UI sessions; it preserves the
  profile, files, identities and workflow checkpoints. Interrupted work is
  labeled. There is no automatic retry of a mutation, irreversible deletion,
  migration or production deployment. Inspect after cancellation because prior
  effects can have occurred.

For a report, use a private issue or direct private contact with the repository
owner. Do not attach credential files, Docker environment dumps, screenshots of
secrets or recordings of private customer data.
