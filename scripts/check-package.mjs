// Local, read-only inventory check. No tarball, installation or publication.
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { validatePackageInventory } from './package-contract.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
if (!process.env.npm_execpath)
  throw new Error('Run this check with npm run check:package.');
const pkg = JSON.parse(
  await fs.readFile(new URL('../package.json', import.meta.url)),
);
const { stdout } = await promisify(execFile)(
  process.execPath,
  [process.env.npm_execpath, 'pack', '--dry-run', '--json', '--ignore-scripts'],
  { cwd: root, timeout: 60000, maxBuffer: 1024 * 1024 },
);
const [pack] = JSON.parse(stdout);
const result = validatePackageInventory(pkg, pack.files);
process.stdout.write(
  JSON.stringify({
    result: 'passed',
    ...result,
    compressedBytes: pack.size,
    unpackedBytes: pack.unpackedSize,
    private: pkg.private,
    license: pkg.license,
    published: false,
  }) + '\n',
);
