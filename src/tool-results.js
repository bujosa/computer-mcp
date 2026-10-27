// MCP success contracts. Errors never include parser issues or rejected payloads.
import * as z from 'zod';
import { taskStatuses, attemptStatuses } from './operations-contract.js';

const uuid = z.uuid();
const time = z.iso.datetime();
const count = z.number().int().nonnegative();
const jsonObject = z.record(z.string(), z.json());
const desktop = z.object({ width: count, height: count });
const lease = z.object({
  owner: z.string(),
  kind: z.enum(['agent', 'human']),
  generation: uuid,
  expiresAt: time,
});
const controller = z.object({
  kind: z.enum(['owner', 'assigned', 'legacy']),
  connectionId: uuid.optional(),
  label: z.string().optional(),
  taskId: uuid.optional(),
  attemptId: uuid.optional(),
});
const workflowPin = z.object({ id: uuid, revision: uuid });
const report = z.object({
  outcome: z.enum(['success', 'failure', 'uncertain']),
  summary: z.string(),
  evidence: z.array(z.string()),
});
const verification = z.object({
  verdict: z.enum(['verified', 'rejected']),
  actor: z.string(),
  notes: z.string(),
  at: time,
});
export const taskResultSchema = z.object({
  id: uuid,
  revision: z.number().int().positive(),
  computerId: uuid,
  workspaceId: uuid,
  connectionId: uuid,
  name: z.string(),
  goal: z.string(),
  expectedResult: z.string(),
  scope: z.string(),
  workflow: workflowPin.nullable(),
  status: z.enum(taskStatuses),
  createdAt: time,
  createdBy: z.string(),
  attempt: z
    .object({
      id: uuid,
      revision: z.number().int().positive(),
      actor: z.string(),
      connectionId: uuid,
      bootId: uuid,
      leaseGeneration: uuid,
      startedAt: time,
      endedAt: time.nullable(),
      status: z.enum(attemptStatuses),
      interruptionReason: z.string().nullable(),
      partialEffects: z.literal('unknown').nullable(),
      report: report.nullable(),
      verification: verification.nullable(),
    })
    .nullable(),
  outdated: z.boolean().optional(),
});
const observedTask = taskResultSchema.extend({ outdated: z.boolean() });

// Saved demonstrations evolve independently. Core reuse/review fields are typed;
// trace, video and review metadata remain JSON objects, not executable input.
const workflow = z.object({
  version: z.literal(1),
  id: uuid,
  computerId: uuid,
  owner: z.string(),
  name: z.string(),
  goal: z.string(),
  createdAt: time,
  status: z.enum(['recording', 'ready', 'interrupted']),
  steps: z.array(jsonObject),
  revision: uuid,
  reviewed: z.boolean(),
  procedure: z.string(),
  instructions: z.string().optional(),
  review: jsonObject.optional(),
  draft: jsonObject.optional(),
  analysis: jsonObject.optional(),
  video: jsonObject.optional(),
  limitReached: z.boolean().optional(),
  finishedAt: time.optional(),
});
const workflowSummary = z.object({
  id: uuid,
  name: z.string(),
  createdAt: time,
  stepCount: count,
  status: z.enum(['recording', 'ready', 'interrupted']),
  reviewed: z.boolean(),
  proposed: z.boolean(),
  analysisEnabled: z.boolean(),
  revision: uuid,
  video: z.object({ status: z.string() }).optional(),
});
export const computerInfoSchema = z.object({
  version: z.literal(1),
  createdAt: time,
  computerId: uuid,
  workspaceId: uuid,
  bootId: uuid,
  guestOS: z.string(),
  adapter: z.literal('docker-linux'),
  isolation: z.literal('dedicated-container'),
  hostControl: z.literal(false),
  network: z.enum(['isolated', 'internet']),
  operationsVersion: z.literal(1),
  legacyEnabled: z.boolean(),
  connection: z
    .object({
      id: uuid,
      label: z.string(),
      access: z.enum(['read', 'work']),
      requiresTask: z.boolean(),
    })
    .nullable(),
  lease: lease.extend({ controller }).nullable(),
  teach: z.union([
    z.object({ active: z.literal(false) }),
    z.object({
      active: z.literal(true),
      id: uuid,
      name: z.string(),
      stepCount: count,
      owner: z.string(),
      limitReached: z.boolean(),
      video: jsonObject.optional(),
    }),
  ]),
  capabilities: z.array(z.string()),
  limits: jsonObject,
  desktop,
  policy: z.string(),
});
export const outputSchemas = {
  computer_info: computerInfoSchema,
  control_acquire: lease,
  control_renew: lease,
  control_release: z.object({ released: z.literal(true) }),
  browser_snapshot: z.object({
    title: z.string(),
    text: z.string(),
    url: z.string(),
    pageId: z.string(),
    pages: z.array(
      z.object({ id: z.string(), url: z.string(), title: z.string() }),
    ),
    elements: z.array(
      z.object({
        tag: z.string(),
        role: z.string().nullable(),
        text: z.string(),
        selector: z.string().nullable(),
        inputType: z.string().nullable(),
      }),
    ),
  }),
  browser_action: z.object({ url: z.string(), title: z.string() }),
  // Binary data stays in MCP image blocks, avoiding duplicate base64 in JSON.
  desktop_screenshot: z.object({ mimeType: z.literal('image/png') }),
  desktop_action: z.object({
    inputSent: z.literal(true),
    action: z.enum(['move', 'click', 'scroll', 'type', 'key']),
    desktop,
    teachingInterrupted: z.literal(true).optional(),
  }),
  terminal_run: z.object({
    stdout: z.string(),
    stderr: z.string(),
    exitCode: z.number().int().nullable(),
    signal: z.string().nullable(),
    stopped: z.enum(['cancelled', 'timeout', 'output_limit']).nullable(),
    truncated: z.boolean(),
  }),
  files_list: z.object({
    entries: z.array(
      z.object({
        name: z.string(),
        type: z.enum([
          'file',
          'directory',
          'blocked-symlink',
          'blocked-special',
        ]),
      }),
    ),
  }),
  files_read: z.object({ path: z.string(), text: z.string() }),
  files_write: z.object({ path: z.string(), bytes: count }),
  workflow_list: z.object({ workflows: z.array(workflowSummary) }),
  workflow_get: workflow,
  workflow_propose: workflow,
  workflow_analyze: z.object({
    id: uuid,
    computerId: uuid,
    workspaceId: uuid,
    sourceRevision: uuid,
    name: z.string(),
    goal: z.string(),
    trace: z.array(jsonObject),
    lastFrameSeconds: z.number().nonnegative(),
    limits: jsonObject,
    instructions: z.string(),
    frames: z.array(
      z.object({
        atSeconds: z.number().nonnegative(),
        mimeType: z.literal('image/png'),
      }),
    ),
  }),
  task_list: z.object({ tasks: z.array(observedTask) }),
  task_get: observedTask,
  task_start: z.object({ task: taskResultSchema, lease }),
  task_finish: z.object({ task: taskResultSchema, released: z.literal(true) }),
};

export function toolResult(name, value) {
  const parsed = outputSchemas[name]?.safeParse(value);
  if (!parsed?.success) {
    const error = new Error(
      'Runtime returned an incompatible tool result. Effects may already have occurred. Inspect the computer before retrying; ask the owner to update/rebuild the selected runtime.',
    );
    error.code = 'invalid_tool_result';
    throw error;
  }
  const structuredContent = parsed.data;
  const content = [{ type: 'text', text: JSON.stringify(structuredContent) }];
  const image = (frame) => ({
    type: 'image',
    mimeType: frame.mimeType,
    data: frame.data,
  });
  if (name === 'desktop_screenshot') content.unshift(image(value));
  if (name === 'workflow_analyze')
    content.push(
      ...value.frames.flatMap((frame) => [
        { type: 'text', text: `Sample at ${frame.atSeconds}s` },
        image(frame),
      ]),
    );
  // Validate media separately; the advertised JSON contract deliberately omits it.
  for (const item of content.filter((item) => item.type === 'image'))
    if (
      typeof item.data !== 'string' ||
      !item.data.length ||
      item.mimeType !== 'image/png'
    ) {
      const error = new Error('Runtime returned invalid image content.');
      error.code = 'invalid_tool_result';
      throw error;
    }
  return { content, structuredContent };
}
