import { randomUUID } from 'node:crypto';
export class RuntimeClient {
  constructor(config, { source = 'api', owner = false } = {}) {
    this.config = config;
    this.sessionId = randomUUID();
    this.base = `http://127.0.0.1:${config.port}`;
    this.source = source;
    this.owner = owner;
  }
  async request(path, options = {}) {
    if (this.owner && !/^\/api\/owner\/[a-z0-9/-]+$/.test(path))
      throw new Error('Owner clients may only request owner endpoints.');
    return this.#request(
      path,
      options,
      this.owner ? this.config.ownerToken : this.config.token,
    );
  }
  async #request(
    path,
    { body, signal, timeoutMs = 35000, operationId, client } = {},
    token,
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
          authorization: `Bearer ${token}`,
          'x-session-id': this.sessionId,
          'x-computer-id': this.config.computerId,
          'x-audit-client': JSON.stringify(client || { source: this.source }),
          ...(operationId ? { 'x-operation-id': operationId } : {}),
          ...(this.config.connectionId
            ? { 'x-connection-id': this.config.connectionId }
            : {}),
          ...(this.config.workspaceId
            ? { 'x-workspace-id': this.config.workspaceId }
            : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      let value;
      try {
        value = await response.json();
      } catch {
        if (response.ok)
          throw new Error('Runtime returned an invalid response.');
      }
      if (!response.ok) {
        const code =
          typeof value?.code === 'string' &&
          /^[a-z][a-z0-9_]{0,62}$/.test(value.code)
            ? value.code
            : undefined;
        const messages = {
          legacy_access_disabled:
            'Legacy shared access is disabled. Ask the owner to create a named connection with connection create.',
          connection_revoked:
            'This named connection was revoked. Ask the owner for a new connection.',
          connection_required:
            'A named connection is required. Ask the owner to create one with connection create.',
          owner_required:
            'The runtime requires owner credentials for this operation.',
          not_ready: 'Computer is still starting.',
          computer_mismatch:
            'Pinned computer identity changed. Refusing this connection.',
          workspace_mismatch:
            'Pinned workspace identity changed. Refusing this connection.',
        };
        const error = new Error(
          messages[code] ||
            (this.owner || this.config.connectionId
              ? response.status === 404
                ? 'Connection management is unavailable. Rebuild the selected computer with start --rebuild.'
                : 'Runtime rejected this connection request.'
              : typeof value?.error === 'string'
                ? value.error
                : 'Runtime request failed.'),
        );
        error.code = code;
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
    let info;
    try {
      info = await this.request(this.owner ? '/api/owner/info' : '/api/info', {
        timeoutMs,
        client,
      });
    } catch (error) {
      if (
        !this.owner ||
        error.code === 'owner_required' ||
        !(
          error.status === 404 ||
          (error.status === 401 && error.code === 'unauthorized')
        )
      )
        throw error;
      // Old guests have no owner-info route. This narrow, observation-only
      // fallback never applies to management, effect calls or arbitrary routes.
      info = await this.#request(
        '/api/info',
        { timeoutMs, client },
        this.config.token,
      );
    }
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
    if (
      this.config.connectionId &&
      (info.connection?.id !== this.config.connectionId ||
        info.connection?.access !== this.config.access)
    ) {
      const error = new Error(
        'Named connection identity or access is unsupported or changed. Refusing this connection; ask the owner to rebuild the selected computer or create a new named connection.',
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
