const prisma = require('../config/prisma');

// GET /api/interventions
const getInterventions = async (req, res) => {
  try {
    const { statut, priorite, technicienId } = req.query;

    const filters = {};
    if (statut) filters.statut = statut;
    if (priorite) filters.priorite = priorite;
    if (technicienId) filters.technicienId = parseInt(technicienId);

    // Le technicien ne voit que ses propres interventions
    if (req.user.role === 'TECHNICIEN') {
      const technicien = await prisma.technicien.findUnique({
        where: { utilisateurId: req.user.id },
      });
      if (technicien) filters.technicienId = technicien.id;
    }

    const interventions = await prisma.intervention.findMany({
      where: filters,
      include: {
        client: true,
        technicien: {
          include: { utilisateur: { select: { nom: true, prenom: true, telephone: true } } },
        },
        responsable: {
          include: { utilisateur: { select: { nom: true, prenom: true } } },
        },
      },
      orderBy: { dateCreation: 'desc' },
    });

    res.json({ success: true, data: interventions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/interventions/:id
const getIntervention = async (req, res) => {
  try {
    const intervention = await prisma.intervention.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        client: true,
        technicien: {
          include: { utilisateur: { select: { nom: true, prenom: true, telephone: true } } },
        },
        responsable: {
          include: { utilisateur: { select: { nom: true, prenom: true } } },
        },
        rapport: true,
        notifications: true,
      },
    });

    if (!intervention) {
      return res.status(404).json({ success: false, message: 'Intervention introuvable.' });
    }

    res.json({ success: true, data: intervention });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/interventions
const createIntervention = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Corps de requete invalide ou manquant.',
      });
    }

    const {
      titre, description, adresse, latitude, longitude,
      priorite, datePlanifiee, clientId, technicienId,
    } = req.body;

    // Récupérer l'ID du responsable connecté
    const responsable = await prisma.responsable.findUnique({
      where: { utilisateurId: req.user.id },
    });

    if (!responsable) {
      return res.status(403).json({ success: false, message: 'Seul un responsable peut créer une intervention.' });
    }

    const intervention = await prisma.intervention.create({
      data: {
        titre,
        description,
        adresse,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        priorite: priorite || 'NORMALE',
        datePlanifiee: datePlanifiee ? new Date(datePlanifiee) : null,
        clientId: parseInt(clientId),
        technicienId: technicienId ? parseInt(technicienId) : null,
        responsableId: responsable.id,
      },
      include: {
        client: true,
        technicien: {
          include: { utilisateur: { select: { nom: true, prenom: true } } },
        },
      },
    });

    res.status(201).json({ success: true, data: intervention });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la création.' });
  }
};

// PUT /api/interventions/:id
const updateIntervention = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Corps de requete invalide ou manquant.',
      });
    }

    const {
      titre, description, adresse, latitude, longitude,
      priorite, statut, datePlanifiee, technicienId,
    } = req.body;

    const existing = await prisma.intervention.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Intervention introuvable.' });
    }

    // Gérer les dates selon le changement de statut
    const dateData = {};
    if (statut === 'EN_COURS' && !existing.dateDebut) dateData.dateDebut = new Date();
    if (statut === 'TERMINEE' && !existing.dateFin) dateData.dateFin = new Date();

    const intervention = await prisma.intervention.update({
      where: { id: parseInt(id) },
      data: {
        ...(titre && { titre }),
        ...(description && { description }),
        ...(adresse && { adresse }),
        ...(latitude && { latitude: parseFloat(latitude) }),
        ...(longitude && { longitude: parseFloat(longitude) }),
        ...(priorite && { priorite }),
        ...(statut && { statut }),
        ...(datePlanifiee && { datePlanifiee: new Date(datePlanifiee) }),
        ...(technicienId && { technicienId: parseInt(technicienId) }),
        ...dateData,
      },
      include: {
        client: true,
        technicien: {
          include: { utilisateur: { select: { nom: true, prenom: true } } },
        },
      },
    });

    res.json({ success: true, data: intervention });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' });
  }
};

// DELETE /api/interventions/:id
const deleteIntervention = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.intervention.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Intervention introuvable.' });
    }

    if (existing.statut === 'EN_COURS') {
      return res.status(400).json({ success: false, message: 'Impossible de supprimer une intervention en cours.' });
    }

    await prisma.intervention.delete({ where: { id: parseInt(id) } });

    res.json({ success: true, message: 'Intervention supprimée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
  }
};

module.exports = {
  getInterventions,
  getIntervention,
  createIntervention,
  updateIntervention,
  deleteIntervention,
};
