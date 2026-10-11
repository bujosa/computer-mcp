import { randomUUID } from 'node:crypto';
export class RuntimeClient {
  constructor(config, { source = 'api' } = {}) {
    this.config = config;
    this.sessionId = randomUUID();
    this.base = `http://127.0.0.1:${config.port}`;
    this.source = source;
  }
  async request(
    path,
    { body, signal, timeoutMs = 35000, operationId, client } = {},
  ) {
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
          'x-audit-client': JSON.stringify(client || { source: this.source }),
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
        error.status = response.status;
        throw error;
      }
      return value;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
  async info({ timeoutMs = 5000, client } = {}) {
    const info = await this.request('/api/info', { timeoutMs, client });
    if (
      !info ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        info.workspaceId,
      ) ||
      info.computerId !== this.config.computerId ||
      (this.config.workspaceId && info.workspaceId !== this.config.workspaceId)
    ) {
      const error = new Error(
        'Pinned computer/workspace identity changed. Refusing this connection.',
      );
      error.code = 'identity_mismatch';
      throw error;
    }
    return info;
  }
  async call(name, args = {}, signal, client) {
    await this.info({ client });
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
          client,
        })
      ).result;
    } finally {
      signal?.removeEventListener('abort', abort);
    }
  }
  async endSession() {
    return this.request('/api/session/end', { body: {}, timeoutMs: 5000 });
  }
}
