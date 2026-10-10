import { randomUUID } from 'node:crypto';
export class RuntimeClient {
  constructor(config) {
    this.config = config;
    this.sessionId = randomUUID();
    this.base = `http://127.0.0.1:${config.port}`;
  }
  async request(path, { body, signal, timeoutMs = 35000, operationId } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    try {
      const response = await fetch(this.base + path, {
        method: body === undefined ? 'GET' : 'POST',
        redirect: 'error',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.config.token}`,
          'x-session-id': this.sessionId,
          'x-computer-id': this.config.computerId,
          ...(operationId ? { 'x-operation-id': operationId } : {}),
          ...(this.config.workspaceId
            ? { 'x-workspace-id': this.config.workspaceId }
            : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      const value = await response.json();
      if (!response.ok) {
        const error = new Error(value.error || 'Runtime request failed.');
        error.code = value.code;
        throw error;
      }
      return value;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
  async info() {
    const info = await this.request('/api/info', { timeoutMs: 5000 });
    if (
      info.computerId !== this.config.computerId ||
      (this.config.workspaceId && info.workspaceId !== this.config.workspaceId)
    )
      throw new Error(
        'Pinned computer/workspace identity changed. Refusing this connection.',
      );
    return info;
  }
  async call(name, args = {}, signal) {
    await this.info();
    const operationId = randomUUID();
    const abort = () => {
      void this.request('/api/cancel', {
        body: { operationId },
        timeoutMs: 5000,
      }).catch(() => {});
    };
    signal?.addEventListener('abort', abort, { once: true });
    try {
      return (
        await this.request('/api/call', {
          body: { name, args },
          signal,
          operationId,
        })
      ).result;
    } finally {
      signal?.removeEventListener('abort', abort);
    }
  }
}
