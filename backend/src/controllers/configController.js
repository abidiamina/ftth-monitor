const prisma = require('../config/prisma');

// GET /api/configs
const getConfigs = async (req, res) => {
  try {
    const configs = await prisma.configuration.findMany({
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: configs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors du chargement des configurations.' });
  }
};

const { logAction } = require('../utils/auditService');

// PATCH /api/configs/:cle
const updateConfig = async (req, res) => {
  try {
    const { cle } = req.params;
    const { valeur } = req.body;

    if (valeur === undefined) {
      return res.status(400).json({ success: false, message: 'La valeur est obligatoire.' });
    }

    const oldConfig = await prisma.configuration.findUnique({
      where: { cle },
    });

    if (!oldConfig) {
      return res.status(404).json({ success: false, message: 'Configuration introuvable.' });
    }

    const config = await prisma.configuration.update({
      where: { cle },
      data: { valeur: String(valeur) },
    });

    // Enregistrer l'audit log
    await logAction({
      action: 'UPDATE_CONFIG',
      entite: 'CONFIGURATION',
      entiteId: config.id,
      details: `Paramètre "${config.libelle || cle}" modifié de "${oldConfig.valeur}" à "${valeur}"`,
      userId: req.user.id,
      userEmail: req.user.email || 'N/A',
      userRole: req.user.role,
      ip: req.ip,
    });

    res.json({ success: true, data: config, message: 'Configuration mise à jour.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' });
  }
};

module.exports = {
  getConfigs,
  updateConfig,
};
