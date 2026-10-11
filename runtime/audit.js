import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { requireThat, Fault } from './errors.js';
import { auditClientSchema } from '../src/audit-contract.js';

export const auditLimits = Object.freeze({
  days: 90,
  events: 20000,
  sessions: 2000,
  ownerSessions: 100,
  controls: 20000,
  pending: 64,
  controlSlots: 4,
  databaseBytes: 32 * 1024 * 1024,
  idleMs: 5 * 60000,
});
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const iso = (ms) => (ms === null ? null : new Date(ms).toISOString());
const outcomes = new Set(['success', 'failed', 'cancelled', 'interrupted']);

// Single runtime writer, indexed bounded tables, no network telemetry or user payloads.
export class Audit {
  constructor(
    root,
    identity,
    { now = Date.now, monotonic = () => performance.now(), limits = {} } = {},
  ) {
    this.root = root;
    this.identity = identity;
    this.now = now;
    this.monotonic = monotonic;
    this.started = new Map();
    this.limits = { ...auditLimits, ...limits };
    this.healthy = true;
    this.writes = 0;
    this.onFailure = () => {};
  }
  async init() {
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    await fs.chmod(this.root, 0o700);
    const filename = path.join(this.root, 'activity.sqlite');
    // The root-only parent protects database journals as well as the main file.
    this.db = new DatabaseSync(filename);
    await fs.chmod(filename, 0o600);
    this.db.exec(`
      PRAGMA journal_mode=DELETE;
      PRAGMA synchronous=FULL;
      PRAGMA busy_timeout=1000;
      PRAGMA max_page_count=8192;
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT NOT NULL,
        actor TEXT NOT NULL, boot TEXT NOT NULL, kind TEXT NOT NULL,
        access TEXT NOT NULL, source TEXT NOT NULL, client TEXT, version TEXT,
        protocol TEXT, started INTEGER NOT NULL, seen INTEGER NOT NULL,
        ended INTEGER, reason TEXT, mixed INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS session_actor ON sessions (boot, actor, access, id);
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, session INTEGER, boot TEXT NOT NULL,
        actor TEXT, kind TEXT, access TEXT, source TEXT, client TEXT, version TEXT,
        protocol TEXT, action TEXT NOT NULL, operation TEXT NOT NULL,
        workflow TEXT, started INTEGER NOT NULL, ended INTEGER,
        outcome TEXT NOT NULL, code TEXT, exit_code INTEGER, duration INTEGER
      );
      CREATE INDEX IF NOT EXISTS event_session ON events (session, id);
      CREATE INDEX IF NOT EXISTS event_time ON events (started);
      CREATE INDEX IF NOT EXISTS event_outcome ON events (outcome);
      CREATE TABLE IF NOT EXISTS controls (
        id INTEGER PRIMARY KEY AUTOINCREMENT, session INTEGER, actor TEXT NOT NULL,
        boot TEXT NOT NULL, generation TEXT NOT NULL UNIQUE,
        started INTEGER NOT NULL, expires INTEGER NOT NULL, ended INTEGER, reason TEXT
      );
      CREATE INDEX IF NOT EXISTS control_session ON controls (session, id);
    `);
    this.transaction(() => {
      const get = this.db.prepare('SELECT value FROM meta WHERE key = ?');
      const put = this.db.prepare('INSERT INTO meta (key,value) VALUES (?,?)');
      for (const [key, value] of Object.entries({
        schema: '1',
        computer: this.identity.computerId,
        workspace: this.identity.workspaceId,
      })) {
        const previous = get.get(key)?.value;
        requireThat(
          previous === undefined || previous === value,
          'audit_identity_mismatch',
          'Activity database belongs to another computer or schema.',
          409,
        );
        if (previous === undefined) put.run(key, value);
      }
      if (!get.get('pruned')) put.run('pruned', '0');
      const now = this.now();
      // A crash cannot turn unfinished effects into successful operations.
      this.db
        .prepare(
          "UPDATE events SET outcome='interrupted', code='runtime_restart' WHERE outcome='running'",
        )
        .run();
      this.db
        .prepare(
          "UPDATE sessions SET ended=seen, reason='runtime_restart' WHERE ended IS NULL",
        )
        .run();
      this.db
        .prepare(
          "UPDATE controls SET ended=MIN(expires,?), reason='runtime_restart' WHERE ended IS NULL",
        )
        .run(now);
    });
    this.prune();
    this.system('runtime.start');
    return this;
  }
  assertHealthy() {
    requireThat(
      this.healthy && !this.closed,
      'audit_unavailable',
      'Activity storage is unavailable. Restart after inspecting local storage.',
      503,
    );
  }
  transaction(fn) {
    this.assertHealthy();
    try {
      this.db.exec('BEGIN IMMEDIATE');
      const value = fn();
      this.db.exec('COMMIT');
      return value;
    } catch (error) {
      try {
        this.db.exec('ROLLBACK');
      } catch {
        /* transaction may not have opened */
      }
      // Policy rejections do not imply a broken database.
      if (error instanceof Fault) throw error;
      this.healthy = false;
      try {
        this.onFailure();
      } catch {
        /* revocation must not hide persistence failure */
      }
      throw new Fault(
        'audit_unavailable',
        'Activity could not be persisted. Inspect local storage before retrying.',
        503,
      );
    }
  }
  context(req) {
    requireThat(
      /^(agent|human):/.test(req.actor || '') &&
        uuid.test(req.actor.split(':')[1]),
      'session_required',
      'Valid activity session required.',
      401,
    );
    const client =
      req.kind === 'human'
        ? { source: 'console' }
        : req.auditClient || { source: 'api' };
    if (req.kind !== 'human')
      requireThat(
        auditClientSchema.safeParse(client).success,
        'invalid_client',
        'Invalid declared client metadata.',
      );
    return {
      actor: req.actor,
      kind: req.kind,
      access: req.kind === 'human' ? 'owner' : req.readOnly ? 'read' : 'work',
      source: client.source,
      name: client.name || null,
      version: client.version || null,
      protocol: client.protocol || null,
    };
  }
  dropSession(id) {
    const deleted = this.db
      .prepare('DELETE FROM events WHERE session=?')
      .run(id).changes;
    this.db.prepare('DELETE FROM controls WHERE session=?').run(id);
    this.db.prepare('DELETE FROM sessions WHERE id=?').run(id);
    this.db
      .prepare(
        "UPDATE meta SET value=CAST(value AS INTEGER)+? WHERE key='pruned'",
      )
      .run(deleted);
  }
  session(context, { create = true, annotate = true } = {}) {
    this.assertHealthy();
    const now = this.now();
    let row = this.db
      .prepare(
        'SELECT * FROM sessions WHERE boot=? AND actor=? AND access=? ORDER BY id DESC LIMIT 1',
      )
      .get(this.identity.bootId, context.actor, context.access);
    const holding =
      row &&
      this.db
        .prepare(
          'SELECT id FROM controls WHERE session=? AND ended IS NULL AND expires>?',
        )
        .get(row.id, now);
    const running =
      row &&
      this.db
        .prepare("SELECT id FROM events WHERE session=? AND outcome='running'")
        .get(row.id);
    if (
      row?.ended === null &&
      now - row.seen > this.limits.idleMs &&
      !holding &&
      !running
    ) {
      this.db
        .prepare("UPDATE sessions SET ended=seen, reason='inactive' WHERE id=?")
        .run(row.id);
      row = undefined;
    }
    if (row?.ended !== null) row = undefined;
    if (!row) {
      if (!create) return null;
      const agentCapacity =
        this.limits.sessions -
        Math.min(
          this.limits.ownerSessions,
          Math.max(0, this.limits.sessions - 1),
        );
      if (
        context.kind === 'agent' &&
        this.db
          .prepare("SELECT count(*) AS n FROM sessions WHERE kind='agent'")
          .get().n >= agentCapacity
      ) {
        const oldest = this.db
          .prepare(
            `SELECT id FROM sessions WHERE kind='agent' AND ended IS NOT NULL
          AND id NOT IN (SELECT session FROM controls WHERE ended IS NULL)
          AND id NOT IN (SELECT session FROM events WHERE outcome='running') ORDER BY id LIMIT 1`,
          )
          .get();
        requireThat(
          oldest,
          'activity_limit',
          'Agent session capacity reached. Reserved owner sessions remain available.',
          429,
        );
        this.dropSession(oldest.id);
      }
      if (
        this.db.prepare('SELECT count(*) AS n FROM sessions').get().n >=
        this.limits.sessions
      ) {
        const oldest = this.db
          .prepare(
            `SELECT id FROM sessions WHERE ended IS NOT NULL
          AND id NOT IN (SELECT session FROM controls WHERE ended IS NULL)
          AND id NOT IN (SELECT session FROM events WHERE outcome='running') ORDER BY id LIMIT 1`,
          )
          .get();
        requireThat(
          oldest,
          'activity_limit',
          'Activity session limit reached. Close idle agent sessions before retrying.',
          429,
        );
        this.dropSession(oldest.id);
      }
      const result = this.db
        .prepare(
          `INSERT INTO sessions
        (uuid,actor,boot,kind,access,source,client,version,protocol,started,seen)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          randomUUID(),
          context.actor,
          this.identity.bootId,
          context.kind,
          context.access,
          context.source,
          context.name,
          context.version,
          context.protocol,
          now,
          now,
        );
      return Number(result.lastInsertRowid);
    }
    const mixed =
      annotate &&
      (row.source !== context.source ||
        row.client !== context.name ||
        row.version !== context.version ||
        row.protocol !== context.protocol);
    if (now - row.seen >= 30000 || (mixed && !row.mixed))
      this.db
        .prepare('UPDATE sessions SET seen=?, mixed=MAX(mixed,?) WHERE id=?')
        .run(now, Number(mixed), row.id);
    return row.id;
  }
  touch(req, create = false) {
    return this.transaction(() =>
      this.session(this.context(req), { create, annotate: create }),
    );
  }
  start(req, action, { operationId, workflowId } = {}) {
    requireThat(
      /^[a-z][a-z0-9_.]{0,63}$/.test(action),
      'invalid_audit_action',
      'Invalid activity action.',
    );
    if (++this.writes % 100 === 0) this.prune();
    return this.transaction(() => {
      this.reserveEvent();
      const emergency = [
        'control.takeover',
        'operation.cancel',
        'session.end',
      ].includes(action);
      requireThat(
        this.db
          .prepare("SELECT count(*) AS n FROM events WHERE outcome='running'")
          .get().n <
          this.limits.pending + (emergency ? this.limits.controlSlots : 0),
        'activity_limit',
        'Too many concurrent operations.',
        429,
      );
      const context = this.context(req);
      const session = this.session(context, {
        annotate: action !== 'session.end',
      });
      this.db
        .prepare('UPDATE sessions SET seen=? WHERE id=?')
        .run(this.now(), session);
      const result = this.db
        .prepare(
          `INSERT INTO events
        (session,boot,actor,kind,access,source,client,version,protocol,action,operation,workflow,started,outcome)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'running')`,
        )
        .run(
          session,
          this.identity.bootId,
          context.actor,
          context.kind,
          context.access,
          context.source,
          context.name,
          context.version,
          context.protocol,
          action,
          uuid.test(operationId || '') ? operationId : randomUUID(),
          uuid.test(workflowId || '') ? workflowId : null,
          this.now(),
        );
      const id = Number(result.lastInsertRowid);
      this.started.set(id, this.monotonic());
      return id;
    });
  }
  finish(id, { outcome = 'success', code = null, exitCode = null } = {}) {
    if (this.closed) return;
    requireThat(
      outcomes.has(outcome),
      'invalid_audit_outcome',
      'Invalid activity outcome.',
    );
    return this.transaction(() => {
      // Only fixed fault codes and numeric exit codes; never exception messages or output.
      const safeCode =
        typeof code === 'string' && /^[a-z_]{1,64}$/.test(code) ? code : null;
      const safeExit =
        Number.isInteger(exitCode) && exitCode >= -255 && exitCode <= 255
          ? exitCode
          : null;
      const start = this.started.get(id);
      const duration =
        start === undefined
          ? null
          : Math.max(0, Math.round(this.monotonic() - start));
      this.db
        .prepare(
          "UPDATE events SET ended=?, outcome=?, code=?, exit_code=?, duration=? WHERE id=? AND outcome='running'",
        )
        .run(this.now(), outcome, safeCode, safeExit, duration, id);
      this.started.delete(id);
      this.db
        .prepare(
          'UPDATE sessions SET seen=? WHERE id=(SELECT session FROM events WHERE id=?) AND ended IS NULL',
        )
        .run(this.now(), id);
    });
  }
  system(action) {
    this.transaction(() => {
      this.reserveEvent();
      this.db
        .prepare(
          `INSERT INTO events (boot,action,operation,started,ended,outcome,duration)
      VALUES (?,?,?,?,?,'success',0)`,
        )
        .run(
          this.identity.bootId,
          action,
          randomUUID(),
          this.now(),
          this.now(),
        );
    });
  }
  reserveEvent() {
    if (
      this.db.prepare('SELECT count(*) AS n FROM events').get().n <
      this.limits.events
    )
      return;
    const oldest = this.db
      .prepare(
        "SELECT id FROM events WHERE outcome!='running' ORDER BY id LIMIT 1",
      )
      .get();
    requireThat(
      oldest,
      'activity_limit',
      'Activity capacity is occupied by running operations.',
      429,
    );
    this.db.prepare('DELETE FROM events WHERE id=?').run(oldest.id);
    this.db
      .prepare(
        "UPDATE meta SET value=CAST(value AS INTEGER)+1 WHERE key='pruned'",
      )
      .run();
  }
  control(previous, current, reason) {
    this.transaction(() => {
      const now = this.now();
      if (previous && previous.generation !== current?.generation)
        this.db
          .prepare(
            'UPDATE controls SET ended=?, reason=? WHERE generation=? AND ended IS NULL',
          )
          .run(Math.min(now, previous.expiresAt), reason, previous.generation);
      if (current) {
        const session =
          this.db
            .prepare(
              'SELECT id FROM sessions WHERE boot=? AND actor=? AND access=? AND ended IS NULL ORDER BY id DESC LIMIT 1',
            )
            .get(
              this.identity.bootId,
              current.owner,
              current.kind === 'human' ? 'owner' : 'work',
            )?.id || null;
        requireThat(
          session,
          'session_required',
          'Control requires a registered activity session.',
          409,
        );
        if (
          previous?.generation !== current.generation &&
          this.db.prepare('SELECT count(*) AS n FROM controls').get().n >=
            this.limits.controls
        ) {
          const oldest = this.db
            .prepare(
              'SELECT id FROM controls WHERE ended IS NOT NULL ORDER BY id LIMIT 1',
            )
            .get();
          requireThat(
            oldest,
            'activity_limit',
            'Control history capacity reached.',
            429,
          );
          this.db.prepare('DELETE FROM controls WHERE id=?').run(oldest.id);
        }
        this.db
          .prepare(
            `INSERT INTO controls (session,actor,boot,generation,started,expires) VALUES (?,?,?,?,?,?)
          ON CONFLICT(generation) DO UPDATE SET expires=excluded.expires`,
          )
          .run(
            session,
            current.owner,
            this.identity.bootId,
            current.generation,
            now,
            current.expiresAt,
          );
      }
    });
  }
  end(req, reason = 'client_closed') {
    this.transaction(() =>
      this.db
        .prepare(
          'UPDATE sessions SET ended=?, seen=?, reason=? WHERE boot=? AND actor=? AND access=? AND ended IS NULL',
        )
        .run(
          this.now(),
          this.now(),
          reason,
          this.identity.bootId,
          req.actor,
          this.context(req).access,
        ),
    );
  }
  prune() {
    this.transaction(() => {
      const now = this.now(),
        cutoff = now - this.limits.days * 86400000;
      this.db
        .prepare(
          "UPDATE sessions SET ended=seen, reason='inactive' WHERE ended IS NULL AND seen<? AND actor NOT IN (SELECT actor FROM controls WHERE ended IS NULL AND expires>?) AND id NOT IN (SELECT session FROM events WHERE outcome='running')",
        )
        .run(now - this.limits.idleMs, now);
      const deleted = this.db
        .prepare(
          `DELETE FROM events WHERE outcome!='running' AND (started<? OR id NOT IN (SELECT id FROM events ORDER BY id DESC LIMIT ?))`,
        )
        .run(cutoff, this.limits.events).changes;
      this.db
        .prepare(
          "UPDATE meta SET value=CAST(value AS INTEGER)+? WHERE key='pruned'",
        )
        .run(deleted);
      this.db
        .prepare(
          'DELETE FROM controls WHERE ended IS NOT NULL AND (ended<? OR id NOT IN (SELECT id FROM controls ORDER BY id DESC LIMIT ?))',
        )
        .run(cutoff, this.limits.controls);
      const stale = this.db
        .prepare(
          `SELECT id FROM sessions WHERE ended IS NOT NULL
        AND (seen<? OR id NOT IN (SELECT id FROM sessions ORDER BY id DESC LIMIT ?))
        AND id NOT IN (SELECT session FROM controls WHERE ended IS NULL)
        AND id NOT IN (SELECT session FROM events WHERE outcome='running')`,
        )
        .all(cutoff, this.limits.sessions);
      for (const row of stale) this.dropSession(row.id);
    });
  }
  filters({ days = '7', session, before, limit = '50' } = {}) {
    requireThat(
      ['1', '7', '30', '90'].includes(String(days)) &&
        (session === undefined || uuid.test(session)) &&
        (before === undefined || /^[1-9][0-9]{0,14}$/.test(String(before))) &&
        /^[1-9][0-9]{0,2}$/.test(String(limit)) &&
        Number(limit) <= 100,
      'invalid_activity_filter',
      'Choose a valid activity range, session and cursor.',
    );
    return {
      from: this.now() - Number(days) * 86400000,
      session: session || null,
      before: Number(before || Number.MAX_SAFE_INTEGER),
      limit: Number(limit),
    };
  }
  event(row) {
    return {
      id: row.id,
      sessionId: row.session_uuid || null,
      bootId: row.boot,
      actor: row.actor,
      kind: row.kind || 'runtime',
      access: row.access,
      client: {
        source: row.source,
        name: row.client,
        version: row.version,
        protocol: row.protocol,
      },
      action: row.action,
      operationId: row.operation,
      workflowId: row.workflow,
      startedAt: iso(row.started),
      endedAt: iso(row.ended),
      durationMs: row.duration ?? null,
      outcome: row.outcome,
      code: row.code,
      exitCode: row.exit_code,
    };
  }
  read(input = {}) {
    this.assertHealthy();
    this.prune();
    const filter = this.filters(input),
      now = this.now();
    const where = 'e.started>=? AND (? IS NULL OR s.uuid=?)';
    const params = [filter.from, filter.session, filter.session];
    const rows = this.db
      .prepare(
        `SELECT e.*,s.uuid AS session_uuid FROM events e LEFT JOIN sessions s ON s.id=e.session
      WHERE ${where} AND e.id<? ORDER BY e.id DESC LIMIT ?`,
      )
      .all(...params, filter.before, filter.limit + 1);
    const summary = this.db
      .prepare(
        `SELECT count(*) AS operations,
      coalesce(sum(e.outcome='success'),0) AS succeeded, coalesce(sum(e.outcome='failed'),0) AS failed,
      coalesce(sum(e.outcome IN ('cancelled','interrupted')),0) AS interrupted,
      coalesce(sum(e.outcome='running'),0) AS running,
      coalesce(sum(CASE WHEN e.action LIKE 'tool.%' THEN coalesce(e.duration,0) ELSE 0 END),0) AS toolMs
      FROM events e LEFT JOIN sessions s ON s.id=e.session WHERE ${where} AND e.actor IS NOT NULL`,
      )
      .get(...params);
    const controls = this.db
      .prepare(
        `SELECT coalesce(sum(MAX(0,MIN(coalesce(c.ended,c.expires),?)-MAX(c.started,?))),0) AS ms
      FROM controls c LEFT JOIN sessions s ON s.id=c.session WHERE coalesce(c.ended,c.expires)>=? AND (? IS NULL OR s.uuid=?)`,
      )
      .get(now, filter.from, ...params);
    const sessionRows = this.db
      .prepare(
        `SELECT s.*, (SELECT count(*) FROM events WHERE session=s.id AND started>=?) AS operations,
      (SELECT coalesce(sum(MAX(0,MIN(coalesce(ended,expires),?)-MAX(started,?))),0) FROM controls WHERE session=s.id AND coalesce(ended,expires)>=?) AS control_ms
      FROM sessions s WHERE seen>=? AND (? IS NULL OR uuid=?) ORDER BY id DESC LIMIT 100`,
      )
      .all(filter.from, now, filter.from, filter.from, ...params);
    const sessions = sessionRows.map((s) => ({
      id: s.uuid,
      actor: s.actor,
      bootId: s.boot,
      kind: s.kind,
      access: s.access,
      client: {
        source: s.source,
        name: s.client,
        version: s.version,
        protocol: s.protocol,
        mixed: !!s.mixed,
      },
      startedAt: iso(s.started),
      lastSeenAt: iso(s.seen),
      endedAt: iso(s.ended),
      reason: s.reason,
      observedMs: Math.max(0, s.seen - s.started),
      controlMs: s.control_ms,
      operations: s.operations,
    }));
    const oldest = this.db
      .prepare('SELECT MIN(started) AS at, count(*) AS n FROM events')
      .get();
    const sessionCount = this.db
      .prepare(
        'SELECT count(*) AS n FROM sessions WHERE seen>=? AND (? IS NULL OR uuid=?)',
      )
      .get(...params).n;
    return {
      version: 1,
      computerId: this.identity.computerId,
      workspaceId: this.identity.workspaceId,
      generatedAt: iso(now),
      range: { from: iso(filter.from), to: iso(now) },
      retention: {
        ...this.limits,
        oldestAt: iso(oldest.at),
        retainedEvents: oldest.n,
        prunedEvents: Number(
          this.db.prepare("SELECT value FROM meta WHERE key='pruned'").get()
            .value,
        ),
      },
      summary: { ...summary, controlMs: controls.ms, sessions: sessionCount },
      sessions,
      sessionsTruncated: sessionCount > sessions.length,
      events: rows.slice(0, filter.limit).map((row) => this.event(row)),
      nextCursor:
        rows.length > filter.limit ? String(rows[filter.limit - 1].id) : null,
    };
  }
  export(input = {}) {
    const result = this.read(input);
    const filter = this.filters(input);
    const rows = this.db
      .prepare(
        `SELECT e.*,s.uuid AS session_uuid FROM events e LEFT JOIN sessions s ON s.id=e.session
      WHERE e.started>=? AND (? IS NULL OR s.uuid=?) ORDER BY e.id`,
      )
      .all(filter.from, filter.session, filter.session);
    const sessions = this.db
      .prepare(
        'SELECT * FROM sessions WHERE seen>=? AND (? IS NULL OR uuid=?) ORDER BY id',
      )
      .all(filter.from, filter.session, filter.session);
    return {
      ...result,
      nextCursor: null,
      sessionsTruncated: false,
      sessions: sessions.map((s) => ({
        id: s.uuid,
        actor: s.actor,
        bootId: s.boot,
        kind: s.kind,
        access: s.access,
        client: {
          source: s.source,
          name: s.client,
          version: s.version,
          protocol: s.protocol,
          mixed: !!s.mixed,
        },
        startedAt: iso(s.started),
        lastSeenAt: iso(s.seen),
        endedAt: iso(s.ended),
        reason: s.reason,
        observedMs: Math.max(0, s.seen - s.started),
      })),
      events: rows.map((row) => this.event(row)),
      controlIntervals: this.db
        .prepare(
          `SELECT c.*,s.uuid AS session_uuid FROM controls c LEFT JOIN sessions s ON s.id=c.session
        WHERE coalesce(c.ended,c.expires)>=? AND (? IS NULL OR s.uuid=?) ORDER BY c.id`,
        )
        .all(filter.from, filter.session, filter.session)
        .map((c) => ({
          sessionId: c.session_uuid || null,
          actor: c.actor,
          bootId: c.boot,
          generation: c.generation,
          startedAt: iso(c.started),
          expiresAt: iso(c.expires),
          endedAt: iso(c.ended),
          reason: c.reason,
          rangeMs: Math.max(
            0,
            Math.min(c.ended ?? c.expires, this.now()) -
              Math.max(c.started, filter.from),
          ),
        })),
      identityNotice:
        'Client names are declared, not verified people or models. Shared credentials can impersonate session IDs. Times are observed spans, exclusive control and cumulative tool duration, not billable work. Only retained local metadata is exported.',
    };
  }
  close() {
    if (this.closed) return;
    if (this.healthy) {
      for (const id of this.started.keys())
        this.finish(id, { outcome: 'interrupted', code: 'runtime_stop' });
      this.transaction(() =>
        this.db
          .prepare(
            "UPDATE sessions SET ended=seen, reason='runtime_stop' WHERE ended IS NULL",
          )
          .run(),
      );
      this.system('runtime.stop');
    }
    this.db.close();
    this.closed = true;
  }
}
