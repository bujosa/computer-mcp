import js from '@eslint/js';
import globals from 'globals';
export default [
  {
    ignores: [
      'node_modules/**',
      'artifacts/**',
      'ui/vendor/**',
      '.computer-mcp/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { globals: globals.node },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  {
    files: ['runtime/browser.js'],
    languageOptions: { globals: globals.browser },
  },
  { files: ['runtime/files.js'], rules: { 'no-control-regex': 'off' } },
  {
    files: ['ui/**/*.js', 'runtime/recorder.js'],
    languageOptions: { globals: globals.browser },
  },
];
