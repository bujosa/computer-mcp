import * as z from 'zod';

export const desktopSize = Object.freeze({ width: 1280, height: 800 });
export const desktopInputLimits = Object.freeze({
  timeoutMs: 5000,
  cleanupMs: 1000,
  textCharacters: 1024,
  scrollSteps: 10,
  clicks: 2,
  outputBytes: 4096,
});
const x = z
  .number()
  .int()
  .min(0)
  .max(desktopSize.width - 1);
const y = z
  .number()
  .int()
  .min(0)
  .max(desktopSize.height - 1);
const modifiers = new Set(['Ctrl', 'Alt', 'Shift', 'Super']);
const namedKeys = new Set([
  'Return',
  'Tab',
  'Escape',
  'BackSpace',
  'Delete',
  'Insert',
  'Home',
  'End',
  'Page_Up',
  'Page_Down',
  'Left',
  'Right',
  'Up',
  'Down',
  'space',
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),
]);
export function validDesktopKey(key) {
  if (typeof key !== 'string' || key.length > 48) return false;
  const parts = key.split('+'),
    base = parts.pop();
  return (
    parts.length <= 3 &&
    new Set(parts).size === parts.length &&
    parts.every((part) => modifiers.has(part)) &&
    (namedKeys.has(base) || /^[a-zA-Z0-9]$/.test(base))
  );
}
export const desktopActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('move'), x, y }).strict(),
  z
    .object({
      action: z.literal('click'),
      x,
      y,
      button: z.enum(['left', 'middle', 'right']).default('left'),
      clicks: z.number().int().min(1).max(2).default(1),
    })
    .strict(),
  z
    .object({
      action: z.literal('scroll'),
      x,
      y,
      direction: z.enum(['up', 'down', 'left', 'right']),
      steps: z.number().int().min(1).max(10).default(1),
    })
    .strict(),
  z
    .object({
      action: z.literal('type'),
      text: z
        .string()
        .min(1)
        .max(1024)
        .refine(
          (text) =>
            Array.from(text).every((char) => {
              const code = char.codePointAt(0);
              return (
                code >= 32 &&
                (code < 127 || code > 159) &&
                code !== 0x2028 &&
                code !== 0x2029 &&
                (code < 0xd800 || code > 0xdfff)
              );
            }),
          'Use single-line text; send Return/Tab as separate key actions.',
        ),
    })
    .strict(),
  z
    .object({
      action: z.literal('key'),
      key: z
        .string()
        .min(1)
        .max(48)
        .describe(
          'Return, Tab, Escape, BackSpace, Delete, Insert, Home, End, Page_Up, Page_Down, Left, Right, Up, Down, space, F1–F12, or one ASCII letter/digit; optional Ctrl/Alt/Shift/Super modifiers, e.g. Ctrl+l.',
        )
        .refine(
          validDesktopKey,
          'Use a supported key, optionally preceded by Ctrl/Alt/Shift/Super.',
        ),
    })
    .strict(),
]);

// Teaching keeps geometry, not literal text or key values. Keys can themselves
// contain input values; both typing and key actions become supplied parameters.
export function desktopTrace(input) {
  const parsed = desktopActionSchema.safeParse(input);
  if (!parsed.success) return null;
  const trace = { ...parsed.data };
  delete trace.text;
  delete trace.key;
  return trace;
}
