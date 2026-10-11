# Sendtry Computer: market and positioning review

Reviewed 11 October 2026. This is a desk review of primary sources, not customer
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

That hypothesis is not yet a demonstrated competitive advantage. The runtime
and one independent operator task are exercised; video understanding across
models and repeated taught-task success are not. See [validation](VALIDATION.md).

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

| Alternative                                                                                                                                                       | Primary-source observation                                                                                                       | Implication for Sendtry                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Cua](https://github.com/trycua/cua)                                                                                                                              | Spaces offers shared agent desktops and local macOS VMs; Driver exposes native desktop tools through MCP on macOS/Windows/Linux. | Closest strategic overlap. PC ownership, human sharing and MCP are established propositions. Native permissions, VM isolation and container isolation need separate support claims. |
| [E2B Desktop](https://github.com/e2b-dev/desktop)                                                                                                                 | Linux desktop sandbox with SDK, streaming, input, files and commands.                                                            | Competes for developers who want managed computer infrastructure. A future adapter can be evaluated without importing a cloud backend into this repo.                               |
| [Bytebot](https://github.com/bytebot-ai/bytebot), [desktop-only setup](https://docs.bytebot.ai/quickstart)                                                        | Containerized Linux desktop, persistent environment, takeover and MCP. The repository is archived as of 7 March 2026.            | Direct historical precedent. Archive status is a maintenance consideration, not evidence of why it happened or that the concept failed.                                             |
| [Browser Use](https://browser-use.com/)                                                                                                                           | Browser automation with open-source local execution and hosted browser/agent infrastructure.                                     | A smaller browser-only solution is a credible substitute when desktop/files/terminal/Teach are unnecessary.                                                                         |
| [Playwright MCP](https://github.com/microsoft/playwright-mcp)                                                                                                     | Browser tools, persistent or isolated profiles and existing-browser integration.                                                 | Basic browser access is a baseline capability. Avoid competing mainly on a longer tool list.                                                                                        |
| [Skyvern](https://www.skyvern.com/products), [recorder](https://www.skyvern.com/blog/launch-week-day-3-show-dont-tell-screen-record-your-workflows-with-skyvern/) | Browser recording produces reusable automation, with workflow builder, MCP and observability.                                    | Demonstration-to-workflow is already a product category. Sendtry must prove the quality of reviewed, agent-independent procedures and their reuse.                                  |

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
Cua separates MIT components from source-available FSL Spaces. Read exact
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

Operational Activity remains private metadata. Any future task evaluation must
define its own purpose, consent, retention and verifier provenance; it must not
silently add task payloads or external analytics to the current audit contract.

See [design review and ordered next slices](DESIGN-REVIEW.md) for the product work
that addresses these gaps.
