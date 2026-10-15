import assert from 'node:assert/strict';

export const requiredPackageFiles = [
  'package.json',
  'npm-shrinkwrap.json',
  '.dockerignore',
  'src/cli.js',
  'src/mcp.js',
  'src/metadata.js',
  'runtime/Dockerfile',
  'runtime/entrypoint.sh',
  'runtime/chromium-agent.sh',
  'scripts/build-ui.mjs',
  'ui/index.html',
  'ui/skills/sendtry-computer/SKILL.md',
];
const documents = new Set([
  'README.md',
  'SECURITY.md',
  ...['SETUP', 'TEACH', 'TASKS', 'DESKTOP', 'ACTIVITY', 'TOOLS-AND-SKILLS'].map(
    (name) => `docs/${name}.md`,
  ),
]);
export function validatePackageInventory(pkg, files) {
  assert.equal(pkg.private, true, 'Public distribution is not authorized.');
  assert.equal(pkg.license, 'UNLICENSED', 'License selection remains pending.');
  const names = new Set(files.map((file) => file.path));
  assert.equal(names.size, files.length, 'Duplicate package paths.');
  for (const name of names) {
    const safe =
      !name.split('/').some((part) => part === '..' || part.startsWith('.')) &&
      (/^(src|runtime)\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.js$/.test(name) ||
        /^runtime\/[a-z0-9-]+\.(?:sh|py)$/.test(name) ||
        /^ui\/[a-z0-9-]+\.(?:js|html|css)$/.test(name) ||
        /^ui\/assets\/[a-z0-9-]+\.svg$/.test(name) ||
        name === 'ui/skills/sendtry-computer/SKILL.md');
    assert.ok(
      safe || documents.has(name) || requiredPackageFiles.includes(name),
      'Unexpected package file; inspect locally before packaging.',
    );
  }
  for (const name of requiredPackageFiles)
    assert.ok(names.has(name), `Missing required package asset: ${name}`);
  assert.ok(
    !names.has('package-lock.json'),
    'Use the packaged shrinkwrap lock.',
  );
  return { files: names.size };
}
