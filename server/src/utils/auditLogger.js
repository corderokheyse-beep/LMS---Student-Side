const { AuditLog } = require('../models');
const logger = require('../config/logger');

async function recordAudit({
  req,
  actorId,
  actorEmail,
  actorRole,
  action,
  category = 'system',
  severity = 'info',
  entityType = null,
  entityId = null,
  metadata = {}
}) {
  try {
    const resolvedActorId = actorId ?? req?.user?.id ?? null;
    const resolvedActorEmail = actorEmail ?? req?.user?.email ?? null;
    const resolvedActorRole = actorRole ?? req?.user?.primaryRole ?? null;
    const ipAddress = req?.ip || req?.connection?.remoteAddress || '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] ? String(req.headers['user-agent']).slice(0, 490) : null;

    const entry = await AuditLog.create({
      actorId: resolvedActorId,
      actorEmail: resolvedActorEmail,
      actorRole: resolvedActorRole,
      action,
      category,
      severity,
      entityType,
      entityId: entityId !== null && entityId !== undefined ? String(entityId) : null,
      ipAddress,
      userAgent,
      metadata
    });

    logger.info({
      auditId: entry.id,
      actorId: resolvedActorId,
      action,
      category,
      severity,
      entityType,
      entityId
    }, `Audit event: ${action}`);

    return entry;
  } catch (err) {
    logger.error({ err, action }, 'Failed to write audit log entry');
    return null;
  }
}

module.exports = { recordAudit };

