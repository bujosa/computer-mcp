import assert from 'node:assert/strict';

export const requiredPackageFiles = [
  'package.json',
  'LICENSE',
  'TRADEMARKS.md',
  'THIRD_PARTY_NOTICES.md',
  'npm-shrinkwrap.json',
  '.dockerignore',
  'src/cli.js',
  'src/mcp.js',
  'src/readiness.js',
  'src/tool-results.js',
  'src/metadata.js',
  'src/assigned-connections.js',
  'src/assigned-task.js',
  'src/command-line.js',
  'src/operations-contract.js',
  'runtime/operations.js',
  'runtime/assignments.js',
  'runtime/Dockerfile',
  'runtime/entrypoint.sh',
  'runtime/chromium-agent.sh',
  'scripts/build-ui.mjs',
  'ui/index.html',
  'skills/sendtry-computer/SKILL.md',
  'skills/sendtry-computer/LICENSE.txt',
  'skills/sendtry-computer/agents/openai.yaml',
];
const documents = new Set([
  'README.md',
  'SECURITY.md',
  ...[
    'SETUP',
    'PUBLICATION',
    'RECOVERY',
    'TEACH',
    'TASKS',
    'DESKTOP',
    'ACTIVITY',
    'ASSIGNMENTS',
    'TOOLS-AND-SKILLS',
  ].map((name) => `docs/${name}.md`),
]);
export function validatePackageInventory(pkg, files) {
  assert.equal(
    pkg.private,
    true,
    'npm publication remains disabled by this manifest.',
  );
  assert.equal(
    pkg.license,
    'MIT',
    'Use the owner-selected MIT code/skill license.',
  );
  const names = new Set(files.map((file) => file.path));
  assert.equal(names.size, files.length, 'Duplicate package paths.');
  for (const name of names) {
    const safe =
      !name.split('/').some((part) => part === '..' || part.startsWith('.')) &&
      (/^(src|runtime)\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.js$/.test(name) ||
        /^runtime\/[a-z0-9-]+\.(?:sh|py)$/.test(name) ||
        /^ui\/[a-z0-9-]+\.(?:js|html|css)$/.test(name) ||
        /^ui\/assets\/[a-z0-9-]+\.svg$/.test(name) ||
        /^skills\/sendtry-computer\/(?:SKILL\.md|LICENSE\.txt|agents\/openai\.yaml)$/.test(
          name,
        ));
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
