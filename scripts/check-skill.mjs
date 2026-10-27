// Local asset contract only; no installation, inference, account or publication.
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateSkillDirectory } from './skill-contract.mjs';

const directory = fileURLToPath(
  new URL('../skills/sendtry-computer', import.meta.url),
);
const license = await fs.readFile(
  new URL('../LICENSE', import.meta.url),
  'utf8',
);
const result = await validateSkillDirectory(directory, license);
process.stdout.write(
  JSON.stringify({
    result: 'passed',
    ...result,
    installed: false,
    published: false,
  }) + '\n',
);
