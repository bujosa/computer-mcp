import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { tools } from '../src/catalog.js';
import { activityAction } from '../runtime/audit-http.js';

// Every action the runtime can record must have a readable Activity title;
// otherwise the owner sees "Recorded action" instead of what happened.
test('every recorded Activity action has a console label', async () => {
  const app = await fs.readFile(
    new URL('../ui/app.js', import.meta.url),
    'utf8',
  );
  const start = app.indexOf('const actionNames = {');
  const block = app.slice(start, app.indexOf('\n};', start));
  const labels = new Set(
    [...block.matchAll(/'([a-z_.]+)':/g)].map((m) => m[1]),
  );
  const source = await fs.readFile(
    new URL('../runtime/audit-http.js', import.meta.url),
    'utf8',
  );
  const actions = new Set([
    // Literal actions returned by the HTTP mapping.
    ...[...source.matchAll(/'([a-z]+(?:\.[a-z_]+)+)'/g)].map((m) => m[1]),
    // Actions recorded outside the HTTP mapping.
    'runtime.start',
    'runtime.stop',
    'desktop.view',
    'desktop.control',
    'task.cancel',
    'task.verify',
  ]);
  for (const name of Object.keys(tools))
    for (const action of [
      undefined,
      'navigate',
      'click',
      'fill',
      'press',
      'scroll',
      'move',
      'type',
      'key',
    ])
      actions.add(
        activityAction({
          path: '/call',
          method: 'POST',
          kind: 'agent',
          body: { name, args: { action } },
        }),
      );
  actions.delete(null);
  const missing = [...actions].filter((action) => !labels.has(action));
  assert.deepEqual(missing, []);
});
