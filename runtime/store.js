import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { requireThat } from './errors.js';

export async function atomicJSON(target, value) {
  const temporary = `${target}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2) + '\n', {
    mode: 0o600,
    flag: 'wx',
  });
  await fs.rename(temporary, target);
}
export class Store {
  constructor(root) {
    this.root = root;
    this.pending = Promise.resolve();
  }
  async init(computerId) {
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    await fs.mkdir(path.join(this.root, 'workflows'), {
      recursive: true,
      mode: 0o700,
    });
    const file = path.join(this.root, 'identity.json');
    let identity;
    try {
      identity = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      identity = {
        version: 1,
        computerId,
        workspaceId: randomUUID(),
        createdAt: new Date().toISOString(),
      };
      await atomicJSON(file, identity);
    }
    requireThat(
      identity.computerId === computerId && identity.version === 1,
      'identity_mismatch',
      'Volume belongs to another computer or incompatible schema.',
      409,
    );
    return identity;
  }
  workflowPath(id) {
    requireThat(
      typeof id === 'string' && /^[0-9a-f-]{36}$/.test(id),
      'invalid_workflow',
      'Invalid workflow ID.',
    );
    return path.join(this.root, 'workflows', `${id}.json`);
  }
  async save(workflow) {
    const snapshot = structuredClone(workflow);
    const write = this.pending
      .catch(() => {})
      .then(() => atomicJSON(this.workflowPath(snapshot.id), snapshot));
    this.pending = write;
    await write;
  }
  async get(id) {
    return JSON.parse(await fs.readFile(this.workflowPath(id), 'utf8'));
  }
  async update(id, transform) {
    const write = this.pending
      .catch(() => {})
      .then(async () => {
        const next = await transform(await this.get(id));
        await atomicJSON(this.workflowPath(id), next);
        return next;
      });
    this.pending = write;
    return write;
  }
  async list() {
    const names = await fs.readdir(path.join(this.root, 'workflows'));
    const workflows = await Promise.all(
      names
        .filter((n) => /^[0-9a-f-]{36}\.json$/.test(n))
        .slice(0, 100)
        .map((n) => this.get(n.slice(0, -5))),
    );
    return workflows.map((w) => ({
      id: w.id,
      name: w.name,
      createdAt: w.createdAt,
      stepCount: w.steps.length,
      status: w.status,
      reviewed: !!w.review && !w.draft,
      proposed: !!w.draft,
      analysisEnabled: !!w.analysis?.enabled,
      revision: w.revision || w.id,
      video: w.video ? { status: w.video.status } : undefined,
    }));
  }
}
