import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import { atomicJSON } from '../runtime/store.js';
import { computerSubnets } from './network.js';
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function statePath(name = 'my-computer', override) {
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(name))
    throw new Error(
      'Name must start with a lowercase letter and contain only lowercase letters, digits or hyphens (max 40).',
    );
  return path.resolve(
    override || path.join(os.homedir(), '.computer-mcp', 'computers', name),
  );
}
export async function setup(
  state,
  {
    name,
    context,
    port = 17670,
    network = 'isolated',
    subnet,
    legacyAccess = false,
  },
) {
  if (!['isolated', 'internet'].includes(network))
    throw new Error('Network must be isolated or internet.');
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('Port must be 1024–65535.');
  computerSubnets(subnet, network);
  if (typeof legacyAccess !== 'boolean')
    throw new Error('Legacy access must be a boolean.');
  await fs.mkdir(state, { recursive: true, mode: 0o700 });
  const config = {
    version: 1,
    name,
    computerId: randomUUID(),
    context,
    port,
    network,
    legacyAccess,
    ...(subnet === undefined ? {} : { subnet }),
    token: randomBytes(32).toString('hex'),
    ownerToken: randomBytes(32).toString('hex'),
    workspaceId: null,
  };
  await fs.writeFile(
    path.join(state, 'computer.json'),
    JSON.stringify(config, null, 2) + '\n',
    { flag: 'wx', mode: 0o600 },
  );
  return config;
}
export async function readConfig(state) {
  let config;
  try {
    config = JSON.parse(
      await fs.readFile(path.join(state, 'computer.json'), 'utf8'),
    );
  } catch {
    throw new Error(
      'Cannot read a valid computer config. Inspect its private state directory.',
    );
  }
  if (
    config.version !== 1 ||
    !['isolated', 'internet'].includes(config.network) ||
    !uuid.test(config.computerId) ||
    (config.workspaceId !== null && !uuid.test(config.workspaceId)) ||
    !/^[0-9a-f]{64}$/.test(config.token) ||
    !/^[0-9a-f]{64}$/.test(config.ownerToken) ||
    !Number.isInteger(config.port) ||
    config.port < 1024 ||
    config.port > 65535 ||
    typeof config.context !== 'string' ||
    !config.context ||
    !/^[a-z][a-z0-9-]{0,39}$/.test(config.name) ||
    (config.legacyAccess !== undefined &&
      typeof config.legacyAccess !== 'boolean')
  )
    throw new Error('Invalid local computer configuration.');
  computerSubnets(config.subnet, config.network);
  return config;
}
export async function saveConfig(state, config) {
  await atomicJSON(path.join(state, 'computer.json'), config);
}
