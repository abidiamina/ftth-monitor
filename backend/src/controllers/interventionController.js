const prisma = require('../config/prisma');
const { createNotifications } = require('../utils/notificationService');
const { normalizeText, validateInterventionPayload } = require('../utils/validation');

const interventionInclude = {
  client: true,
  technicien: {
    include: { utilisateur: { select: { id: true, nom: true, prenom: true, telephone: true } } },
  },
  responsable: {
    include: { utilisateur: { select: { id: true, nom: true, prenom: true } } },
  },
};

const getTechnicienByUserId = (userId) =>
  prisma.technicien.findUnique({
    where: { utilisateurId: userId },
    include: {
      utilisateur: {
        select: { id: true, nom: true, prenom: true, email: true, telephone: true },
      },
    },
  });

const getClientByUserId = (userId) =>
  prisma.client.findUnique({
    where: { utilisateurId: userId },
  });

const getResponsableByUserId = (userId) =>
  prisma.responsable.findUnique({
    where: { utilisateurId: userId },
    include: {
      utilisateur: {
        select: { id: true, nom: true, prenom: true },
      },
    },
  });

const parseOptionalFloat = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const buildStatusNotificationMessage = (statut, title) => {
  switch (statut) {
    case 'EN_COURS':
      return `L'intervention "${title}" est passee en cours.`;
    case 'TERMINEE':
      return `L'intervention "${title}" a ete marquee comme terminee.`;
    case 'ANNULEE':
      return `L'intervention "${title}" a ete annulee.`;
    default:
      return `Le statut de l'intervention "${title}" a ete mis a jour.`;
  }
};

const buildValidationNotificationMessage = (title) =>
  `L'intervention "${title}" a ete validee par le responsable.`;

const buildNotificationPayloadsForCreation = (intervention) => {
  const payloads = [];

  if (intervention.client?.utilisateurId) {
    payloads.push({
      titre: 'Demande d intervention enregistree',
      message: `Votre demande "${intervention.titre}" a bien ete enregistree.`,
      interventionId: intervention.id,
      userId: intervention.client.utilisateurId,
    });
  }

  if (intervention.responsable?.utilisateur?.id) {
    payloads.push({
      titre: 'Nouvelle intervention a traiter',
      message: `Une nouvelle intervention "${intervention.titre}" vous a ete assignee pour pilotage.`,
      interventionId: intervention.id,
      userId: intervention.responsable.utilisateur.id,
    });
  }

  if (intervention.technicien?.utilisateur?.id) {
    payloads.push({
      titre: 'Nouvelle intervention affectee',
      message: `L'intervention "${intervention.titre}" vous a ete affectee.`,
      interventionId: intervention.id,
      userId: intervention.technicien.utilisateur.id,
    });
  }

  return payloads;
};

const buildNotificationPayloadsForUpdate = (before, after, actor) => {
  const payloads = [];
  const targetUserIds = new Set();

  if (after.client?.utilisateurId) targetUserIds.add(after.client.utilisateurId);
  if (after.responsable?.utilisateur?.id) targetUserIds.add(after.responsable.utilisateur.id);
  if (after.technicien?.utilisateur?.id) targetUserIds.add(after.technicien.utilisateur.id);

  if (before.technicien?.utilisateur?.id && before.technicien.utilisateur.id !== after.technicien?.utilisateur?.id) {
    targetUserIds.add(before.technicien.utilisateur.id);
  }

  if (
    before.technicienId !== after.technicienId &&
    after.technicien?.utilisateur?.id
  ) {
    payloads.push({
      titre: 'Intervention affectee',
      message: `L'intervention "${after.titre}" vous a ete affectee.`,
      interventionId: after.id,
      userId: after.technicien.utilisateur.id,
    });
  }

  if (
    before.technicienId !== after.technicienId &&
    before.technicien?.utilisateur?.id &&
    !after.technicienId
  ) {
    payloads.push({
      titre: 'Intervention reaffectee',
      message: `L'intervention "${after.titre}" a ete retiree de votre file.`,
      interventionId: after.id,
      userId: before.technicien.utilisateur.id,
    });
  }

  if (before.priorite !== after.priorite) {
    targetUserIds.forEach((userId) => {
      payloads.push({
        titre: 'Priorite d intervention modifiee',
        message: `La priorite de "${after.titre}" est maintenant ${after.priorite}.`,
        interventionId: after.id,
        userId,
      });
    });
  }

  if (before.statut !== after.statut) {
    targetUserIds.forEach((userId) => {
      payloads.push({
        titre: 'Statut d intervention modifie',
        message: buildStatusNotificationMessage(after.statut, after.titre),
        interventionId: after.id,
        userId,
      });
    });
  }

  if (!before.validee && after.validee) {
    targetUserIds.forEach((userId) => {
      payloads.push({
        titre: 'Intervention validee',
        message: buildValidationNotificationMessage(after.titre),
        interventionId: after.id,
        userId,
      });
    });
  }

  return payloads.filter((payload) => payload.userId !== actor.id);
};

const validateTechnicianUpdate = ({ existing, payload }) => {
  const forbiddenFields = ['titre', 'description', 'adresse', 'latitude', 'longitude', 'priorite', 'datePlanifiee'];
  const changedForbiddenField = forbiddenFields.some((field) => payload[field] !== undefined);

  if (changedForbiddenField) {
    return 'Un technicien ne peut pas modifier les details ou la priorite d une intervention.';
  }

  if (payload.technicienId === null) {
    if (existing.statut !== 'EN_ATTENTE') {
      return 'Le refus n est possible que pour une intervention encore en attente.';
    }

    if (payload.statut && payload.statut !== 'EN_ATTENTE') {
      return 'Le refus d intervention doit la remettre en attente.';
    }

    return null;
  }

  if (payload.statut === 'EN_COURS' && existing.statut !== 'EN_ATTENTE') {
    return 'Seule une intervention en attente peut etre demarree.';
  }

  if (payload.statut === 'TERMINEE' && existing.statut !== 'EN_COURS') {
    return 'Une intervention doit etre en cours avant d etre marquee comme terminee.';
  }

  if (payload.statut && !['EN_COURS', 'TERMINEE', 'EN_ATTENTE'].includes(payload.statut)) {
    return 'Statut non autorise pour un technicien.';
  }

  return null;
};

// GET /api/interventions
const getInterventions = async (req, res) => {
  try {
    const { statut, priorite, technicienId } = req.query;

    const filters = {};
    if (statut) filters.statut = statut;
    if (priorite) filters.priorite = priorite;
    if (technicienId) filters.technicienId = parseInt(technicienId, 10);

    if (req.user.role === 'TECHNICIEN') {
      const technicien = await getTechnicienByUserId(req.user.id);
      if (technicien) filters.technicienId = technicien.id;
    }

    if (req.user.role === 'CLIENT') {
      const client = await getClientByUserId(req.user.id);

      if (!client) {
        return res.json({ success: true, data: [] });
      }

      filters.clientId = client.id;
    }

    const interventions = await prisma.intervention.findMany({
      where: filters,
      include: interventionInclude,
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
      where: { id: parseInt(req.params.id, 10) },
      include: {
        ...interventionInclude,
        rapport: true,
        notifications: true,
      },
    });

    if (!intervention) {
      return res.status(404).json({ success: false, message: 'Intervention introuvable.' });
    }

    if (req.user.role === 'TECHNICIEN') {
      const technicien = await getTechnicienByUserId(req.user.id);

      if (!technicien || intervention.technicienId !== technicien.id) {
        return res.status(403).json({ success: false, message: 'Acces refuse a cette intervention.' });
      }
    }

    if (req.user.role === 'CLIENT') {
      const client = await getClientByUserId(req.user.id);

      if (!client || intervention.clientId !== client.id) {
        return res.status(403).json({ success: false, message: 'Acces refuse a cette intervention.' });
      }
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
    const validationError = validateInterventionPayload(
      { titre, description, adresse, priorite, datePlanifiee, clientId, technicienId },
      { requireClient: req.user.role !== 'CLIENT' }
    );

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    let resolvedClientId = parseOptionalInt(clientId);
    let responsableId = null;

    if (req.user.role === 'CLIENT') {
      const client = await getClientByUserId(req.user.id);

      if (!client) {
        return res.status(400).json({ success: false, message: 'Profil client introuvable.' });
      }

      const responsableParDefaut = await prisma.responsable.findFirst({
        orderBy: { id: 'asc' },
      });

      if (!responsableParDefaut) {
        return res.status(400).json({
          success: false,
          message: 'Aucun responsable disponible pour prendre en charge cette demande.',
        });
      }

      resolvedClientId = client.id;
      responsableId = responsableParDefaut.id;
    } else {
      const responsable = await getResponsableByUserId(req.user.id);

      if (!responsable) {
        return res.status(403).json({ success: false, message: 'Seul un responsable peut creer une intervention.' });
      }

      responsableId = responsable.id;
    }

    if (!resolvedClientId) {
      return res.status(400).json({
        success: false,
        message: 'Le client cible est obligatoire.',
      });
    }

    const intervention = await prisma.intervention.create({
      data: {
        titre: normalizeText(titre),
        description: normalizeText(description),
        adresse: normalizeText(adresse),
        latitude: parseOptionalFloat(latitude),
        longitude: parseOptionalFloat(longitude),
        priorite: priorite || 'NORMALE',
        datePlanifiee: datePlanifiee ? new Date(datePlanifiee) : null,
        clientId: resolvedClientId,
        technicienId: parseOptionalInt(technicienId),
        responsableId,
      },
      include: interventionInclude,
    });

    await createNotifications(buildNotificationPayloadsForCreation(intervention));

    res.status(201).json({
      success: true,
      data: intervention,
      message: 'Intervention creee avec succes.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la creation.' });
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
      priorite, statut, datePlanifiee, technicienId, validee,
    } = req.body;
    const validationError = validateInterventionPayload(
      { titre, description, adresse, priorite, statut, datePlanifiee, technicienId, validee },
      { partial: true }
    );

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const interventionId = parseInt(id, 10);
    const existing = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: interventionInclude,
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Intervention introuvable.' });
    }

    if (req.user.role === 'TECHNICIEN') {
      const technicien = await getTechnicienByUserId(req.user.id);

      if (!technicien || existing.technicienId !== technicien.id) {
        return res.status(403).json({ success: false, message: 'Acces refuse a cette intervention.' });
      }

      const technicianRuleError = validateTechnicianUpdate({
        existing,
        payload: {
          titre,
          description,
          adresse,
          latitude,
          longitude,
          priorite,
          statut,
          datePlanifiee,
          technicienId,
          validee,
        },
      });

      if (technicianRuleError) {
        return res.status(400).json({ success: false, message: technicianRuleError });
      }
    }

    if (validee !== undefined) {
      if (!['ADMIN', 'RESPONSABLE'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Seul un responsable peut valider une intervention terminee.',
        });
      }

      if (validee && existing.statut !== 'TERMINEE') {
        return res.status(400).json({
          success: false,
          message: 'Seule une intervention terminee peut etre validee.',
        });
      }
    }

    const dateData = {};
    if (statut === 'EN_COURS' && !existing.dateDebut) dateData.dateDebut = new Date();
    if (statut === 'TERMINEE' && !existing.dateFin) dateData.dateFin = new Date();
    if (statut === 'EN_ATTENTE' && technicienId === null) {
      dateData.dateDebut = null;
      dateData.dateFin = null;
    }
    if (statut && statut !== 'TERMINEE') {
      dateData.validee = false;
      dateData.dateValidation = null;
    }
    if (validee === true) {
      dateData.validee = true;
      dateData.dateValidation = existing.dateValidation || new Date();
    }
    if (validee === false) {
      dateData.validee = false;
      dateData.dateValidation = null;
    }

    const intervention = await prisma.intervention.update({
      where: { id: interventionId },
      data: {
        ...(titre !== undefined && { titre: normalizeText(titre) }),
        ...(description !== undefined && { description: normalizeText(description) }),
        ...(adresse !== undefined && { adresse: normalizeText(adresse) }),
        ...(latitude !== undefined && { latitude: parseOptionalFloat(latitude) }),
        ...(longitude !== undefined && { longitude: parseOptionalFloat(longitude) }),
        ...(priorite && { priorite }),
        ...(statut && { statut }),
        ...(datePlanifiee !== undefined && {
          datePlanifiee: datePlanifiee ? new Date(datePlanifiee) : null,
        }),
        ...(technicienId === null
          ? { technicienId: null }
          : technicienId !== undefined
            ? { technicienId: parseOptionalInt(technicienId) }
            : {}),
        ...dateData,
      },
      include: interventionInclude,
    });

    await createNotifications(
      buildNotificationPayloadsForUpdate(existing, intervention, req.user)
    );

    res.json({
      success: true,
      data: intervention,
      message: 'Intervention mise a jour avec succes.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise a jour.' });
  }
};

// DELETE /api/interventions/:id
const deleteIntervention = async (req, res) => {
  try {
    const { id } = req.params;

    const interventionId = parseInt(id, 10);
    const existing = await prisma.intervention.findUnique({ where: { id: interventionId } });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Intervention introuvable.' });
    }

    if (existing.statut === 'EN_COURS') {
      return res.status(400).json({ success: false, message: 'Impossible de supprimer une intervention en cours.' });
    }

    await prisma.intervention.delete({ where: { id: interventionId } });

    res.json({ success: true, message: 'Intervention supprimee.' });
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
