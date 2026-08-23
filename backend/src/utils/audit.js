const AuditLog = require('../models/AuditLog');

async function writeAudit({ gymId, userId, action, entityType, entityId, description }) {
  try {
    await AuditLog.create({ gymId, userId, action, entityType, entityId, description });
  } catch (error) {
    console.error('Audit log failed', error.message);
  }
}

module.exports = { writeAudit };
