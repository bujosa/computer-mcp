import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { auditClientSchema } from '../src/audit-contract.js';
import {
  connectionCreateSchema,
  interruptionReasonSchema,
  taskCancelSchema,
  taskCreateSchema,
  taskFinishSchema,
  taskVerifySchema,
} from '../src/operations-contract.js';
import { Fault, requireThat } from './errors.js';

export const operationsLimits = Object.freeze({
  connections: 100,
  presence: 256,
  tasks: 500,
  attempts: 500,
  days: 90,
  list: 100,
  presenceWriteMs: 30000,
  databaseBytes: 16 * 1024 * 1024,
});

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const actor =
  /^(agent|human):[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const terminal = new Set([
  'reported_success',
  'failed',
  'interrupted',
  'cancelled',
]);
const iso = (value) => (value === null ? null : new Date(value).toISOString());
const hash = (domain, value) =>
  createHash('sha256').update(`${domain}\0`).update(value).digest('hex');

function validated(schema, value, code, message) {
  const result = schema.safeParse(value);
  requireThat(result.success, code, message);
  return result.data;
}

function requireActor(value, kind) {
  const match = actor.exec(value || '');
  requireThat(
    match && (!kind || match[1] === kind),
    kind === 'human' ? 'owner_required' : 'session_required',
    kind === 'human'
      ? 'Local owner authority is required.'
      : 'A valid agent session is required.',
    kind === 'human' ? 403 : 401,
  );
  return value;
}

function requireUuid(value, code = 'invalid_identity') {
  requireThat(uuid.test(value || ''), code, 'A valid identity is required.');
  return value;
}

export function actorForConnection(connectionId, sessionId) {
  requireUuid(connectionId);
  requireUuid(sessionId);
  const bytes = createHash('sha256')
    .update('computer-mcp:connection-actor:v1\0')
    .update(connectionId)
    .update('\0')
    .update(sessionId)
    .digest()
    .subarray(0, 16);
  // UUIDv8 identifies this as an application-defined, deterministic UUID.
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = bytes.toString('hex');
  return `agent:${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function actorForLegacy(secret, sessionId) {
  requireThat(
    /^[0-9a-f]{64}$/.test(secret || ''),
    'invalid_legacy_credential',
    'A valid legacy credential is required.',
    401,
  );
  requireUuid(sessionId);
  const bytes = createHmac('sha256', secret)
    .update('computer-mcp:legacy-actor:v1\0')
    .update(sessionId)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = bytes.toString('hex');
  return `agent:${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export class Operations {
  constructor(
    root,
    identity,
    { now = Date.now, limits = {}, legacyEnabled = true } = {},
  ) {
    this.root = root;
    this.identity = identity;
    this.now = now;
    this.limits = { ...operationsLimits, ...limits };
    this.initialLegacyEnabled = legacyEnabled;
    this.healthy = true;
    this.closed = false;
    this.onFailure = () => {};
    for (const [name, value] of Object.entries(this.limits))
      requireThat(
        Number.isInteger(value) && value > 0,
        'invalid_operations_limits',
        `Invalid Operations limit: ${name}.`,
      );
    requireThat(
      identity &&
        uuid.test(identity.computerId || '') &&
        uuid.test(identity.workspaceId || '') &&
        uuid.test(identity.bootId || ''),
      'invalid_identity',
      'Operations requires valid computer, workspace and boot identities.',
    );
    requireThat(
      typeof legacyEnabled === 'boolean',
      'invalid_legacy_policy',
      'Legacy access policy must be enabled or disabled.',
    );
  }

  async init() {
    try {
      await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
      await fs.chmod(this.root, 0o700);
      const filename = path.join(this.root, 'operations.sqlite');
      this.db = new DatabaseSync(filename);
      await fs.chmod(filename, 0o600);
      this.db.exec('PRAGMA foreign_keys=ON;');
      this.db.exec('PRAGMA journal_mode=DELETE;');
      this.db.exec('PRAGMA synchronous=FULL;');
      this.db.exec('PRAGMA busy_timeout=1000;');
      const pageSize = Number(
        this.db.prepare('PRAGMA page_size').get().page_size,
      );
      const pages = Math.max(
        1,
        Math.floor(this.limits.databaseBytes / pageSize),
      );
      this.db.exec(`PRAGMA max_page_count=${pages};`);
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS connections (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL UNIQUE,
          access TEXT NOT NULL CHECK(access IN ('read','work')),
          secret_hash TEXT NOT NULL UNIQUE,
          created INTEGER NOT NULL,
          created_by TEXT NOT NULL,
          revoked INTEGER,
          revoked_by TEXT
        );
        CREATE TABLE IF NOT EXISTS presence (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
          actor TEXT NOT NULL,
          boot TEXT NOT NULL,
          source TEXT NOT NULL,
          client TEXT,
          version TEXT,
          protocol TEXT,
          first_seen INTEGER NOT NULL,
          last_seen INTEGER NOT NULL,
          ended INTEGER,
          reason TEXT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS presence_open_actor
          ON presence(actor,boot) WHERE ended IS NULL;
        CREATE INDEX IF NOT EXISTS presence_connection
          ON presence(connection_id,last_seen DESC);
        CREATE INDEX IF NOT EXISTS presence_actor
          ON presence(actor,id DESC);
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL,
          request_owner TEXT NOT NULL,
          payload_hash TEXT NOT NULL,
          revision INTEGER NOT NULL,
          computer_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          connection_id TEXT NOT NULL REFERENCES connections(id),
          name TEXT NOT NULL,
          goal TEXT NOT NULL,
          expected_result TEXT NOT NULL,
          scope TEXT NOT NULL,
          workflow_id TEXT,
          workflow_revision TEXT,
          status TEXT NOT NULL CHECK(status IN ('queued','running','reported_success','failed','interrupted','cancelled')),
          created INTEGER NOT NULL,
          created_by TEXT NOT NULL,
          updated INTEGER NOT NULL,
          UNIQUE(request_owner,request_id),
          CHECK((workflow_id IS NULL)=(workflow_revision IS NULL))
        );
        CREATE INDEX IF NOT EXISTS task_connection
          ON tasks(connection_id,created DESC);
        CREATE INDEX IF NOT EXISTS task_workflow
          ON tasks(workflow_id,status);
        CREATE TABLE IF NOT EXISTS attempts (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
          revision INTEGER NOT NULL,
          actor TEXT NOT NULL,
          connection_id TEXT NOT NULL REFERENCES connections(id),
          boot TEXT NOT NULL,
          lease_generation TEXT NOT NULL,
          started INTEGER NOT NULL,
          ended INTEGER,
          status TEXT NOT NULL CHECK(status IN ('running','reported_success','failed','interrupted','cancelled')),
          reported_outcome TEXT CHECK(reported_outcome IN ('success','failure','uncertain')),
          report_summary TEXT,
          report_evidence TEXT,
          reported_at INTEGER,
          interruption_reason TEXT,
          verification_verdict TEXT CHECK(verification_verdict IN ('verified','rejected')),
          verification_notes TEXT,
          verified_at INTEGER,
          verified_by TEXT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS attempt_one_running
          ON attempts(status) WHERE status='running';
        CREATE INDEX IF NOT EXISTS attempt_actor
          ON attempts(actor,status);
      `);
      this.transaction(() => {
        const get = this.db.prepare('SELECT value FROM meta WHERE key=?');
        const put = this.db.prepare('INSERT INTO meta(key,value) VALUES (?,?)');
        for (const [key, value] of Object.entries({
          schema: '1',
          computer: this.identity.computerId,
          workspace: this.identity.workspaceId,
        })) {
          const previous = get.get(key)?.value;
          requireThat(
            previous === undefined || previous === value,
            'operations_identity_mismatch',
            'Operations data belongs to another computer, workspace or schema.',
            409,
          );
          if (previous === undefined) put.run(key, value);
        }
        if (get.get('legacy_enabled') === undefined)
          put.run('legacy_enabled', this.initialLegacyEnabled ? '1' : '0');
        const now = this.now();
        const running = this.db
          .prepare(
            "SELECT task_id FROM attempts WHERE status='running' AND boot<>?",
          )
          .all(this.identity.bootId);
        if (running.length) {
          this.db
            .prepare(
              `UPDATE attempts SET revision=revision+1,status='interrupted',ended=?,interruption_reason='runtime_restart'
               WHERE status='running' AND boot<>?`,
            )
            .run(now, this.identity.bootId);
          const update = this.db.prepare(
            "UPDATE tasks SET revision=revision+1,status='interrupted',updated=? WHERE id=? AND status='running'",
          );
          for (const row of running) update.run(now, row.task_id);
        }
        this.db
          .prepare(
            "UPDATE presence SET ended=?,reason='runtime_restart' WHERE ended IS NULL AND boot<>?",
          )
          .run(now, this.identity.bootId);
      });
      return this;
    } catch (error) {
      if (error instanceof Fault) throw error;
      this.fail(error);
      throw new Fault(
        'operations_unavailable',
        'Connection and task storage could not be initialized. Inspect local storage before retrying.',
        503,
      );
    }
  }

  fail(_error) {
    if (!this.healthy) return;
    this.healthy = false;
    try {
      this.onFailure();
    } catch {
      // The persistence failure remains authoritative.
    }
  }

  assertHealthy() {
    requireThat(
      this.healthy && !this.closed && this.db,
      'operations_unavailable',
      'Connection and task storage is unavailable. Restart after inspecting local storage.',
      503,
    );
  }

  transaction(fn, { cleanup = false } = {}) {
    if (!cleanup) this.assertHealthy();
    else
      requireThat(
        !this.closed && this.db,
        'operations_unavailable',
        'Connection and task storage is unavailable.',
        503,
      );
    try {
      this.db.exec('BEGIN IMMEDIATE');
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      try {
        this.db.exec('ROLLBACK');
      } catch {
        // The transaction may not have opened.
      }
      if (error instanceof Fault) throw error;
      this.fail(error);
      throw new Fault(
        'operations_unavailable',
        'Connection and task storage could not be persisted. Inspect local storage before retrying.',
        503,
      );
    }
  }

  read(fn) {
    this.assertHealthy();
    try {
      return fn();
    } catch (error) {
      if (error instanceof Fault) throw error;
      this.fail(error);
      throw new Fault(
        'operations_unavailable',
        'Connection and task storage could not be read. Inspect local storage before retrying.',
        503,
      );
    }
  }

  pruneExpired() {
    const cutoff = this.now() - this.limits.days * 86400000;
    this.db
      .prepare(
        "DELETE FROM tasks WHERE status NOT IN ('queued','running') AND updated<?",
      )
      .run(cutoff);
    this.db
      .prepare('DELETE FROM presence WHERE ended IS NOT NULL AND ended<?')
      .run(cutoff);
    this.db
      .prepare(
        `DELETE FROM connections WHERE revoked IS NOT NULL AND revoked<?
         AND NOT EXISTS (SELECT 1 FROM tasks WHERE connection_id=connections.id)`,
      )
      .run(cutoff);
  }

  connectionRow(id) {
    requireUuid(id, 'invalid_connection');
    const row = this.db.prepare('SELECT * FROM connections WHERE id=?').get(id);
    requireThat(row, 'connection_not_found', 'Connection was not found.', 404);
    return row;
  }

  activeConnectionRow(id, access) {
    const row = this.connectionRow(id);
    requireThat(
      row.revoked === null,
      'connection_revoked',
      'This connection was revoked.',
      403,
    );
    if (access)
      requireThat(
        row.access === access,
        'work_access_required',
        'This operation requires a work connection.',
        403,
      );
    return row;
  }

  publicPresence(row) {
    return {
      actor: row.actor,
      bootId: row.boot,
      firstSeenAt: iso(row.first_seen),
      lastSeenAt: iso(row.last_seen),
      endedAt: iso(row.ended),
      reason: row.reason,
      client: {
        source: row.source,
        name: row.client,
        version: row.version,
        protocol: row.protocol,
      },
    };
  }

  connectionSessions(id) {
    return this.db
      .prepare(
        'SELECT * FROM presence WHERE connection_id=? ORDER BY last_seen DESC,id DESC',
      )
      .all(id)
      .map((row) => this.publicPresence(row));
  }

  publicConnection(row) {
    return {
      id: row.id,
      label: row.label,
      access: row.access,
      requiresTask: row.access === 'work',
      createdAt: iso(row.created),
      revokedAt: iso(row.revoked),
      sessions: this.connectionSessions(row.id),
    };
  }

  createConnection(input, ownerActor) {
    requireActor(ownerActor, 'human');
    const value = validated(
      connectionCreateSchema,
      input,
      'invalid_connection',
      'Provide a valid connection label and read or work access.',
    );
    return this.transaction(() => {
      this.pruneExpired();
      requireThat(
        !this.db
          .prepare('SELECT id FROM connections WHERE label=?')
          .get(value.label),
        'connection_label_exists',
        'That connection label is already in use.',
        409,
      );
      requireThat(
        this.db.prepare('SELECT count(*) AS n FROM connections').get().n <
          this.limits.connections,
        'connection_limit',
        'Connection storage is full. Revoke unused connections and wait for retained history to expire.',
        429,
      );
      const id = randomUUID();
      const secret = randomBytes(32).toString('hex');
      this.db
        .prepare(
          `INSERT INTO connections
           (id,label,access,secret_hash,created,created_by)
           VALUES (?,?,?,?,?,?)`,
        )
        .run(
          id,
          value.label,
          value.access,
          hash('computer-mcp:connection-secret:v1', secret),
          this.now(),
          ownerActor,
        );
      return {
        connection: this.publicConnection(this.connectionRow(id)),
        secret,
      };
    });
  }

  authenticate(secret) {
    if (typeof secret !== 'string' || !/^[0-9a-f]{64}$/.test(secret))
      return null;
    return this.read(() => {
      const row = this.db
        .prepare('SELECT * FROM connections WHERE secret_hash=?')
        .get(hash('computer-mcp:connection-secret:v1', secret));
      if (!row) return null;
      requireThat(
        row.revoked === null,
        'connection_revoked',
        'This connection was revoked.',
        403,
      );
      return this.publicConnection(row);
    });
  }

  connection(id) {
    return this.read(() => this.publicConnection(this.connectionRow(id)));
  }

  connections() {
    return this.read(() =>
      this.db
        .prepare('SELECT * FROM connections ORDER BY created DESC,id DESC')
        .all()
        .map((row) => this.publicConnection(row)),
    );
  }

  assertConnectionActive(id) {
    return this.read(() => this.publicConnection(this.activeConnectionRow(id)));
  }

  revokeConnection(id, ownerActor) {
    requireActor(ownerActor, 'human');
    return this.transaction(() => {
      const row = this.connectionRow(id);
      if (row.revoked !== null) return this.publicConnection(row);
      const now = this.now();
      this.db
        .prepare(
          'UPDATE connections SET revoked=?,revoked_by=? WHERE id=? AND revoked IS NULL',
        )
        .run(now, ownerActor, id);
      this.db
        .prepare(
          "UPDATE presence SET ended=?,reason='connection_revoked' WHERE connection_id=? AND ended IS NULL",
        )
        .run(now, id);
      this.interruptWhere('connection_id=?', [id], 'connection_revoked', now);
      return this.publicConnection(this.connectionRow(id));
    });
  }

  touch(connectionId, sessionActor, clientMetadata = { source: 'api' }) {
    requireActor(sessionActor, 'agent');
    const client = validated(
      auditClientSchema,
      clientMetadata,
      'invalid_client',
      'Invalid declared client metadata.',
    );
    return this.transaction(() => {
      this.activeConnectionRow(connectionId);
      const foreign = this.db
        .prepare(
          'SELECT connection_id FROM presence WHERE actor=? AND connection_id<>? LIMIT 1',
        )
        .get(sessionActor, connectionId);
      requireThat(
        !foreign,
        'session_identity_mismatch',
        'This session belongs to another connection.',
        409,
      );
      const current = this.db
        .prepare(
          'SELECT * FROM presence WHERE actor=? AND connection_id=? AND boot=? AND ended IS NULL ORDER BY id DESC LIMIT 1',
        )
        .get(sessionActor, connectionId, this.identity.bootId);
      const now = this.now();
      if (current) {
        if (now - current.last_seen >= this.limits.presenceWriteMs) {
          this.db
            .prepare(
              'UPDATE presence SET source=?,client=?,version=?,protocol=?,last_seen=? WHERE id=?',
            )
            .run(
              client.source,
              client.name || null,
              client.version || null,
              client.protocol || null,
              now,
              current.id,
            );
          return this.publicPresence(
            this.db
              .prepare('SELECT * FROM presence WHERE id=?')
              .get(current.id),
          );
        }
        return this.publicPresence(current);
      }
      this.pruneExpired();
      requireThat(
        this.db.prepare('SELECT count(*) AS n FROM presence').get().n <
          this.limits.presence,
        'presence_limit',
        'Named connection presence storage is full.',
        429,
      );
      const result = this.db
        .prepare(
          `INSERT INTO presence
           (connection_id,actor,boot,source,client,version,protocol,first_seen,last_seen)
           VALUES (?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          connectionId,
          sessionActor,
          this.identity.bootId,
          client.source,
          client.name || null,
          client.version || null,
          client.protocol || null,
          now,
          now,
        );
      return this.publicPresence(
        this.db
          .prepare('SELECT * FROM presence WHERE id=?')
          .get(Number(result.lastInsertRowid)),
      );
    });
  }

  endSession(sessionActor, reason = 'session_end') {
    requireActor(sessionActor, 'agent');
    validated(
      interruptionReasonSchema,
      reason,
      'invalid_interruption_reason',
      'Invalid interruption reason.',
    );
    return this.transaction(
      () => {
        const now = this.now();
        this.db
          .prepare(
            'UPDATE presence SET ended=?,reason=? WHERE actor=? AND ended IS NULL',
          )
          .run(now, reason, sessionActor);
        const taskId = this.interruptWhere(
          'actor=?',
          [sessionActor],
          reason,
          now,
        );
        return taskId ? this.publicTask(this.taskRow(taskId)) : null;
      },
      { cleanup: true },
    );
  }

  controller(sessionActor) {
    if (!actor.test(sessionActor || '') || !sessionActor.startsWith('agent:'))
      return null;
    return this.read(() => {
      const row = this.db
        .prepare(
          `SELECT c.* FROM presence p JOIN connections c ON c.id=p.connection_id
           WHERE p.actor=? ORDER BY (p.ended IS NULL) DESC,p.last_seen DESC,p.id DESC LIMIT 1`,
        )
        .get(sessionActor);
      if (!row) return null;
      return {
        id: row.id,
        label: row.label,
        access: row.access,
        requiresTask: row.access === 'work',
        revokedAt: iso(row.revoked),
      };
    });
  }

  getLegacyEnabled() {
    return this.read(() => {
      const value = this.db
        .prepare("SELECT value FROM meta WHERE key='legacy_enabled'")
        .get()?.value;
      if (!['0', '1'].includes(value)) throw new Error('Invalid policy');
      return value === '1';
    });
  }

  setLegacyEnabled(enabled, ownerActor) {
    requireActor(ownerActor, 'human');
    requireThat(
      typeof enabled === 'boolean',
      'invalid_legacy_policy',
      'Legacy access policy must be enabled or disabled.',
    );
    return this.transaction(() => {
      this.db
        .prepare("UPDATE meta SET value=? WHERE key='legacy_enabled'")
        .run(enabled ? '1' : '0');
      return enabled;
    });
  }

  taskRow(id) {
    requireUuid(id, 'invalid_task');
    const row = this.db
      .prepare(
        `SELECT t.*,
          a.id AS attempt_id,a.revision AS attempt_revision,a.actor AS attempt_actor,
          a.connection_id AS attempt_connection_id,a.boot AS attempt_boot,
          a.lease_generation,a.started,a.ended,a.status AS attempt_status,
          a.reported_outcome,a.report_summary,a.report_evidence,a.reported_at,
          a.interruption_reason,a.verification_verdict,a.verification_notes,
          a.verified_at,a.verified_by
         FROM tasks t LEFT JOIN attempts a ON a.task_id=t.id WHERE t.id=?`,
      )
      .get(id);
    requireThat(row, 'task_not_found', 'Task request was not found.', 404);
    return row;
  }

  publicTask(row) {
    let evidence = [];
    if (row.report_evidence !== null && row.report_evidence !== undefined) {
      evidence = JSON.parse(row.report_evidence);
      if (!Array.isArray(evidence)) throw new Error('Invalid task evidence');
    }
    return {
      id: row.id,
      revision: row.revision,
      computerId: row.computer_id,
      workspaceId: row.workspace_id,
      connectionId: row.connection_id,
      name: row.name,
      goal: row.goal,
      expectedResult: row.expected_result,
      scope: row.scope,
      workflow:
        row.workflow_id === null
          ? null
          : { id: row.workflow_id, revision: row.workflow_revision },
      status: row.status,
      createdAt: iso(row.created),
      createdBy: row.created_by,
      attempt:
        row.attempt_id === null || row.attempt_id === undefined
          ? null
          : {
              id: row.attempt_id,
              revision: row.attempt_revision,
              actor: row.attempt_actor,
              connectionId: row.attempt_connection_id,
              bootId: row.attempt_boot,
              leaseGeneration: row.lease_generation,
              startedAt: iso(row.started),
              endedAt: iso(row.ended),
              status: row.attempt_status,
              interruptionReason: row.interruption_reason,
              partialEffects:
                row.attempt_status === 'interrupted' ||
                row.attempt_status === 'cancelled'
                  ? 'unknown'
                  : null,
              report:
                row.reported_outcome === null ||
                row.reported_outcome === undefined
                  ? null
                  : {
                      outcome: row.reported_outcome,
                      summary: row.report_summary,
                      evidence,
                    },
              verification:
                row.verification_verdict === null ||
                row.verification_verdict === undefined
                  ? null
                  : {
                      verdict: row.verification_verdict,
                      actor: row.verified_by,
                      notes: row.verification_notes,
                      at: iso(row.verified_at),
                    },
            },
    };
  }

  taskPayload(value) {
    return JSON.stringify({
      requestId: value.requestId,
      connectionId: value.connectionId,
      name: value.name,
      goal: value.goal,
      expectedResult: value.expectedResult,
      scope: value.scope,
      workflow: value.workflow || null,
    });
  }

  createTask(input, ownerActor) {
    requireActor(ownerActor, 'human');
    const value = validated(
      taskCreateSchema,
      input,
      'invalid_task',
      'Provide a bounded task request for one work connection.',
    );
    const payloadHash = hash(
      'computer-mcp:task-request:v1',
      this.taskPayload(value),
    );
    return this.transaction(() => {
      this.activeConnectionRow(value.connectionId, 'work');
      const previous = this.db
        .prepare(
          'SELECT id,payload_hash FROM tasks WHERE request_owner=? AND request_id=?',
        )
        .get(ownerActor, value.requestId);
      if (previous) {
        requireThat(
          previous.payload_hash === payloadHash,
          'task_request_conflict',
          'That task request identity was already used with different content.',
          409,
        );
        return this.publicTask(this.taskRow(previous.id));
      }
      this.pruneExpired();
      requireThat(
        this.db.prepare('SELECT count(*) AS n FROM tasks').get().n <
          this.limits.tasks,
        'task_limit',
        'Task request storage is full. Retained active requests cannot be removed.',
        429,
      );
      const id = randomUUID(),
        now = this.now();
      this.db
        .prepare(
          `INSERT INTO tasks
           (id,request_id,request_owner,payload_hash,revision,computer_id,workspace_id,
            connection_id,name,goal,expected_result,scope,workflow_id,workflow_revision,
            status,created,created_by,updated)
           VALUES (?,?,?,?,1,?,?,?,?,?,?,?,?,?,'queued',?,?,?)`,
        )
        .run(
          id,
          value.requestId,
          ownerActor,
          payloadHash,
          this.identity.computerId,
          this.identity.workspaceId,
          value.connectionId,
          value.name,
          value.goal,
          value.expectedResult,
          value.scope,
          value.workflow?.id || null,
          value.workflow?.revision || null,
          now,
          ownerActor,
          now,
        );
      return this.publicTask(this.taskRow(id));
    });
  }

  tasks(connectionId) {
    if (connectionId !== undefined)
      requireUuid(connectionId, 'invalid_connection');
    return this.read(() => {
      if (connectionId !== undefined) this.connectionRow(connectionId);
      const ids = this.db
        .prepare(
          `SELECT id FROM tasks WHERE (? IS NULL OR connection_id=?)
           ORDER BY created DESC,id DESC LIMIT ?`,
        )
        .all(connectionId || null, connectionId || null, this.limits.list);
      return ids.map((row) => this.publicTask(this.taskRow(row.id)));
    });
  }

  task(id, connectionId) {
    if (connectionId !== undefined)
      requireUuid(connectionId, 'invalid_connection');
    return this.read(() => {
      const row = this.taskRow(id);
      requireThat(
        connectionId === undefined || row.connection_id === connectionId,
        'task_forbidden',
        'This task belongs to another connection.',
        403,
      );
      return this.publicTask(row);
    });
  }

  assertCurrentPresence(connectionId, sessionActor) {
    requireThat(
      this.db
        .prepare(
          'SELECT id FROM presence WHERE connection_id=? AND actor=? AND boot=? AND ended IS NULL',
        )
        .get(connectionId, sessionActor, this.identity.bootId),
      'connection_session_required',
      'This connection session is not active.',
      409,
    );
  }

  prepareStart(id, { actor: sessionActor, connectionId }) {
    requireActor(sessionActor, 'agent');
    requireUuid(connectionId, 'invalid_connection');
    return this.read(() => {
      this.activeConnectionRow(connectionId, 'work');
      this.assertCurrentPresence(connectionId, sessionActor);
      const row = this.taskRow(id);
      requireThat(
        row.connection_id === connectionId,
        'task_forbidden',
        'This task belongs to another connection.',
        403,
      );
      if (
        row.status === 'running' &&
        row.attempt_actor === sessionActor &&
        row.attempt_boot === this.identity.bootId
      )
        return this.publicTask(row);
      requireThat(
        row.status === 'queued',
        'task_not_startable',
        'This task request cannot be started again.',
        409,
      );
      const running = this.db
        .prepare("SELECT actor FROM attempts WHERE status='running' LIMIT 1")
        .get();
      requireThat(
        !running,
        running?.actor === sessionActor ? 'attempt_active' : 'computer_busy',
        running?.actor === sessionActor
          ? 'This session already has a running attempt.'
          : 'Another task attempt is using this computer.',
        409,
      );
      return this.publicTask(row);
    });
  }

  startTask(id, { actor: sessionActor, connectionId, leaseGeneration }) {
    requireActor(sessionActor, 'agent');
    requireUuid(connectionId, 'invalid_connection');
    requireUuid(leaseGeneration, 'invalid_lease');
    return this.transaction(() => {
      this.activeConnectionRow(connectionId, 'work');
      this.assertCurrentPresence(connectionId, sessionActor);
      const row = this.taskRow(id);
      requireThat(
        row.connection_id === connectionId,
        'task_forbidden',
        'This task belongs to another connection.',
        403,
      );
      if (row.status === 'running') {
        requireThat(
          row.attempt_actor === sessionActor &&
            row.attempt_connection_id === connectionId &&
            row.attempt_boot === this.identity.bootId &&
            row.lease_generation === leaseGeneration,
          'attempt_binding_changed',
          'This task is already bound to another session or lease.',
          409,
        );
        return this.publicTask(row);
      }
      requireThat(
        row.status === 'queued',
        'task_not_startable',
        'This task request cannot be started again.',
        409,
      );
      requireThat(
        !this.db
          .prepare("SELECT id FROM attempts WHERE status='running' LIMIT 1")
          .get(),
        'computer_busy',
        'Another task attempt is using this computer.',
        409,
      );
      this.pruneExpired();
      requireThat(
        this.db.prepare('SELECT count(*) AS n FROM attempts').get().n <
          this.limits.attempts,
        'attempt_limit',
        'Task attempt storage is full.',
        429,
      );
      const attemptId = randomUUID(),
        now = this.now();
      this.db
        .prepare(
          `INSERT INTO attempts
           (id,task_id,revision,actor,connection_id,boot,lease_generation,started,status)
           VALUES (?,?,1,?,?,?,?,?,'running')`,
        )
        .run(
          attemptId,
          id,
          sessionActor,
          connectionId,
          this.identity.bootId,
          leaseGeneration,
          now,
        );
      this.db
        .prepare(
          "UPDATE tasks SET revision=revision+1,status='running',updated=? WHERE id=? AND status='queued'",
        )
        .run(now, id);
      return this.publicTask(this.taskRow(id));
    });
  }

  binding(row) {
    const task = this.publicTask(row);
    return {
      taskId: task.id,
      taskRevision: task.revision,
      id: task.attempt.id,
      actor: task.attempt.actor,
      connectionId: task.attempt.connectionId,
      bootId: task.attempt.bootId,
      leaseGeneration: task.attempt.leaseGeneration,
      startedAt: task.attempt.startedAt,
      workflow: task.workflow,
    };
  }

  activeAttempt(sessionActor, connectionId) {
    requireActor(sessionActor, 'agent');
    if (connectionId !== undefined)
      requireUuid(connectionId, 'invalid_connection');
    return this.read(() => {
      const row = this.db
        .prepare(
          `SELECT task_id FROM attempts WHERE actor=? AND boot=? AND status='running'
           AND (? IS NULL OR connection_id=?) LIMIT 1`,
        )
        .get(
          sessionActor,
          this.identity.bootId,
          connectionId || null,
          connectionId || null,
        );
      return row ? this.binding(this.taskRow(row.task_id)) : null;
    });
  }

  assertEffect({ actor: sessionActor, connectionId, leaseGeneration }) {
    requireActor(sessionActor, 'agent');
    requireUuid(connectionId, 'invalid_connection');
    requireUuid(leaseGeneration, 'invalid_lease');
    return this.read(() => {
      this.activeConnectionRow(connectionId, 'work');
      const row = this.db
        .prepare(
          `SELECT task_id FROM attempts WHERE actor=? AND connection_id=? AND boot=?
           AND lease_generation=? AND status='running' LIMIT 1`,
        )
        .get(sessionActor, connectionId, this.identity.bootId, leaseGeneration);
      requireThat(
        row,
        'task_required',
        'Start the assigned task with this session and lease before effects.',
        409,
      );
      return this.binding(this.taskRow(row.task_id));
    });
  }

  assertWorkflowIdle(workflowId) {
    requireUuid(workflowId, 'invalid_workflow');
    return this.read(() => {
      requireThat(
        !this.db
          .prepare(
            `SELECT a.id FROM attempts a JOIN tasks t ON t.id=a.task_id
             WHERE t.workflow_id=? AND a.status='running' LIMIT 1`,
          )
          .get(workflowId),
        'workflow_in_use',
        'Finish or cancel the running task before changing this workflow.',
        409,
      );
      return true;
    });
  }

  finishTask(id, input) {
    requireThat(
      input &&
        typeof input === 'object' &&
        !Array.isArray(input) &&
        Object.keys(input).every((key) =>
          ['actor', 'connectionId', 'outcome', 'summary', 'evidence'].includes(
            key,
          ),
        ),
      'invalid_task_report',
      'Provide a bounded task outcome, summary and evidence list.',
    );
    const sessionActor = requireActor(input?.actor, 'agent');
    const connectionId = requireUuid(input?.connectionId, 'invalid_connection');
    const report = validated(
      taskFinishSchema,
      {
        outcome: input?.outcome,
        summary: input?.summary,
        evidence: input?.evidence,
      },
      'invalid_task_report',
      'Provide a bounded task outcome, summary and evidence list.',
    );
    const evidence = JSON.stringify(report.evidence);
    return this.transaction(() => {
      this.activeConnectionRow(connectionId, 'work');
      const row = this.taskRow(id);
      requireThat(
        row.connection_id === connectionId &&
          row.attempt_actor === sessionActor &&
          row.attempt_connection_id === connectionId &&
          row.attempt_boot === this.identity.bootId,
        'task_forbidden',
        'This task attempt belongs to another connection or session.',
        403,
      );
      if (row.status !== 'running') {
        requireThat(
          row.reported_outcome === report.outcome &&
            row.report_summary === report.summary &&
            row.report_evidence === evidence,
          'task_report_conflict',
          'This task attempt already has a different terminal outcome.',
          409,
        );
        return this.publicTask(row);
      }
      const status =
          report.outcome === 'success'
            ? 'reported_success'
            : report.outcome === 'failure'
              ? 'failed'
              : 'interrupted',
        now = this.now();
      this.db
        .prepare(
          `UPDATE attempts SET revision=revision+1,status=?,ended=?,reported_outcome=?,
           report_summary=?,report_evidence=?,reported_at=?,interruption_reason=?
           WHERE task_id=? AND status='running'`,
        )
        .run(
          status,
          now,
          report.outcome,
          report.summary,
          evidence,
          now,
          report.outcome === 'uncertain' ? 'agent_uncertain' : null,
          id,
        );
      this.db
        .prepare(
          'UPDATE tasks SET revision=revision+1,status=?,updated=? WHERE id=?',
        )
        .run(status, now, id);
      return this.publicTask(this.taskRow(id));
    });
  }

  interruptWhere(where, params, reason, now = this.now()) {
    const rows = this.db
      .prepare(
        `SELECT task_id FROM attempts WHERE status='running' AND ${where}`,
      )
      .all(...params);
    if (!rows.length) return null;
    this.db
      .prepare(
        `UPDATE attempts SET revision=revision+1,status='interrupted',ended=?,interruption_reason=?
         WHERE status='running' AND ${where}`,
      )
      .run(now, reason, ...params);
    const update = this.db.prepare(
      "UPDATE tasks SET revision=revision+1,status='interrupted',updated=? WHERE id=? AND status='running'",
    );
    for (const row of rows) update.run(now, row.task_id);
    return rows[0].task_id;
  }

  interruptActor(sessionActor, reason) {
    requireActor(sessionActor, 'agent');
    validated(
      interruptionReasonSchema,
      reason,
      'invalid_interruption_reason',
      'Invalid interruption reason.',
    );
    return this.transaction(
      () => {
        const taskId = this.interruptWhere('actor=?', [sessionActor], reason);
        return taskId ? this.publicTask(this.taskRow(taskId)) : null;
      },
      { cleanup: true },
    );
  }

  cancelTask(id, inputOrOwner, maybeOwner) {
    const ownerActor =
      typeof inputOrOwner === 'string' ? inputOrOwner : maybeOwner;
    const input = typeof inputOrOwner === 'string' ? {} : inputOrOwner || {};
    requireActor(ownerActor, 'human');
    const value = validated(
      taskCancelSchema,
      input,
      'invalid_task_cancel',
      'Provide the current task revision when available.',
    );
    return this.transaction(
      () => {
        const row = this.taskRow(id);
        if (row.status === 'cancelled') return this.publicTask(row);
        requireThat(
          ['queued', 'running'].includes(row.status),
          'task_terminal',
          'This task already has a terminal outcome.',
          409,
        );
        requireThat(
          value.expectedRevision === undefined ||
            value.expectedRevision === row.revision,
          'task_changed',
          'This task changed. Refresh before cancelling it.',
          409,
        );
        const now = this.now();
        if (row.status === 'running')
          this.db
            .prepare(
              `UPDATE attempts SET revision=revision+1,status='cancelled',ended=?,interruption_reason='owner_cancelled'
               WHERE task_id=? AND status='running'`,
            )
            .run(now, id);
        this.db
          .prepare(
            "UPDATE tasks SET revision=revision+1,status='cancelled',updated=? WHERE id=?",
          )
          .run(now, id);
        return this.publicTask(this.taskRow(id));
      },
      { cleanup: true },
    );
  }

  verifyTask(id, input, ownerActor) {
    requireActor(ownerActor, 'human');
    const value = validated(
      taskVerifySchema,
      input,
      'invalid_task_verification',
      'Provide the current task revision, verdict and owner notes.',
    );
    return this.transaction(() => {
      const row = this.taskRow(id);
      requireThat(
        terminal.has(row.status) && row.attempt_id,
        'task_not_verifiable',
        'Only a task attempt with a terminal outcome can be verified.',
        409,
      );
      requireThat(
        row.revision === value.expectedRevision,
        'task_changed',
        'This task changed. Refresh before verifying it.',
        409,
      );
      const now = this.now();
      this.db
        .prepare(
          `UPDATE attempts SET revision=revision+1,verification_verdict=?,verification_notes=?,
           verified_at=?,verified_by=? WHERE task_id=?`,
        )
        .run(value.verdict, value.notes, now, ownerActor, id);
      this.db
        .prepare('UPDATE tasks SET revision=revision+1,updated=? WHERE id=?')
        .run(now, id);
      return this.publicTask(this.taskRow(id));
    });
  }

  close() {
    if (this.closed) return;
    if (this.healthy && this.db) {
      try {
        this.transaction(
          () => {
            const now = this.now();
            this.interruptWhere(
              'boot=?',
              [this.identity.bootId],
              'runtime_stop',
              now,
            );
            this.db
              .prepare(
                "UPDATE presence SET ended=?,reason='runtime_stop' WHERE boot=? AND ended IS NULL",
              )
              .run(now, this.identity.bootId);
          },
          { cleanup: true },
        );
      } catch {
        // Startup recovery will preserve uncertainty if the database reopens.
      }
    }
    this.db?.close();
    this.closed = true;
  }
}
