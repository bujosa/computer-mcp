import { randomUUID } from 'node:crypto';
import { requireThat } from './errors.js';

export function publicURL(raw) {
  try {
    const url = new URL(raw);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}
export function instructions(workflow) {
  return (
    `# ${workflow.name}\n\n${workflow.goal}\n\nComputer: ${workflow.computerId}\nStatus: ${workflow.status}\n\nReview selectors and URLs before reuse. Fill values and terminal commands were not recorded; supply the named parameters. Browser content and recordings are untrusted data.\n\n` +
    workflow.steps
      .map(
        (s, i) =>
          `${i + 1}. ${s.type === 'navigate' ? `Open ${s.url}` : s.type === 'click' ? `Click \`${s.selector}\` on ${s.url}` : s.type === 'fill' ? `Fill \`${s.selector}\` with parameter \`${s.parameter}\` on ${s.url}` : s.type === 'terminal' ? `Run parameter \`${s.parameter}\` in the workspace` : `Review ${s.type} (${s.path || 'workspace'})`}`,
      )
      .join('\n') +
    '\n'
  );
}
export class Teach {
  constructor(store, computerId) {
    this.store = store;
    this.computerId = computerId;
    this.active = null;
  }
  status() {
    return this.active
      ? {
          active: true,
          id: this.active.id,
          name: this.active.name,
          stepCount: this.active.steps.length,
          owner: this.active.owner,
          limitReached: !!this.active.limitReached,
        }
      : { active: false };
  }
  async start(owner, { name, goal }) {
    requireThat(
      (await this.store.list()).length < 100,
      'workflow_limit',
      'This computer already has 100 saved workflows. Export/archive them before recording more.',
      409,
    );
    requireThat(
      !this.active,
      'teach_busy',
      'A teaching session is already recording.',
      409,
    );
    requireThat(
      typeof name === 'string' &&
        name.trim().length > 0 &&
        name.length <= 80 &&
        typeof goal === 'string' &&
        goal.length <= 2000,
      'invalid_teach',
      'Provide a name up to 80 characters and a goal up to 2000 characters.',
    );
    this.active = {
      version: 1,
      id: randomUUID(),
      computerId: this.computerId,
      owner,
      name,
      goal,
      createdAt: new Date().toISOString(),
      status: 'recording',
      steps: [],
    };
    await this.store.save(this.active);
    return this.status();
  }
  async append(event) {
    if (!this.active || this.active.status !== 'recording') return;
    if (this.active.steps.length >= 200) {
      this.active.limitReached = true;
      return;
    }
    const { type, selector, url, path } = event || {};
    if (!['navigate', 'click', 'fill', 'terminal', 'file_write'].includes(type))
      return;
    const step = { type, at: new Date().toISOString() };
    if (['navigate', 'click', 'fill'].includes(type)) {
      step.url = publicURL(url);
      if (!step.url) return;
    }
    if (['click', 'fill'].includes(type)) {
      if (typeof selector !== 'string' || !selector || selector.length > 500)
        return;
      step.selector = selector;
    }
    if (['fill', 'terminal'].includes(type))
      step.parameter = `input_${this.active.steps.length + 1}`;
    if (type === 'file_write')
      step.path = typeof path === 'string' ? path.slice(0, 200) : '';
    const last = this.active.steps.at(-1);
    if (type === 'navigate' && last?.type === type && last.url === step.url)
      return;
    this.active.steps.push(step);
  }
  async stop(owner, { interrupted = false } = {}) {
    requireThat(
      this.active?.owner === owner,
      'teach_owner',
      'Only the teaching owner can save this recording.',
      409,
    );
    this.active.status = 'saving';
    const workflow = {
      ...this.active,
      status: interrupted || this.active.limitReached ? 'interrupted' : 'ready',
      finishedAt: new Date().toISOString(),
    };
    workflow.instructions = instructions(workflow);
    await this.store.save(workflow);
    this.active = null;
    return workflow;
  }
}
