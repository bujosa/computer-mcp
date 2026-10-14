import { readFileSync } from 'node:fs';

// Trusted installed-package metadata, independent of cwd, private state or Docker.
const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url)),
);
export const version = pkg.version;
export const serverInfo = Object.freeze({
  name: 'computer-mcp',
  title: 'Sendtry Computer',
  version,
  description: pkg.description,
  websiteUrl: pkg.homepage,
});
