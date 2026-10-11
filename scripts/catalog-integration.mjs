// Real host catalog + MCP contract check. Requires two explicitly owned, running PCs.
import assert from 'node:assert/strict';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import {
  resolveComputer,
  readRegistry,
  listComputers,
  useComputer,
} from '../src/computers.js';
import { RuntimeClient } from '../src/client.js';
import { checkDocker, checkOwned } from '../src/docker.js';
import { catalogManagement, ownerConnection } from '../src/connection.js';

const [rootArgument, firstName, secondName] = process.argv.slice(2);
assert.ok(
  rootArgument && firstName && secondName && firstName !== secondName,
  'Usage: node scripts/catalog-integration.mjs <catalog-root> <first-name> <second-name>',
);
const root = path.resolve(rootArgument),
  cli = path.resolve('src/cli.js');
const exec = promisify(execFile);
const run = async (args) =>
  (
    await exec(process.execPath, [cli, ...args, '--root', root], {
      timeout: 30000,
    })
  ).stdout;
const original = await readRegistry(root);
const originalDefault = original.computers.find(
  (pc) => pc.computerId === original.defaultComputerId,
).name;
const first = await resolveComputer(root, { name: firstName }),
  second = await resolveComputer(root, { name: secondName });
for (const pc of [first, second]) {
  await checkDocker(pc.config);
  assert.equal(await checkOwned(pc.config), true);
}
const firstAPI = new RuntimeClient(first.config),
  secondAPI = new RuntimeClient(second.config);
const beforeFirst = await firstAPI.info(),
  beforeSecond = await secondAPI.info();
assert.equal(
  beforeFirst.lease,
  null,
  'Use an idle owned QA computer; no takeover occurs.',
);
assert.equal(
  beforeSecond.lease,
  null,
  'Use an idle owned QA computer; no takeover occurs.',
);
assert.notEqual(beforeFirst.computerId, beforeSecond.computerId);
assert.notEqual(beforeFirst.workspaceId, beforeSecond.workspaceId);
const client = new Client({ name: 'catalog-contract', version: '0.1.0' });
const marker = `catalog-proof-${randomUUID()}.txt`;
let connected = false;
try {
  await run(['use', firstName]);
  const entry = JSON.parse(await run(['config'])).mcpServers.computer;
  assert.equal(entry.args[3], first.state);
  await run(['use', secondName]);
  assert.equal((await resolveComputer(root)).state, second.state);
  await client.connect(new StdioClientTransport({ ...entry, stderr: 'pipe' }));
  connected = true;
  const tool = async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError, JSON.stringify(result));
    return JSON.parse(result.content[0].text);
  };
  assert.equal(
    (await tool('computer_info')).computerId,
    first.config.computerId,
    'Changing the default must not retarget a generated MCP connection.',
  );
  await tool('control_acquire');
  await secondAPI.call('control_acquire');
  const occupied = await listComputers(root);
  assert.equal(occupied.find((pc) => pc.name === firstName).status, 'busy');
  assert.equal(occupied.find((pc) => pc.name === secondName).status, 'busy');
  const held = (await firstAPI.info()).lease;
  await run(['start', '--name', firstName]);
  const after = await firstAPI.info();
  assert.equal(
    after.bootId,
    beforeFirst.bootId,
    'Repeated start must not restart a ready guest.',
  );
  assert.equal(
    after.lease.generation,
    held.generation,
    'Repeated start must preserve control.',
  );
  await tool('files_write', { path: marker, text: 'first computer only\n' });
  await assert.rejects(secondAPI.call('files_read', { path: marker }));
  await secondAPI.call('files_write', {
    path: marker,
    text: 'second computer only\n',
  });
  assert.equal(
    (await tool('files_read', { path: marker })).text,
    'first computer only\n',
  );
  assert.equal(
    (await secondAPI.call('files_read', { path: marker })).text,
    'second computer only\n',
  );
  const management = catalogManagement(
    root,
    await readRegistry(root),
    first.config,
  );
  const connection = ownerConnection(
    first.state,
    first.config,
    management,
    root,
  );
  const ticketResponse = await fetch(firstAPI.base + '/api/owner/ticket', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${first.config.ownerToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ connection }),
  });
  assert.equal(ticketResponse.status, 200);
  const session = await fetch(firstAPI.base + '/api/ui/session', {
    method: 'POST',
    headers: { origin: firstAPI.base, 'content-type': 'application/json' },
    body: JSON.stringify(await ticketResponse.json()),
  });
  assert.equal(session.status, 200);
  const metadata = await fetch(firstAPI.base + '/api/ui/connection', {
    headers: { cookie: session.headers.get('set-cookie').split(';')[0] },
  });
  assert.deepEqual((await metadata.json()).connection, connection);
  await assert.rejects(firstAPI.request('/api/ui/connection'), {
    code: 'human_only',
  });
  await tool('control_release');
  await secondAPI.call('control_release');
  assert.equal((await firstAPI.info()).lease, null);
  assert.equal((await secondAPI.info()).lease, null);
  process.stdout.write(
    'Passed: real default switching, pinned stdio, independent leases/files, idempotent start, owner-only catalog metadata.\n',
  );
} finally {
  if (connected) await client.close();
  await secondAPI.call('control_release').catch(() => {});
  await useComputer(root, originalDefault);
}
