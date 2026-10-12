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
  Desktop helpers start with a cleared environment before dropping privileges;
  agent commands cannot read work/owner credentials from same-UID process
  environments. Private preview guests built before this fix require rebuilding
  and rotation of their local work/owner credentials before reuse. All three
  owned review computers were updated and rotated during this validation;
  reconnect their MCP clients and run `open` for a new owner session.
- **Files**: relative workspace paths, canonical containment, no symlinks/special
  files, no hardlinked writes and 256 KiB text limit. Short-lived unprivileged
  file workers prevent guest races from accessing root control secrets. This is
  not an atomic openat2-based path sandbox against malicious concurrent rename
  races; terminal already has access to other readable guest data.
  Writes stage/sync complete content before replacing the destination. Capacity
  failures preserve the destination; handled failures remove their staging file.
  A killed worker may leave a private staging file in the workspace. Replacement
  changes the inode and preserves ordinary permission bits, not arbitrary ACLs or
  xattrs. Directory power-loss durability and disk quotas remain outside this
  guarantee. A lost response can still follow a completed write; inspect it.
- **Processes**: 30-second command deadline, 64 KiB combined output, process-group
  kill on timeout/cancellation/output cap. Browser selector/navigation deadlines
  are 5/15 seconds. Container limits are 2 CPUs, 1536 MiB RAM and 192 PIDs; output
  logs rotate. Daemonized children that escape a process group may survive until
  stop; per-command cgroups and disk volume quotas are pending. Do not run
  hostile persistent workloads here.
  An HTTP disconnect aborts its active mutation independently of the separate,
  session-scoped cancellation request. Cancellation does not undo prior effects.
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
  Guest mouse/keyboard input requires work access and the lease, with fixed
  1280×800 bounds, strict key names, single-line stdin text and unprivileged
  fixed executables. Input deadlines/cancellation are followed by bounded held-key
  cleanup. Cleanup failure revokes control and blocks new API work until a guest
  restart. Delivered input can have partial or external effects; inspect before
  retrying. No host display, raw command/window selection or clipboard bridge
  is introduced.
- **Teach/data**: the action trace omits typed values, file contents and commands;
  password/secret-like fills are skipped and URL query/fragment are removed.
  Terminal working directories, outcomes, selectors, paths and goals remain
  recorded and can be sensitive. Trace/procedures/page content are untrusted.
  Teach does not automatically execute a saved task.
- **Video/analysis**: recording is explicit opt-in, silent Xvfb capture of the
  owned Linux guest, never the host screen. Raw WebM is root-private (0600 in
  0700 storage), owner-session-only over HTTP, with a five-minute deadline,
  20 MiB clip cap and 200 MiB aggregate quota. The encoder runs UID1000 with a
  clean environment; root writes its bounded output. Video can show secrets
  skipped by the trace, including terminal input/output and arbitrary windows.
  Review before sharing. Owner consent is per saved workflow; work agents may
  then receive up to three 640×400 PNG samples per call (512 KiB each, eight
  seconds per decoder). A separate UID1001 decoder receives the private media
  through stdin, not a root filename/credential. Only one extraction runs per
  computer. Revoke/delete cancels extraction and revision/consent are rechecked
  before images return. Existing recipients cannot be made to forget content.
  Your harness and configured model provider can receive visible frame data;
  this server adds no inference service, uploads, training or secret redaction.
- **Draft/review**: agent proposals are bounded text, never executable approval.
  Stale revisions fail within serialized storage updates. Raw video remains
  owner-only; read credentials and work readers after revoke do not receive
  pending video-derived drafts. The owner reviews the exact current draft,
  edits/parameterizes it and defines success before export. Review publishes
  the approved text to connected read/work agents. New proposals preserve prior
  owner edits but disable export until reviewed or discarded. Video deletion
  is explicit and retains instructions. No automatic mutation retry occurs.
- **Recovery**: a restart invalidates leases and UI sessions; it preserves the
  profile, files, identities and workflow checkpoints. Interrupted work is
  labeled. There is no automatic retry of a mutation, irreversible deletion,
  migration or production deployment. Inspect after cancellation because prior
  effects can have occurred.
  The server owns graceful browser shutdown and flushes the profile on normal
  stop. A forced kill, host crash or exhausted Docker stop deadline can still
  lose unflushed writes. A closed browser can be reopened only through a leased
  navigation without a stale page ID; read tools do not relaunch it.

For a report, use a private issue or direct private contact with the repository
owner. Do not attach credential files, Docker environment dumps, screenshots of
secrets or recordings of private customer data.
