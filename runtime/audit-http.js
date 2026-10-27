import { auditClientSchema } from '../src/audit-contract.js';
import { tools } from '../src/catalog.js';
import { Fault, requireThat } from './errors.js';

export function clientMetadata(req) {
  if (req.kind === 'human') return;
  const header = req.get('x-audit-client');
  if (!header) {
    req.auditClient = { source: 'api' };
    return;
  }
  let value;
  try {
    if (header.length <= 300) value = JSON.parse(header);
  } catch {
    /* rejected below */
  }
  const parsed = auditClientSchema.safeParse(value);
  requireThat(
    parsed.success,
    'invalid_client',
    'Invalid declared client metadata.',
  );
  req.auditClient = parsed.data;
}
export function activityAction(req) {
  if (req.path === '/call') {
    const name = req.body?.name;
    if (!Object.hasOwn(tools, name)) return 'tool.unknown';
    if (['computer_info', 'control_renew'].includes(name)) return null;
    const action = req.body?.args?.action;
    const actions =
      name === 'browser_action'
        ? ['navigate', 'click', 'fill', 'press', 'scroll']
        : name === 'desktop_action'
          ? ['move', 'click', 'scroll', 'type', 'key']
          : [];
    return `tool.${name}${actions.includes(action) ? `.${action}` : ''}`;
  }
  const routes = {
    '/control/take': 'control.takeover',
    '/cancel': 'operation.cancel',
    '/teach/start': 'teach.start',
    '/teach/stop': 'teach.stop',
    '/session/end': 'session.end',
    '/activity/export': 'activity.export',
  };
  if (routes[req.path]) return routes[req.path];
  if (req.path.startsWith('/activity') && req.kind !== 'human')
    return 'activity.denied';
  const ownerPath = req.path.replace(/^\/owner(?=\/)/, '');
  if (/^\/(?:connections|legacy)(?:\/|$)/.test(ownerPath)) {
    if (req.kind !== 'human') return 'connection.denied';
    if (req.path === '/owner/connections' && req.method === 'POST')
      return 'connection.create';
    if (
      /^\/connections\/[^/]+\/revoke$/.test(ownerPath) &&
      req.method === 'POST'
    )
      return 'connection.revoke';
    if (ownerPath === '/legacy' && req.method === 'POST')
      return 'connection.legacy';
    return null;
  }
  if (/^\/(?:tasks|attempts)(?:\/|$)/.test(ownerPath)) {
    if (req.kind !== 'human')
      return ownerPath.startsWith('/attempts')
        ? 'attempt.denied'
        : 'task.denied';
    if (ownerPath === '/tasks' && req.method === 'POST') return 'task.assign';
    const task = ownerPath.match(/^\/tasks\/[^/]+(?:\/(cancel|verify))?$/);
    if (task && req.method === (task[1] ? 'POST' : 'GET'))
      return task[1] ? `task.${task[1]}` : 'task.read';
    return null;
  }
  const match = req.path.match(
    /^\/workflows\/[^/]+(?:\/(skill|use|review|analysis|draft\/discard|video))?$/,
  );
  if (!match) return null;
  const suffix = match[1];
  return (
    {
      skill: 'skill.export',
      use: 'skill.handoff',
      review: 'skill.review',
      analysis:
        req.body?.enabled === true
          ? 'skill.analysis.allow'
          : req.body?.enabled === false
            ? 'skill.analysis.revoke'
            : 'skill.analysis',
      'draft/discard': 'skill.draft.discard',
      video:
        req.method === 'DELETE' ? 'teach.video.delete' : 'teach.video.view',
    }[suffix] || 'skill.read'
  );
}
export function activityMiddleware(audit, { prepare = () => {} } = {}) {
  return (req, res, next) => {
    try {
      audit.assertHealthy();
      clientMetadata(req);
      prepare(req);
      const action = activityAction(req);
      if (!action) {
        audit.touch(req);
        return next();
      }
      const id = audit.start(req, action, {
        operationId: req.get('x-operation-id'),
        workflowId:
          req.auditWorkflowId ||
          (req.path.startsWith('/workflows/')
            ? req.path.split('/')[2]
            : req.path === '/call' && req.body?.name?.startsWith('workflow_')
              ? req.body?.args?.id
              : undefined),
      });
      let finished = false;
      const finish = (disconnected = false) => {
        if (finished) return;
        finished = true;
        audit.finish(
          id,
          disconnected
            ? { outcome: 'interrupted', code: 'connection_closed' }
            : req.auditOutcome ||
                (res.statusCode >= 400
                  ? {
                      outcome: 'failed',
                      code: req.auditFault || 'request_failed',
                    }
                  : {}),
        );
      };
      const json = res.json.bind(res);
      res.json = (body) => {
        try {
          finish();
        } catch {
          res.status(503);
          return json({
            code: 'audit_unavailable',
            error:
              'Activity could not be persisted. Inspect local storage before retrying.',
          });
        }
        return json(body);
      };
      res.once('finish', () => {
        try {
          finish();
        } catch {
          /* future work fails closed */
        }
      });
      res.once('close', () => {
        try {
          finish(!res.writableEnded);
        } catch {
          /* future work fails closed */
        }
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}
export function activityFault(req, error) {
  req.auditFault = error instanceof Fault ? error.code : 'operation_failed';
  if (['cancelled', 'lease_lost'].includes(req.auditFault))
    req.auditOutcome = { outcome: 'cancelled', code: req.auditFault };
  else req.auditOutcome = { outcome: 'failed', code: req.auditFault };
}
