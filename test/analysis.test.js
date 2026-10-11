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
  const identity = {
    computerId: original.computerId,
    workspaceId: randomUUID(),
  };
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
  assert.throws(() => exportSkill(next, identity), {
    code: 'skill_needs_review',
  });
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
  const identity = {
    computerId: original.computerId,
    workspaceId: randomUUID(),
  };
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
  assert.ok(
    exportSkill(approved, identity).content.includes('confirm the selector'),
  );
  const replacement = proposeWorkflow(approved, proposal(approved), 'agent:qa');
  assert.deepEqual(replacement.review, approved.review);
  const restored = discardProposal(replacement, {
    expectedRevision: replacement.revision,
    draftId: replacement.draft.id,
  });
  assert.equal(restored.draft, undefined);
  assert.ok(
    exportSkill(restored, identity).content.includes('confirm the selector'),
  );
  assert.throws(() => exportSkill(replacement, identity), {
    code: 'skill_needs_review',
  });
});

test('Video-only demonstrations can become reviewed drafts; incomplete videos and oversized drafts fail', () => {
  const original = { ...fixture(), steps: [] };
  const identity = {
    computerId: original.computerId,
    workspaceId: randomUUID(),
  };
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
  assert.ok(
    exportSkill(approved, identity).content.includes(draft.draft.procedure),
  );
});

test('Owner can revise an approved video-only procedure after the draft and video are gone', () => {
  const original = { ...fixture(), steps: [] };
  const shared = grantAnalysis(original, {
    enabled: true,
    expectedRevision: original.revision,
  });
  const draft = proposeWorkflow(shared, proposal(shared), 'agent:qa');
  const approved = reviewWorkflow(draft, {
    expectedRevision: draft.revision,
    draftId: draft.draft.id,
    procedure: draft.draft.procedure,
    expectedResult: draft.draft.expectedResult,
  });
  const retained = { ...approved, video: { status: 'deleted' } };
  const correction = {
    expectedRevision: retained.revision,
    procedure: 'Inspect the current page and verify the supplied result.',
    expectedResult: 'The page shows the exact supplied result.',
    notes: 'Corrected after reviewing the first attempt.',
  };
  const edited = reviewWorkflow(retained, correction);
  assert.equal(edited.steps.length, 0);
  assert.equal(edited.review.procedure, correction.procedure);
  assert.equal(edited.review.expectedResult, correction.expectedResult);
  assert.notEqual(edited.revision, retained.revision);
  assert.equal(edited.video.status, 'deleted');
  assert.equal(retained.review.procedure, approved.review.procedure);
  assert.throws(() => reviewWorkflow(edited, correction), {
    code: 'workflow_changed',
  });
  assert.throws(
    () =>
      reviewWorkflow(original, {
        ...correction,
        expectedRevision: original.revision,
      }),
    { code: 'skill_not_ready' },
  );
  assert.ok(
    exportSkill(edited, {
      computerId: original.computerId,
      workspaceId: randomUUID(),
    }).content.includes(correction.procedure),
  );
});
