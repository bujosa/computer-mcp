import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  grantAnalysis,
  proposeWorkflow,
  assertAnalysis,
  discardProposal,
} from '../runtime/analysis.js';
import { reviewWorkflow } from '../runtime/teach.js';
import { exportSkill } from '../runtime/skill.js';

const fixture = () => ({
  id: randomUUID(),
  computerId: randomUUID(),
  name: 'Taught task',
  goal: '',
  status: 'ready',
  revision: randomUUID(),
  steps: [{ type: 'navigate', url: 'https://example.org/' }],
  video: { status: 'ready', frames: 10, fps: 8 },
});
const proposal = (w) => ({
  expectedRevision: w.revision,
  procedure:
    '1. Inspect the requested page.\n2. Fill the supplied value, then verify it.',
  expectedResult: 'The page shows the requested value.',
  uncertainties: 'Sampled frames may omit clicks; confirm the selector.',
});

test('Video analysis consent and proposals are scoped, revision checked and never approve a skill', () => {
  const original = fixture();
  assert.throws(() => assertAnalysis(original), {
    code: 'analysis_not_authorized',
  });
  assert.throws(
    () =>
      grantAnalysis(original, {
        enabled: true,
        expectedRevision: randomUUID(),
      }),
    { code: 'workflow_changed' },
  );
  const shared = grantAnalysis(original, {
    enabled: true,
    expectedRevision: original.revision,
  });
  const next = proposeWorkflow(shared, proposal(shared), 'agent:qa');
  assert.ok(next.draft.id && next.draft.sourceRevision === shared.revision);
  assert.equal(next.review, undefined);
  assert.equal(original.analysis, undefined);
  assert.throws(() => exportSkill(next), { code: 'skill_needs_review' });
  assert.throws(() => proposeWorkflow(next, proposal(shared), 'agent:qa'), {
    code: 'workflow_changed',
  });
  const revoked = grantAnalysis(next, {
    enabled: false,
    expectedRevision: next.revision,
  });
  assert.throws(() => proposeWorkflow(revoked, proposal(revoked), 'agent:qa'), {
    code: 'analysis_not_authorized',
  });
});

test('Owner review applies the exact current editable draft and publishes only reviewed instructions', () => {
  const original = fixture();
  const shared = grantAnalysis(original, {
    enabled: true,
    expectedRevision: original.revision,
  });
  const draft = proposeWorkflow(shared, proposal(shared), 'agent:qa');
  const review = {
    expectedRevision: draft.revision,
    draftId: draft.draft.id,
    procedure:
      '1. Use browser_snapshot to confirm the selector.\n2. Fill parameter input_1.',
    expectedResult: 'Check the resulting supplied value.',
  };
  assert.throws(
    () => reviewWorkflow(draft, { ...review, draftId: randomUUID() }),
    { code: 'draft_changed' },
  );
  assert.throws(
    () =>
      reviewWorkflow(draft, { ...review, expectedRevision: shared.revision }),
    { code: 'workflow_changed' },
  );
  const approved = reviewWorkflow(draft, review);
  assert.equal(approved.draft, undefined);
  assert.equal(approved.review.draftId, draft.draft.id);
  assert.ok(exportSkill(approved).content.includes('confirm the selector'));
  const replacement = proposeWorkflow(approved, proposal(approved), 'agent:qa');
  assert.deepEqual(replacement.review, approved.review);
  const restored = discardProposal(replacement, {
    expectedRevision: replacement.revision,
    draftId: replacement.draft.id,
  });
  assert.equal(restored.draft, undefined);
  assert.ok(exportSkill(restored).content.includes('confirm the selector'));
  assert.throws(() => exportSkill(replacement), { code: 'skill_needs_review' });
});

test('Video-only demonstrations can become reviewed drafts; incomplete videos and oversized drafts fail', () => {
  const original = { ...fixture(), steps: [] };
  assert.throws(
    () =>
      grantAnalysis(
        { ...original, video: { status: 'failed' } },
        { enabled: true, expectedRevision: original.revision },
      ),
    { code: 'video_not_ready' },
  );
  const shared = grantAnalysis(original, {
    enabled: true,
    expectedRevision: original.revision,
  });
  assert.throws(
    () =>
      proposeWorkflow(
        shared,
        { ...proposal(shared), procedure: 'x'.repeat(12001) },
        'agent:qa',
      ),
    { code: 'invalid_proposal' },
  );
  const draft = proposeWorkflow(shared, proposal(shared), 'agent:qa');
  const approved = reviewWorkflow(draft, {
    expectedRevision: draft.revision,
    draftId: draft.draft.id,
    procedure: draft.draft.procedure,
    expectedResult: draft.draft.expectedResult,
  });
  assert.ok(exportSkill(approved).content.includes(draft.draft.procedure));
});
