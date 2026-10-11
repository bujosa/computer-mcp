// Host-only catalog. Guests and MCP tools never select or create computers.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import * as z from 'zod';
import { atomicJSON } from '../runtime/store.js';
import { readConfig, setup, statePath } from './config.js';
import { RuntimeClient } from './client.js';

const registrySchema = z
  .object({
    version: z.literal(1),
    defaultComputerId: z.uuid().nullable(),
    computers: z
      .array(
        z
          .object({
            name: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
            computerId: z.uuid(),
            state: z
              .string()
              .max(4096)
              .refine((value) => path.isAbsolute(value)),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
export const catalogRoot = (override) =>
  path.resolve(override || path.join(os.homedir(), '.computer-mcp'));
export async function readRegistry(root) {
  let data;
  try {
    data = JSON.parse(
      await fs.readFile(path.join(root, 'registry.json'), 'utf8'),
    );
  } catch (error) {
    if (error.code === 'ENOENT')
      return { version: 1, defaultComputerId: null, computers: [] };
    throw new Error(
      'Cannot read the computer catalog. Inspect registry.json; it will not be reset automatically.',
      { cause: error },
    );
  }
  const parsed = registrySchema.safeParse(data);
  if (!parsed.success)
    throw new Error('Invalid computer catalog. Inspect registry.json.');
  for (const key of ['name', 'computerId', 'state'])
    if (
      new Set(data.computers.map((entry) => entry[key])).size !==
      data.computers.length
    )
      throw new Error('Duplicate identities in the computer catalog.');
  if (
    (data.computers.length === 0) !== (data.defaultComputerId === null) ||
    (data.defaultComputerId &&
      !data.computers.some(
        (entry) => entry.computerId === data.defaultComputerId,
      ))
  )
    throw new Error(
      'The catalog default does not identify a registered computer.',
    );
  return data;
}
async function updateRegistry(root, fn) {
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  const lock = path.join(root, 'registry.lock');
  try {
    await fs.mkdir(lock, { mode: 0o700 });
  } catch (error) {
    if (error.code === 'EEXIST')
      throw new Error(
        'Another catalog command is running. After a crash, inspect it before manually removing registry.lock.',
        { cause: error },
      );
    throw error;
  }
  try {
    const registry = await readRegistry(root);
    const result = await fn(registry);
    registrySchema.parse(registry);
    await atomicJSON(path.join(root, 'registry.json'), registry);
    return result;
  } finally {
    await fs.rmdir(lock);
  }
}
export async function pinnedConfig(entry) {
  const config = await readConfig(entry.state);
  if (
    config.computerId !== entry.computerId ||
    config.name !== entry.name ||
    (await fs.realpath(entry.state)) !== entry.state
  )
    throw new Error(
      'Registered computer identity/path changed. Refusing to retarget it.',
    );
  return config;
}
function append(registry, entry) {
  const same = registry.computers.find(
    (item) =>
      item.computerId === entry.computerId ||
      item.name === entry.name ||
      item.state === entry.state,
  );
  if (same) {
    if (
      same.name === entry.name &&
      same.state === entry.state &&
      same.computerId === entry.computerId
    )
      return;
    throw new Error(
      'Computer name, identity or state is already registered to a different computer.',
    );
  }
  if (registry.computers.length >= 100)
    throw new Error('Computer catalog is limited to 100 entries.');
  registry.computers.push(entry);
  registry.defaultComputerId ||= entry.computerId;
}
async function reservedPorts(registry) {
  const ports = new Set();
  for (const entry of registry.computers)
    ports.add((await pinnedConfig(entry)).port);
  return ports;
}
async function freePort(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (error) =>
      error.code === 'EADDRINUSE' || error.code === 'EACCES'
        ? resolve(false)
        : reject(error),
    );
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () =>
      server.close(() => resolve(true)),
    );
  });
}
export async function createComputer(root, options, override) {
  return updateRegistry(root, async (registry) => {
    const state = statePath(
      options.name,
      override || path.join(root, 'computers', options.name),
    );
    if (registry.computers.length >= 100)
      throw new Error('Computer catalog is limited to 100 entries.');
    if (registry.computers.some((entry) => entry.name === options.name))
      throw new Error(
        'That computer name already exists. Choose another name or start it.',
      );
    const reserved = await reservedPorts(registry);
    let port = options.port;
    if (port !== undefined) {
      if (!Number.isInteger(port) || port < 1024 || port > 65535)
        throw new Error('Port must be 1024–65535.');
      if (reserved.has(port) || !(await freePort(port)))
        throw new Error(
          'Port is reserved or in use. Choose another port; the existing listener will not be changed.',
        );
    } else {
      for (port = 17670; port <= 17925; port++)
        if (!reserved.has(port) && (await freePort(port))) break;
      if (port > 17925)
        throw new Error(
          'No free console port found. Choose --port explicitly.',
        );
    }
    const config = await setup(state, { ...options, port });
    const entry = {
      name: config.name,
      computerId: config.computerId,
      state: await fs.realpath(state),
    };
    append(registry, entry);
    return {
      config,
      state: entry.state,
      isDefault: registry.defaultComputerId === config.computerId,
    };
  });
}
export async function registerComputer(root, state) {
  const canonical = await fs.realpath(path.resolve(state));
  const config = await readConfig(canonical);
  return updateRegistry(root, async (registry) => {
    const entry = {
      name: config.name,
      computerId: config.computerId,
      state: canonical,
    };
    const reserved = await reservedPorts({
      ...registry,
      computers: registry.computers.filter(
        (item) => item.computerId !== config.computerId,
      ),
    });
    if (reserved.has(config.port))
      throw new Error(
        'Another registered computer reserves that console port.',
      );
    append(registry, entry);
    return {
      config,
      state: canonical,
      isDefault: registry.defaultComputerId === config.computerId,
    };
  });
}
export async function useComputer(root, name) {
  return updateRegistry(root, async (registry) => {
    const entry = registry.computers.find((item) => item.name === name);
    if (!entry)
      throw new Error(
        'Computer is not registered. Run list or register --state first.',
      );
    await pinnedConfig(entry);
    registry.defaultComputerId = entry.computerId;
    return entry;
  });
}
export async function resolveComputer(root, { name, state } = {}) {
  if (state) {
    const resolved = await fs.realpath(path.resolve(state));
    const config = await readConfig(resolved);
    if (name && name !== config.name)
      throw new Error('--name does not match the selected --state.');
    return { state: resolved, config };
  }
  const registry = await readRegistry(root);
  const entry = name
    ? registry.computers.find((item) => item.name === name)
    : registry.computers.find(
        (item) => item.computerId === registry.defaultComputerId,
      );
  if (entry) return { state: entry.state, config: await pinnedConfig(entry) };
  // Version-1 checkouts did not have a registry. Resolve their known path only;
  // never scan arbitrary host directories or create a computer implicitly.
  const legacy = statePath(
    name || 'my-computer',
    path.join(root, 'computers', name || 'my-computer'),
  );
  try {
    const config = await readConfig(legacy);
    if (config.name !== (name || 'my-computer'))
      throw new Error('Legacy computer name does not match its selected path.');
    return { state: await fs.realpath(legacy), config };
  } catch (error) {
    if (error.code === 'ENOENT')
      throw new Error(
        'No selected computer. Run init, list, or register --state /existing/private/state.',
        { cause: error },
      );
    throw error;
  }
}
export async function computerStatus(state, config, isDefault = false) {
  const summary = {
    name: config.name,
    computerId: config.computerId,
    workspaceId: config.workspaceId,
    state,
    context: config.context,
    port: config.port,
    network: config.network,
    isDefault,
    status: 'unreachable',
    control: null,
  };
  try {
    const info = await new RuntimeClient(config).info({ timeoutMs: 1500 });
    if (!config.workspaceId) return { ...summary, status: 'needs-start' };
    return {
      ...summary,
      status: info.lease ? 'busy' : 'ready',
      control: info.lease?.kind || null,
      info,
    };
  } catch (error) {
    if (error.status === 503 && error.code === 'not_ready')
      return {
        ...summary,
        status: 'starting',
        reason: 'Runtime reports that this computer is still starting.',
      };
    const rejected =
      error.status ||
      ['identity_mismatch', 'workspace_mismatch', 'computer_mismatch'].includes(
        error.code,
      );
    return {
      ...summary,
      status: rejected ? 'error' : 'unreachable',
      reason: rejected
        ? 'Runtime rejected the pinned identity or credentials.'
        : 'Not reachable. It may be stopped, starting, or Docker may be unavailable.',
    };
  }
}
export async function listComputers(root) {
  const registry = await readRegistry(root);
  const result = new Array(registry.computers.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, result.length) }, async () => {
      for (let index = next++; index < result.length; index = next++) {
        const entry = registry.computers[index];
        try {
          result[index] = await computerStatus(
            entry.state,
            await pinnedConfig(entry),
            entry.computerId === registry.defaultComputerId,
          );
        } catch {
          result[index] = {
            ...entry,
            isDefault: entry.computerId === registry.defaultComputerId,
            status: 'error',
            control: null,
            reason:
              'Registered identity, path or private configuration is invalid.',
          };
        }
      }
    }),
  );
  return result;
}
