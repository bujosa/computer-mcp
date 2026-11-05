import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export const requiredPackageFiles = [
  'package.json',
  'LICENSE',
  'TRADEMARKS.md',
  'THIRD_PARTY_NOTICES.md',
  'npm-shrinkwrap.json',
  '.dockerignore',
  'src/atomic-json.js',
  'CONTRIBUTING.md',
  'arquitecture.md',
  'ui/assets/README.md',
  'docs/ADAPTERS.md',
  'docs/ASSIGNMENT-VALIDATION.md',
  'docs/CLIENT-VALIDATION.md',
  'docs/REAL-CLIENT-VALIDATION.md',
  'docs/DESIGN-DIRECTION.md',
  'docs/DESIGN-REVIEW.md',
  'docs/DISTRIBUTION.md',
  'docs/GROK-COMPARISON.md',
  'docs/HARNESS-VALIDATION.md',
  'docs/HOST-VALIDATION.md',
  'docs/INTEGRATION.md',
  'docs/LEARNING-DESIGN.md',
  'docs/LEARNING-EVALUATION.md',
  'docs/LOCAL-REVIEW.md',
  'docs/MARKET.md',
  'docs/MCP-READINESS-VALIDATION.md',
  'docs/PREVIEW-CLOSEOUT.md',
  'docs/PRODUCT.md',
  'docs/PUBLIC-LAUNCH.md',
  'docs/PUBLIC-PREVIEW-REVIEW.md',
  'docs/QA.md',
  'docs/READINESS.md',
  'docs/REUSE.md',
  'docs/VALIDATION.md',
  'docs/registry/server.template.json',
  'docs/research/distribution-20261014.json',
  'docs/research/github-20261012.json',
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
  'runtime/shell.js',
  'runtime/shell/tint2rc',
  'runtime/shell/openbox-rc.xml',
  'runtime/shell/bin/owner-only',
  'runtime/shell/wallpaper.png',
  'scripts/build-ui.mjs',
  'ui/index.html',
  'docs/README.md',
  'docs/WALKTHROUGH.md',
  'docs/OPERATIONS.md',
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
    pkg.name,
    '@sendtry/computer-mcp',
    'Use the official @sendtry/computer-mcp package scope.',
  );
  assert.equal(
    pkg.bin?.['computer-mcp'],
    'src/cli.js',
    'Expose the computer-mcp CLI binary.',
  );
  assert.equal(
    pkg.publishConfig?.access,
    'public',
    'Configure public access for future scoped npm releases.',
  );
  assert.equal(
    pkg.private,
    false,
    'Enable public npm package manifest under @sendtry/computer-mcp.',
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
        /^runtime\/shell\/(?:tint2rc|openbox-rc\.xml|terminalrc|bashrc|wallpaper\.png|theme\/openbox-3\/themerc|apps\/[a-z]+\.desktop|icons\/[a-z]+\.png|bin\/[a-z-]+)$/.test(
          name,
        ) ||
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

// Check the inline relative links used by the shipped public Markdown files.
export async function validatePackageDocumentation(root, files) {
  const names = new Set(files.map((file) => file.path));
  let links = 0;
  for (const file of names) {
    if (!file.endsWith('.md')) continue;
    const markdown = await fs.readFile(path.join(root, file), 'utf8');
    for (const match of markdown.matchAll(/!?\[[^\]\n]*\]\(([^\s)]+)\)/g)) {
      const target = match[1];
      if (/^[a-z][a-z0-9+.-]*:|^#|^\/\//i.test(target)) continue;
      const destination = path.posix.normalize(
        path.posix.join(
          path.posix.dirname(file),
          decodeURIComponent(target.split(/[?#]/)[0]),
        ),
      );
      assert.ok(
        names.has(destination),
        `Missing package documentation target: ${file} -> ${destination}`,
      );
      links++;
    }
  }
  return { documentationLinks: links };
}
