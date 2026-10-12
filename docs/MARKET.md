# Sendtry Computer: market and positioning review

Reviewed 11 October 2026; expanded GitHub snapshot at 02:09 UTC on 12 October
(still 11 October in America/New_York). This is a desk review of primary sources, not customer
research, a total-addressable-market estimate or independent competitor testing.
Vendor performance/compliance claims are not evidence for this product. Prices
and repository status are dated observations and must be checked again before
making a purchasing or release decision.

## Product judgment

Sendtry Computer has a credible developer-preview use case, but an owned desktop,
MCP integration, human takeover and demonstration capture already have close
alternatives. Its strongest positioning hypothesis is the complete loop:
**give your existing agent a dedicated PC → demonstrate a task → review the
procedure → reuse it with new inputs → inspect the result**.

That hypothesis is not yet a demonstrated competitive advantage. The runtime,
independent operator acceptance and one complete video/trace → reasoned proposal
→ owner review → new-input taught task are exercised. Exact saved values survived
document reload and guest restart. Video understanding across models, repeated
taught-task success and customer demand are not established. See
[validation](VALIDATION.md) and the [product gaps/release gates](READINESS.md).

Suggested external explanation:

> Sendtry Computer gives your agent a dedicated computer. Show it a task, review
> the instructions and reuse them while keeping control of the same screen.

Keep **Sendtry Computer** as the product and `computer-mcp` as the technical
repository/CLI. Explain MCP in integration documentation. The current guest is
Linux; do not imply isolated macOS/Windows guests or compatibility with every
agent. Local storage does not mean that approved frames sent through a remote
model harness remain on the user's machine.

## Competitive landscape

These are adjacent choices for users, not interchangeable implementations.
Missing features below are not claims that competitors lack those features.

| Alternative                                                                                                                                                        | Primary-source observation                                                                                                       | Implication for Sendtry                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Cua](https://github.com/trycua/cua)                                                                                                                               | Spaces offers shared agent desktops and local macOS VMs; Driver exposes native desktop tools through MCP on macOS/Windows/Linux. | Closest strategic overlap. PC ownership, human sharing and MCP are established propositions. Native permissions, VM isolation and container isolation need separate support claims. |
| [E2B Desktop](https://github.com/e2b-dev/desktop)                                                                                                                  | Linux desktop sandbox with SDK, streaming, input, files and commands.                                                            | Competes for developers who want managed computer infrastructure. A future adapter can be evaluated without importing a cloud backend into this repo.                               |
| [Bytebot](https://github.com/bytebot-ai/bytebot), [desktop-only setup](https://docs.bytebot.ai/quickstart)                                                         | Containerized Linux desktop, persistent environment, takeover and MCP. The repository is archived as of 7 March 2026.            | Direct historical precedent. Archive status is a maintenance consideration, not evidence of why it happened or that the concept failed.                                             |
| [Browser Use](https://github.com/browser-use/browser-use)                                                                                                          | Local/cloud browser agents plus a CLI/operator-skill installation path.                                                          | A browser solution is a credible substitute; compare the owner's complete task, including files, rather than tool count.                                                            |
| [Playwright MCP](https://github.com/microsoft/playwright-mcp), [CLI](https://github.com/microsoft/playwright-cli)                                                  | Browser tools/profiles; the maintainers also recommend evaluating CLI + Skills for coding-agent context efficiency.              | MCP alone is not differentiation. Measure schema/snapshot/frame overhead before adding another transport or claiming lightweight execution.                                         |
| [Skyvern](https://www.skyvern.com/products), [recorder](https://www.skyvern.com/blog/launch-week-day-3-show-dont-tell-screen-record-your-workflows-with-skyvern/)  | Browser recording produces reusable automation, with workflow builder, MCP and observability.                                    | Demonstration-to-workflow is already a product category. Sendtry must prove the quality of reviewed, agent-independent procedures and their reuse.                                  |
| [OpenAdapt Flow](https://github.com/OpenAdaptAI/openadapt-flow), [effect verification](https://github.com/OpenAdaptAI/openadapt-flow/blob/main/docs/EFFECT_KIT.md) | Demonstration compilation, governed execution, MCP and independent effect checks before a verified result.                       | Direct competition for Teach's value. Borrow the distinction between delivered actions and checked effects, without adopting its compiler, policies or backend.                     |
| [Windows-MCP](https://github.com/CursorTouch/Windows-MCP), [computer-use-linux](https://github.com/agent-sh/computer-use-linux)                                    | Native desktop MCP with platform accessibility/input and client installation paths.                                              | Low-friction substitutes when users want their existing PC. They are a different isolation proposition from a dedicated guest; platform coverage needs actual testing.              |

### GitHub snapshot and maintenance signals

Read-only GitHub REST lookup of ten fixed public repositories, including default
branch commit, archive flag, license label and latest-release metadata. Counts
are point-in-time observations, **not active users, revenues, market share or
evidence that Sendtry will be adopted**. Two OpenAdapt repos belong to one
ecosystem. A monorepo's latest release may describe only one package; it is not
treated as a product-wide version. Missing latest-release data does not establish
absence of releases or registry distributions.

| Repository                                                                    | Stars at snapshot | Default-branch commit date (UTC)                                                                              | Archive status      |
| ----------------------------------------------------------------------------- | ----------------: | ------------------------------------------------------------------------------------------------------------- | ------------------- |
| [browser-use/browser-use](https://github.com/browser-use/browser-use)         |           117,662 | [7 Oct 2026](https://github.com/browser-use/browser-use/commit/c75e8476e26d18b7617643bc2ae082fae8eae431)      | Active              |
| [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)       |            38,034 | [8 Oct 2026](https://github.com/microsoft/playwright-mcp/commit/b8b4183e099f136cbec0388a6088d4aa2f6b9685)     | Active              |
| [trycua/cua](https://github.com/trycua/cua)                                   |            29,398 | [12 Oct 2026](https://github.com/trycua/cua/commit/c9a607993875d341f70124c7d7f4398297317016)                  | Active              |
| [Skyvern-AI/skyvern](https://github.com/Skyvern-AI/skyvern)                   |            23,182 | [9 Oct 2026](https://github.com/Skyvern-AI/skyvern/commit/f5f3f28a9ce0021a1db24286928a7bff6582a1eb)           | Active              |
| [bytebot-ai/bytebot](https://github.com/bytebot-ai/bytebot)                   |            11,077 | [11 Sep 2025](https://github.com/bytebot-ai/bytebot/commit/3d37894ce07ef8d8b40adc7fd309ad96c2a71313)          | Archived 7 Mar 2026 |
| [CursorTouch/Windows-MCP](https://github.com/CursorTouch/Windows-MCP)         |             8,689 | [10 Oct 2026](https://github.com/CursorTouch/Windows-MCP/commit/b74c507d9e709223a0904cf08019edf55f2a75bb)     | Active              |
| [OpenAdaptAI/OpenAdapt](https://github.com/OpenAdaptAI/OpenAdapt)             |             1,772 | [14 Sep 2026](https://github.com/OpenAdaptAI/OpenAdapt/commit/7ae7ebc02048f41dd820ad826d3e78c4dcce2cd2)       | Active              |
| [e2b-dev/desktop](https://github.com/e2b-dev/desktop)                         |             1,523 | [30 Sep 2026](https://github.com/e2b-dev/desktop/commit/1ff98a36306989d155ce5eceab2a2d38c9a8d6d2)             | Active              |
| [agent-sh/computer-use-linux](https://github.com/agent-sh/computer-use-linux) |               680 | [10 Oct 2026](https://github.com/agent-sh/computer-use-linux/commit/7b9ddd0ba81590376c661904456efaa65d9224bc) | Active              |
| [OpenAdaptAI/openadapt-flow](https://github.com/OpenAdaptAI/openadapt-flow)   |                10 | [22 Sep 2026](https://github.com/OpenAdaptAI/openadapt-flow/commit/6e4e4ed0fe4addedd7c38ced44176b42bc40165a)  | Active              |

Here “Active” means not archived, not a judgment of support quality. The small
Flow repo is still technically relevant to the Teach/result boundary; stars alone
would miss it. Conversely Bytebot's retained stars do not establish maintained
software. Selected public metadata is preserved in the
[dated research snapshot](research/github-20261012.json); fuller private working
notes remain in `artifacts/market-github-20261011/`. README/documentation and
Cua's component licensing map were inspected; this is not a complete dependency
license audit. Competitor code was not installed or run.

### Concrete issue signals

These are selected reports/requests, not a representative survey or independently
reproduced faults. Their status is dated to this review; closed reports are not
presented as current defects.

| Report                                                                                                                                | Observed status                  | Design lesson for Sendtry                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [Playwright MCP #1594](https://github.com/microsoft/playwright-mcp/issues/1594): a second stdio client hits a persistent-profile lock | Closed                           | Test two real client processes and shared browser state; preserve one writer and observe without takeover.                                    |
| [Windows-MCP #412](https://github.com/CursorTouch/Windows-MCP/issues/412): startup race when a client launches several instances      | Open; report names v0.7.2        | A successful SDK connection is not a clean harness launch test; repeated/disconnecting client startup matters.                                |
| [Browser Use #4798](https://github.com/browser-use/browser-use/issues/4798): pause from a tool for human interaction                  | Open request                     | Visible owner handoff and interruption recovery matter. Sendtry already has takeover/leases; a resumable task outcome remains a separate gap. |
| [Cua #4991](https://github.com/trycua/cua/issues/4991): packaged Windows apps do not match bounded app identity                       | Open; report names driver 0.34.1 | Native app permission boundaries vary by OS/app. Do not turn Docker-host portability into a native-desktop support claim.                     |
| [OpenAdapt Flow #455](https://github.com/OpenAdaptAI/openadapt-flow/issues/455): verifier reads need explicit oracle identity         | Open                             | A verification source also needs scope/identity; a success badge without attributable evidence is insufficient.                               |

Inference: installation/first launch, shared-state ownership, owner intervention
and trustworthy result attribution are practical product work. The reports do
not prove prevalence, vendor inferiority or that our implementation has fixed
their exact underlying faults.

MCP standardizes capabilities rather than task intelligence ([official
specification](https://modelcontextprotocol.io/specification/2026-07-28)).
[Agent Skills](https://agentskills.io/home) provides an open procedural format;
that is an interoperability opportunity, not a proprietary moat.

The official [Skills over MCP extension](https://modelcontextprotocol.io/extensions/skills/overview)
now defines discovery/retrieval through skills methods and Resources. Host/SDK
support remains in progress and must be checked per client. The current product
has tools, prompts and file exports; it does **not** implement this extension.
Evaluate it as a bounded compatibility slice with the existing export fallback,
preserving owner review, origin, manifests and revision/identity checks. Do not
mark a skill loaded because it was downloaded or read.

## Pricing signals and business hypothesis

- [Browser Use pricing](https://browser-use.com/pricing): $0.02 per browser-hour,
  $5/GB residential proxy, hosted agent model cost plus 20%, with browser/traffic
  additional. Its current pricing page supersedes a different rate found in an
  older repository document.
- [E2B pricing](https://e2b.dev/pricing): Hobby has no base subscription and
  metered usage; Pro is $150/month plus usage.
- [Skyvern pricing](https://www.skyvern.com/pricing): Free, $29/month Hobby and
  $149/month Pro, with different credits/concurrency.

These units differ; they do not establish cost per completed task or a fair
browser-versus-desktop price ranking. Sendtry's local execution still consumes
owner hardware, Docker resources and any chosen model budget. A low cloud
browser price makes generic infrastructure pricing a weak initial strategy.

Recommendation: validate a useful local developer core first. Future optional
support, managed installation or owned-computer adapters are monetization
hypotheses, not authorized cloud/billing work. No Sendtry price is set here.

Public redistribution decisions remain pending. Bytebot/E2B Desktop publish
Apache-2.0 terms; Browser Use identifies MIT; Skyvern identifies AGPL-3.0.
Cua separates MIT components from source-available FSL Spaces and Driver Bench;
its [component licensing map](https://github.com/trycua/cua/blob/main/LICENSING.md)
supersedes a single GitHub license label. OpenAdapt Flow and the two inspected
native MCP repositories identify MIT. Read exact
component/version notices before any reuse. Sendtry remains private/UNLICENSED;
code licensing and Sendtry trademark/asset terms are separate decisions.

## First audience and adoption

Start with developers and automation builders who already use a coding agent,
can run Docker and need a persistent guest across browser, files and terminal.
Small operations teams are a later pilot audience once repeated tasks are
reliable. General consumers face setup, permissions and model/harness complexity;
the present checkout is not a mass-market installer.

Proposed pilot: 5–10 willing users, recruited only with separate authorization.
Observe installation, first connection, first verified task and reuse several
days later. Learn what they currently use, where it fails, how often the task
recurs and whether Teach saves effort. Do not equate GitHub stars, vendor
benchmarks or a large agent ecosystem with Sendtry demand.

Adoption should come from reproducible demos, a usable operator skill, precise
setup/harness support and reviewed examples. Exported instructions are portable
files, but today they intentionally bind to one computer/workspace/revision;
they are not automatically transferable execution on another PC.

## Evidence needed next

1. **Activation:** fresh install and actual skill/MCP registration in named
   harness versions; record elapsed time, downloads/resources and help required.
   A proposed goal is first verified task within ten minutes after prerequisites
   are ready. No current measured percentile is claimed.
2. **Teach quality:** use six bounded synthetic task families with fresh inputs,
   varied initial state and an explicit expected result. Compare instructions
   alone against taught/reviewed instructions using the same model/environment.
   Repeat five times in two named vision-capable configurations: 60 taught
   attempts plus matched baseline. This is a proposed evaluation, not executed
   work; it needs an explicit model/cost scope before running paid inference.
3. **Useful success:** record task outcome, verifier, owner interventions,
   interruption/recovery and changed-state failures. A successful tool call is
   not task success; model self-report is not independent verification.
4. **Support honesty:** keep host/guest/harness/model coverage distinct; resolve
   current storage capacity and hosted CI restrictions before release claims.
5. **Open-source readiness:** decide licensing/brand terms, notices, contribution
   and security reporting, packaging and clean-install support before publication.

The [readiness review](READINESS.md) turns these gaps into ordered release gates,
with existing code/evidence, next deliverable and explicit acceptance criteria.
It proposes work; it does not claim those gates are already implemented.

Operational Activity remains private metadata. Any future task evaluation must
define its own purpose, consent, retention and verifier provenance; it must not
silently add task payloads or external analytics to the current audit contract.

See [design review and ordered next slices](DESIGN-REVIEW.md) for the product work
that addresses these gaps.
