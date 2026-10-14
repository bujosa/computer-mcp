import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

// noVNC 1.6.0's WebCodecs capability probe leaks its test frame and decoder.
// Keep the patch explicit and fail if upstream changes; never edit node_modules.
const noVncProbeCleanup = {
  name: 'novnc-probe-cleanup',
  setup(builder) {
    builder.onLoad(
      { filter: /[/\\]@novnc[/\\]novnc[/\\]core[/\\]util[/\\]browser\.js$/ },
      async ({ path }) => {
        let contents = await readFile(path, 'utf8');
        const replacements = [
          [
            'output: (frame) => { gotframe = true; },',
            'output: (frame) => { gotframe = true; frame.close(); },',
          ],
          [
            'decoder.configure(config);\n    decoder.decode(chunk);\n    try {\n        await decoder.flush();',
            'try {\n        decoder.configure(config);\n        decoder.decode(chunk);\n        await decoder.flush();',
          ],
          [
            'error = e;\n    }\n\n    // Firefox fails to deliver',
            "error = e;\n    } finally {\n        if (decoder.state !== 'closed') decoder.close();\n    }\n\n    // Firefox fails to deliver",
          ],
        ];
        for (const [before, after] of replacements) {
          if (contents.split(before).length !== 2)
            throw new Error(
              'noVNC probe changed; review the 1.6.0 cleanup patch.',
            );
          contents = contents.replace(before, after);
        }
        return { contents, loader: 'js' };
      },
    );
  },
};
await build({
  entryPoints: ['src/task-request.js'],
  outfile: 'ui/vendor/task-request.js',
  bundle: true,
  format: 'esm',
  minify: true,
});
await build({
  entryPoints: ['src/skill-use.js'],
  outfile: 'ui/vendor/skill-use.js',
  bundle: true,
  format: 'esm',
  minify: true,
});
await build({
  entryPoints: ['node_modules/@novnc/novnc/core/rfb.js'],
  outfile: 'ui/vendor/rfb.js',
  bundle: true,
  format: 'esm',
  minify: true,
  plugins: [noVncProbeCleanup],
  banner: {
    js: '/* noVNC 1.6.0 — MPL-2.0. Source/license: https://github.com/novnc/noVNC/tree/v1.6.0 ; local WebCodecs probe cleanup: scripts/build-ui.mjs */',
  },
});
