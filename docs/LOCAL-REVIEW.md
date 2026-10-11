# Review this workspace locally

The implementation worktree has an ignored, independent review catalog at
`.computer-mcp/review-catalog`. This is local QA state, not state distributed by
the repository. Run the following from this checkout:

```sh
node src/cli.js list --root .computer-mcp/review-catalog
node src/cli.js start --root .computer-mcp/review-catalog --open
node src/cli.js config --root .computer-mcp/review-catalog --client codex
```

The saved review default is **review-mvp**, with its owner console on
`http://127.0.0.1:17670`. `start --open` is the supported authorization flow;
the bare URL does not authorize an owner. The guest stays running for review.

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
