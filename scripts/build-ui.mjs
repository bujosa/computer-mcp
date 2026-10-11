import { build } from 'esbuild';
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
  banner: {
    js: '/* noVNC 1.6.0 — MPL-2.0. Source/license: https://github.com/novnc/noVNC/tree/v1.6.0 */',
  },
});
