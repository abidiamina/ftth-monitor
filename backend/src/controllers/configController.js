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

// PATCH /api/configs/:cle
const updateConfig = async (req, res) => {
  try {
    const { cle } = req.params;
    const { valeur } = req.body;

    if (valeur === undefined) {
      return res.status(400).json({ success: false, message: 'La valeur est obligatoire.' });
    }

    const config = await prisma.configuration.update({
      where: { cle },
      data: { valeur: String(valeur) },
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
