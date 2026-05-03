const prisma = require('../config/prisma');

const parseClientId = (value) => {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) ? id : null;
};

// GET /api/clients
const getClients = async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      include: {
        utilisateur: {
          select: {
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aplatir les données pour la compatibilité frontend
    const flattenedClients = clients.map(client => ({
      ...client,
      nom: client.utilisateur.nom,
      prenom: client.utilisateur.prenom,
      email: client.utilisateur.email,
      telephone: client.utilisateur.telephone,
      utilisateur: undefined, // Nettoyer si nécessaire
    }));

    res.json({ success: true, data: flattenedClients });
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
        utilisateur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
          },
        },
        interventions: {
          select: { id: true, titre: true, statut: true, priorite: true, dateCreation: true },
          orderBy: { dateCreation: 'desc' },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client introuvable.' });
    }

    // Aplatir les données pour la compatibilité frontend
    const flattenedClient = {
      ...client,
      nom: client.utilisateur.nom,
      prenom: client.utilisateur.prenom,
      email: client.utilisateur.email,
      telephone: client.utilisateur.telephone,
      utilisateur: undefined,
    };

    res.json({ success: true, data: flattenedClient });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/clients
const createClient = async (req, res) => {
  // NOTE: En raison de la suppression de la redondance, la création d'un client
  // doit passer par la création d'un Utilisateur avec le rôle CLIENT.
  // Ce endpoint est redirigé vers la logique de création d'utilisateur si nécessaire.
  return res.status(400).json({
    success: false,
    message: 'Pour créer un client, utilisez le module de gestion des utilisateurs avec le rôle CLIENT.',
  });
};

// PUT /api/clients/:id
const updateClient = async (req, res) => {
  try {
    const clientId = parseClientId(req.params.id);

    if (clientId === null) {
      return res.status(400).json({ success: false, message: 'ID client invalide.' });
    }

    const { adresse } = req.body;

    const existing = await prisma.client.findUnique({ where: { id: clientId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Client introuvable.' });
    }

    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        ...(adresse && { adresse }),
      },
      include: {
        utilisateur: {
          select: { id: true, nom: true, prenom: true, email: true, telephone: true },
        },
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

    // On supprime l'utilisateur associé, ce qui supprimera le client par cascade
    if (existing.utilisateurId) {
      await prisma.utilisateur.delete({ where: { id: existing.utilisateurId } });
    } else {
      await prisma.client.delete({ where: { id: clientId } });
    }

    res.json({ success: true, message: 'Client supprimé avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
  }
};

module.exports = { getClients, getClient, createClient, updateClient, deleteClient };
