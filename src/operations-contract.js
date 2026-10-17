import * as z from 'zod';

const uuid = z.uuid();
const boundedText = (limit) =>
  z
    .string()
    .min(1)
    .max(limit)
    .refine((value) => value.trim().length > 0);
const boundedReportText = (limit) =>
  z
    .string()
    .max(limit)
    .refine((value) => value.trim().length > 0)
    .transform((value) => value.trim());

export const connectionLabelSchema = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/);

export const connectionCreateSchema = z.strictObject({
  label: connectionLabelSchema,
  access: z.enum(['read', 'work']),
});

const actor = z
  .string()
  .regex(
    /^(?:agent|human):[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
const timestamp = z.iso.datetime();
export const connectionSessionSchema = z.strictObject({
  actor,
  bootId: uuid,
  firstSeenAt: timestamp,
  lastSeenAt: timestamp,
  endedAt: timestamp.nullable(),
  reason: z.string().nullable(),
  client: z.strictObject({
    source: z.enum(['mcp', 'cli', 'api']),
    name: z.string().nullable(),
    version: z.string().nullable(),
    protocol: z.string().nullable(),
  }),
});

export const connectionPublicSchema = z.strictObject({
  id: uuid,
  label: connectionLabelSchema,
  access: z.enum(['read', 'work']),
  requiresTask: z.boolean(),
  createdAt: timestamp,
  revokedAt: timestamp.nullable(),
  sessions: z.array(connectionSessionSchema),
});

export const taskWorkflowSchema = z.strictObject({
  id: uuid,
  revision: uuid,
});

export const taskCreateSchema = z.strictObject({
  requestId: uuid,
  connectionId: uuid,
  name: boundedText(120),
  goal: boundedText(4000),
  expectedResult: boundedText(2000),
  scope: z.string().max(2000).optional().default(''),
  workflow: taskWorkflowSchema.optional(),
});

export const taskFinishSchema = z.strictObject({
  outcome: z.enum(['success', 'failure', 'uncertain']),
  summary: boundedReportText(2000),
  evidence: z.array(boundedReportText(500)).max(10),
});

export const taskCancelSchema = z.strictObject({
  expectedRevision: z.number().int().positive().optional(),
});

export const taskVerifySchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
  verdict: z.enum(['verified', 'rejected']),
  notes: boundedText(2000),
});

export const taskStatuses = Object.freeze([
  'queued',
  'running',
  'reported_success',
  'failed',
  'interrupted',
  'cancelled',
]);

export const attemptStatuses = Object.freeze([
  'running',
  'reported_success',
  'failed',
  'interrupted',
  'cancelled',
]);

export const interruptionReasonSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,63}$/);
