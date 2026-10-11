import { randomUUID } from 'node:crypto';
import { requireThat } from './errors.js';

// One runtime owns the lease; process restart invalidates every old session.
export class Lease {
  constructor({
    ttl = 90000,
    now = () => Date.now(),
    onChange = () => {},
  } = {}) {
    this.ttl = ttl;
    this.now = now;
    this.onChange = onChange;
    this.current = null;
    this.active = null;
    this.taking = false;
  }
  status() {
    if (this.current && this.current.expiresAt <= this.now())
      this.revoke('expired');
    return (
      this.current && {
        owner: this.current.owner,
        kind: this.current.kind,
        generation: this.current.generation,
        expiresAt: new Date(this.current.expiresAt).toISOString(),
      }
    );
  }
  claim(owner, kind, { takeover = false } = {}) {
    this.status();
    requireThat(
      !this.taking,
      'operation_busy',
      'Control is still changing.',
      409,
    );
    requireThat(
      !this.active || (this.current?.owner === owner && !takeover),
      'operation_busy',
      'Previous input is still finishing. Wait before acquiring control.',
      409,
    );
    requireThat(
      !this.current ||
        this.current.owner === owner ||
        (kind === 'human' && takeover),
      'computer_busy',
      'Computer is controlled by another session. The human can take control.',
      409,
    );
    if (this.current?.owner === owner) {
      this.renew(owner);
      return this.status();
    }
    const current = {
      owner,
      kind,
      generation: randomUUID(),
      expiresAt: this.now() + this.ttl,
    };
    this.onChange(this.current, current, takeover ? 'takeover' : 'acquired');
    this.active?.controller.abort();
    this.current = current;
    return this.status();
  }
  async take(owner, onRevoke = () => {}) {
    requireThat(
      !this.taking,
      'operation_busy',
      'Control is still changing.',
      409,
    );
    this.taking = true;
    try {
      const pending = this.active?.done;
      try {
        this.revoke('takeover');
      } finally {
        onRevoke();
      }
      if (pending) await pending;
      // No await between unlocking and grant. Acquires during cleanup fail;
      // the new actor never gets an RFB authority before the old input drains.
      this.taking = false;
      return this.claim(owner, 'human', { takeover: true });
    } finally {
      this.taking = false;
    }
  }
  assert(owner) {
    this.status();
    requireThat(
      this.current?.owner === owner,
      'lease_required',
      'Acquire control before changing this computer.',
      409,
    );
    return this.current;
  }
  renew(owner) {
    const previous = this.assert(owner);
    const current = { ...previous, expiresAt: this.now() + this.ttl };
    this.onChange(previous, current, 'renewed');
    this.current = current;
    return this.status();
  }
  release(owner) {
    this.assert(owner);
    this.revoke();
  }
  revoke(reason = 'released') {
    try {
      if (this.current) this.onChange(this.current, null, reason);
    } finally {
      this.active?.controller.abort();
      this.current = null;
    }
  }
  async run(owner, fn, operationId, signal) {
    const lease = this.assert(owner);
    requireThat(!signal?.aborted, 'cancelled', 'Operation cancelled.');
    requireThat(
      !this.active,
      'operation_busy',
      'An operation is still finishing. Retry after it completes.',
      409,
    );
    let finished;
    const done = new Promise((resolve) => {
      finished = resolve;
    });
    const active = {
      controller: new AbortController(),
      generation: lease.generation,
      owner,
      operationId,
      done,
    };
    this.active = active;
    const abort = () => active.controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    try {
      const result = await fn(active.controller.signal);
      requireThat(
        !active.controller.signal.aborted &&
          this.assert(owner).generation === active.generation,
        'lease_lost',
        'Control changed while the operation was running. Inspect the computer before retrying.',
        409,
      );
      return result;
    } finally {
      signal?.removeEventListener('abort', abort);
      if (this.active === active) this.active = null;
      finished();
    }
  }
}
