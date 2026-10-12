import * as z from 'zod';

// Descriptive labels only. They are never authentication or authorization.
const label = z.string().regex(/^[a-zA-Z][a-zA-Z0-9 ._-]{0,79}$/);
const version = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,31}$/);
export const auditClientSchema = z.strictObject({
  source: z.enum(['mcp', 'cli', 'api']),
  name: label.optional(),
  version: version.optional(),
  protocol: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export function declaredClient(source, implementation, protocol) {
  return {
    source,
    ...(label.safeParse(implementation?.name).success
      ? { name: implementation.name }
      : {}),
    ...(version.safeParse(implementation?.version).success
      ? { version: implementation.version }
      : {}),
    ...(/^\d{4}-\d{2}-\d{2}$/.test(protocol || '') ? { protocol } : {}),
  };
}
