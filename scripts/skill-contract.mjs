import fs from 'node:fs/promises';
import path from 'node:path';
import { parseDocument } from 'yaml';
import * as z from 'zod';

const files = ['LICENSE.txt', 'SKILL.md', 'agents/openai.yaml'];
const frontmatter = z.strictObject({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(1).max(1024),
  license: z.literal('MIT'),
  compatibility: z.string().min(1).max(500).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  'allowed-tools': z.string().optional(),
});
function requireThat(condition, message) {
  if (!condition) throw new Error(message);
}
function yaml(text) {
  const document = parseDocument(text, { uniqueKeys: true });
  requireThat(
    !document.errors.length && !document.warnings.length,
    'Invalid skill YAML.',
  );
  try {
    return document.toJS({ maxAliasCount: 0 });
  } catch {
    throw new Error('Unsupported skill YAML aliases.');
  }
}
async function inventory(directory, prefix = '') {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    requireThat(
      !entry.isSymbolicLink(),
      'Skill assets must not contain symlinks.',
    );
    const relative = prefix + entry.name;
    if (entry.isDirectory()) {
      requireThat(relative === 'agents', 'Unexpected skill asset directory.');
      result.push(
        ...(await inventory(path.join(directory, entry.name), `${relative}/`)),
      );
    } else {
      requireThat(
        entry.isFile() && files.includes(relative),
        'Unexpected skill asset file.',
      );
      const stat = await fs.stat(path.join(directory, entry.name));
      requireThat(stat.size <= 32768, 'Skill asset exceeds its size limit.');
      result.push(relative);
    }
  }
  return result.sort();
}

export async function validateSkillDirectory(directory, license) {
  requireThat(
    (await fs.lstat(directory)).isDirectory(),
    'Skill must be a regular directory.',
  );
  const names = await inventory(directory);
  requireThat(
    JSON.stringify(names) === JSON.stringify([...files].sort()),
    'Incomplete skill package.',
  );
  const text = await fs.readFile(path.join(directory, 'SKILL.md'), 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/.exec(text);
  requireThat(
    match && match[1].length <= 8192,
    'Missing or oversized skill frontmatter.',
  );
  const parsed = frontmatter.safeParse(yaml(match[1]));
  requireThat(
    parsed.success,
    'Skill frontmatter does not match the Agent Skills contract.',
  );
  requireThat(
    parsed.data.name === path.basename(directory),
    'Skill name must match its directory.',
  );
  requireThat(match[2].trim().length > 0, 'Skill body must not be empty.');
  requireThat(
    (await fs.readFile(path.join(directory, 'LICENSE.txt'), 'utf8')) ===
      license,
    'Skill must include the canonical MIT notice.',
  );
  const ui = yaml(
    await fs.readFile(path.join(directory, 'agents/openai.yaml'), 'utf8'),
  );
  const metadata = z
    .strictObject({
      interface: z.strictObject({
        display_name: z.string().min(1),
        short_description: z.string().min(25).max(64),
        default_prompt: z.string().min(1),
      }),
    })
    .safeParse(ui);
  requireThat(
    metadata.success &&
      metadata.data.interface.default_prompt.includes(`$${parsed.data.name}`),
    'Skill UI metadata must identify its invocation.',
  );
  return {
    name: parsed.data.name,
    version: parsed.data.metadata?.version || null,
    license: parsed.data.license,
    files: names,
  };
}
