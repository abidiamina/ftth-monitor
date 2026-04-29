const prisma = require('../config/prisma');

/**
 * Log an action to the AuditTrail
 */
const logAction = async ({ action, entite, entiteId, details, userId, userEmail, userRole, ip }) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entite,
        entiteId: entiteId ? parseInt(entiteId, 10) : null,
        details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null,
        userId: parseInt(userId, 10),
        userEmail,
        userRole,
        ip,
      },
    });
  } catch (err) {
    console.error('[AuditLog Error]:', err);
  }
};

module.exports = { logAction };
