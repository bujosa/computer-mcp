import { randomUUID } from 'node:crypto';
import { requireThat } from './errors.js';
import { instructions } from './teach.js';

export const revision = (workflow) => workflow.revision || workflow.id;
export function assertRevision(workflow, expected) {
  requireThat(
    revision(workflow) === expected,
    'workflow_changed',
    'This demonstration changed. Read it again before submitting changes.',
    409,
  );
}
export function assertAnalysis(workflow) {
  requireThat(
    workflow.status === 'ready' &&
      workflow.analysis?.enabled &&
      ['ready', 'interrupted'].includes(workflow.video?.status),
    'analysis_not_authorized',
    'The owner must enable agent analysis for this saved video in Skills.',
    403,
  );
}
export function grantAnalysis(workflow, { enabled, expectedRevision }) {
  assertRevision(workflow, expectedRevision);
  requireThat(
    typeof enabled === 'boolean',
    'invalid_analysis',
    'Choose whether to allow agent analysis.',
  );
  if (enabled)
    requireThat(
      workflow.status === 'ready' &&
        ['ready', 'interrupted'].includes(workflow.video?.status),
      'video_not_ready',
      'Save a playable demonstration video first.',
      409,
    );
  return {
    ...workflow,
    revision: randomUUID(),
    analysis: {
      enabled,
      changedAt: new Date().toISOString(),
    },
  };
}
export function proposeWorkflow(workflow, input, actor) {
  assertRevision(workflow, input.expectedRevision);
  assertAnalysis(workflow);
  requireThat(
    typeof input.procedure === 'string' &&
      input.procedure.trim().length > 0 &&
      input.procedure.length <= 12000 &&
      typeof input.expectedResult === 'string' &&
      input.expectedResult.trim().length > 0 &&
      input.expectedResult.length <= 1000 &&
      typeof input.uncertainties === 'string' &&
      input.uncertainties.length <= 5000,
    'invalid_proposal',
    'Provide a bounded procedure, expected result and uncertainties.',
  );
  const next = structuredClone(workflow);
  next.draft = {
    id: randomUUID(),
    sourceRevision: revision(workflow),
    procedure: input.procedure.trim(),
    expectedResult: input.expectedResult.trim(),
    uncertainties: input.uncertainties.trim(),
    proposedAt: new Date().toISOString(),
    actor,
  };
  next.revision = randomUUID();
  next.instructions = instructions(next);
  return next;
}
export function discardProposal(workflow, { expectedRevision, draftId }) {
  assertRevision(workflow, expectedRevision);
  requireThat(
    workflow.draft?.id === draftId,
    'draft_changed',
    'Select the current proposal before discarding it.',
    409,
  );
  const next = structuredClone(workflow);
  delete next.draft;
  next.revision = randomUUID();
  next.instructions = instructions(next);
  return next;
}
