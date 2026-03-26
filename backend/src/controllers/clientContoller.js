const prisma = require('../config/prisma');

const parseClientId = (value) => {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) ? id : null;
};

// GET /api/clients
const getClients = async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: clients });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/clients/:id
const getClient = async (req, res) => {
  try {
    const clientId = parseClientId(req.params.id);
    if (clientId === null) {
      return res.status(400).json({ success: false, message: 'ID client invalide.' });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        interventions: {
          select: { id: true, titre: true, statut: true, priorite: true, dateCreation: true },
          orderBy: { dateCreation: 'desc' },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client introuvable.' });
    }

    res.json({ success: true, data: client });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/clients
const createClient = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Corps de requete invalide ou manquant.',
      });
    }

    const { nom, prenom, email, telephone, adresse } = req.body;

    if (!nom || !prenom || !telephone || !adresse) {
      return res.status(400).json({
        success: false,
        message: 'Champs requis : nom, prenom, telephone, adresse.',
      });
    }

    const client = await prisma.client.create({
      data: { nom, prenom, email, telephone, adresse },
    });

    res.status(201).json({ success: true, data: client });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la création.' });
  }
};

// PUT /api/clients/:id
const updateClient = async (req, res) => {
  try {
    const clientId = parseClientId(req.params.id);

    if (clientId === null) {
      return res.status(400).json({ success: false, message: 'ID client invalide.' });
    }

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Corps de requete invalide ou manquant.',
      });
    }

    const { nom, prenom, email, telephone, adresse } = req.body;

    const existing = await prisma.client.findUnique({ where: { id: clientId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Client introuvable.' });
    }

    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        ...(nom && { nom }),
        ...(prenom && { prenom }),
        ...(email && { email }),
        ...(telephone && { telephone }),
        ...(adresse && { adresse }),
      },
    });

    res.json({ success: true, data: client });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' });
  }
};

// DELETE /api/clients/:id
const deleteClient = async (req, res) => {
  try {
    const clientId = parseClientId(req.params.id);

    if (clientId === null) {
      return res.status(400).json({ success: false, message: 'ID client invalide.' });
    }

    const existing = await prisma.client.findUnique({
      where: { id: clientId },
      include: { interventions: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Client introuvable.' });
    }

    if (existing.interventions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un client ayant des interventions.',
      });
    }

    await prisma.client.delete({ where: { id: clientId } });

    res.json({ success: true, message: 'Client supprimé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
  }
};

module.exports = { getClients, getClient, createClient, updateClient, deleteClient };
