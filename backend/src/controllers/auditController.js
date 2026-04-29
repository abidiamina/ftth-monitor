const prisma = require('../config/prisma');

// GET /api/audit
const getAuditLogs = async (req, res) => {
  try {
    const { action, entite, userId, limit = 50, offset = 0 } = req.query;

    const filters = {};
    if (action) filters.action = action;
    if (entite) filters.entite = entite;
    if (userId) filters.userId = parseInt(userId, 10);

    const logs = await prisma.auditLog.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    });

    const total = await prisma.auditLog.count({ where: filters });

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la recuperation des logs d audit.' });
  }
};

module.exports = { getAuditLogs };
