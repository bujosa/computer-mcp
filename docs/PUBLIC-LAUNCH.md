# Public source acceptance — 27 October 2026

The owner explicitly selected publication of the **complete repository and
history**, integrating the reviewed stack. GitHub is public; code and generic
operator use MIT, with separate Sendtry brand terms. This is a developer source
preview. No npm package, MCP Registry entry, prebuilt image, GitHub Release or
production deployment was published. The npm manifest retains `private: true`.

## Integration evidence

Merge commits preserved ancestry and author metadata. Each PR was retargeted to
`main` only after its parent landed. The actual merged tree matched its locally
validated preview tree; exact head commits were checked at merge time. No force
push, protected-branch push, admin bypass or branch deletion was used.

| PR  | Integrated head | Merge commit | Local tests |
| --- | --------------- | ------------ | ----------- |
| #9  | `cad7a8f`       | `70de479`    | 90 passed   |
| #10 | `6c86927`       | `b3c89ed`    | 94 passed   |
| #12 | `c2cfab6`       | `704e6a0`    | 133 passed  |
| #13 | `68eca5a`       | `4d90ad5`    | 147 passed  |
| #14 | `e613eea`       | `7a6bc6e`    | 156 passed  |

Every stage passed format, lint, build and the package inventory. The final
stage also passed `check:skill`; all tools have structured output contracts.
Current-head GitGuardian checks passed. `main` retained PR #11's bounded browser
observations and the compatibility fix preserving safe link URLs through MCP.

The first #9 source preview produced 89 pass / 1 fail: the same date-dependent
audit fixture already corrected in #14. The reviewed correction was applied
at the first stack level as `cad7a8f`, preserving runtime retention and history.
All later merge gates passed. The original hosted Actions failures were jobs
GitHub never started due to a billing restriction. They remain historical
failures; CI stays disabled at the owner's request.

Final dependency audit reported zero known advisories. Before visibility changed,
gitleaks reported 83 commits scanned (about 14.69 MB), including available refs,
with no findings. Repository issue/PR bodies and comments were also scanned with
no findings. These checks are bounded detection, not security certification.

## Anonymous installation

Acceptance source: `7a6bc6ea586fac2cd43b2e4272c98153ffad0a3e` on public `main`.
The publication documentation follow-up changes no runtime or operator assets.
Host: macOS ARM64, Node 24.1.0. Own ignored QA directories contained spaces and
non-ASCII characters. No normal harness profile, owner catalog or global Git/npm
configuration was changed.

Executed without provided credentials or inherited GitHub/npm authentication:

- Anonymous public metadata and historical initial-commit access returned 200.
- A new shallow HTTPS clone succeeded with Git credential helpers/extra headers
  disabled and no prompting. It used the public default branch.
- Fresh `npm ci` succeeded with distinct empty temporary user/global npm configs.
  The initial isolation probe pointed both config types at `/dev/null`, which
  npm rejected as a duplicate config load; correcting the probe resolved it.
- The cloned CLI printed v0.1.0 and the exact canonical operator v10.
- `skills@1.7.4 add bujosa/computer-mcp --skill sendtry-computer --agent codex
claude-code cursor --copy --yes` installed from the public repository into a
  fresh project, with installation telemetry disabled. The three canonical
  assets matched in `.agents/skills` (Codex/Cursor) and `.claude/skills` (Claude).
  No global install was used. This proves installer acceptance, not model loading
  or an additional Claude/Codex/Cursor inference trial.

## Actual MCP after public installation

Both existing **review-owned** QA PCs were rebuilt from the published source,
retaining their computer/workspace identities and dedicated volumes. Only the
explicit local `desktop-linux` Docker context was used; both console ports stayed
loopback-only. Unrelated computers, SER9, profiles and Docker defaults were preserved.

The anonymously cloned source then ran `scripts/assignments-integration.mjs`
against those two explicitly selected idle Linux ARM64 guests. It passed actual
named read/work stdio, 9/20-tool discovery and structured/text parity, independent
computer/grant identity, busy readiness, assignment/attempt binding, report versus
owner verification, cancellation/revocation, exact workflow review pinning,
legacy-disable behavior and audit privacy. New test grants were revoked during
cleanup. Both PCs were left ready, idle and legacy-disabled.

The preceding [public-preview review](PUBLIC-PREVIEW-REVIEW.md) records actual
WebM/Teach/native-input/takeover acceptance and the manual desktop/compact review.
This publication run adds anonymous installation and fresh named execution;
it does not claim another full cold lifecycle, fresh Windows/Linux host trial,
paid-model evaluation or arbitrary-task reliability benchmark.

## Reporting and current limits

GitHub private vulnerability reporting, secret scanning and push protection are
enabled. The private-reporting status was verified through the unauthenticated
public API. The security-report entry returned 302 to GitHub sign-in. No test
report or independent external-account submission was performed; no response SLA
is asserted. Use [the security policy](../SECURITY.md), not public issues.

The current computer is an owned Docker **Linux guest**, not an isolated native
macOS/Windows desktop or hostile-code VM. Teach supplies evidence and reviewed
instructions; the external harness supplies inference, and the owner verifies
results. Backup/restore/uninstall, versioned package/update distribution, wider
IDE/host onboarding and a measured reliability pilot remain work. npm is an
optional distribution path, not a protocol requirement; see
[installation and package-release gates](PUBLICATION.md).
