# Changelog

## Unreleased

- `worker --connection FILE --agent claude|codex` starts that agent CLI for each
  newly queued assignment and each demonstration opened for analysis, scoped to
  that one connection. Owner verification and review are unchanged.
- The `assigned-task` and `analyze-demonstration` prompts accept an omitted `id`
  and pick the oldest queued task or the newest demonstration awaiting analysis.

## 0.1.0 — public source preview (27 October 2026)

The complete GitHub source/history and generic skill are public under MIT.
This is a source preview, with no npm, Registry, prebuilt image or GitHub Release.

- Dedicated local Linux desktop, visible browser, guest files/terminal/screenshots
  and bounded native guest mouse/keyboard tools over stdio MCP.
- Per-computer/workspace identity, separately revocable named read/work grants,
  exclusive control and owner takeover/cancellation.
- Owner-assigned tasks, session/boot/lease-bound attempts, factual agent reports
  and independent owner verification with private metadata-only usage history.
- Teach trace/optional guest video → consented external agent analysis → editable
  proposal → owner review → exact-revision skill reuse with supplied inputs.
- Actual stdio readiness checks and structured output contracts for all 20 tools.
- Preserve the default branch's safe browser link observations through structured
  MCP results, with compatibility for older guests.
- MIT generic operator in standard `skills/` layout, standalone notice, optional
  harness UI metadata and reproducible skill/package checks.
- Public-preview review patches Zod/body-parser/qs advisories, removes failed
  checkpoint staging files, syncs complete JSON before publication and makes the
  audit shutdown regression independent of calendar date.

No public package/image/Registry release is claimed. See `docs/PUBLICATION.md`
for scope, validation, known limits and the remaining publication steps.
