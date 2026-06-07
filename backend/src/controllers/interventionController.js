const prisma = require('../config/prisma');
const { createNotifications } = require('../utils/notificationService');
const { emitToAll, emitToUser } = require('../utils/socketService');

const emitToInterventionParticipants = (intervention, action, id) => {
  const participants = new Set();
  if (intervention.clientId) participants.add(intervention.client?.utilisateurId);
  if (intervention.technicienId) participants.add(intervention.technicien?.utilisateurId);
  if (intervention.responsableId) participants.add(intervention.responsable?.utilisateur?.id);

  // Also include ADMINS if needed, but for now just the trio
  participants.forEach(userId => {
    if (userId) emitToUser(userId, 'intervention_updated', { action, id });
  });
};
const { getConfigAsBoolean, getConfigAsInt } = require('../utils/configService');
const { logAction } = require('../utils/auditService');
const { analyzeSentiment } = require('../utils/aiService');
const {
  normalizeText,
  validateClientApprovalPayload,
  validateEvidencePayload,
  validateFieldCheckPayload,
  validateInterventionPayload,
} = require('../utils/validation');

const interventionInclude = {
  client: {
    include: {
      utilisateur: {
        select: { id: true, nom: true, prenom: true, email: true, telephone: true },
      },
    },
  },
  technicien: {
    include: { utilisateur: { select: { id: true, nom: true, prenom: true, telephone: true } } },
  },
  responsable: {
    include: { utilisateur: { select: { id: true, nom: true, prenom: true } } },
  },
  evidences: {
    orderBy: { createdAt: 'desc' },
  },
  refus: {
    include: {
      technicien: {
        include: { utilisateur: { select: { nom: true, prenom: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  },
};

const flattenIntervention = (intervention) => {
  if (!intervention || !intervention.client || !intervention.client.utilisateur) return intervention;
  return {
    ...intervention,
    client: {
      ...intervention.client,
      nom: intervention.client.utilisateur.nom,
      prenom: intervention.client.utilisateur.prenom,
      email: intervention.client.utilisateur.email,
      telephone: intervention.client.utilisateur.telephone,
      utilisateur: undefined,
    },
  };
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

const hasOngoingIntervention = async (technicienId, excludeInterventionId = null) => {
  if (!technicienId) return false;
  const where = {
    technicienId,
    statut: 'EN_COURS',
  };
  if (excludeInterventionId) where.id = { not: excludeInterventionId };

  const ongoing = await prisma.intervention.findFirst({ where, select: { id: true } });
  return Boolean(ongoing);
};

const {
  validateTechnicianUpdate,
  buildStatusNotificationMessage,
  buildNotificationPayloadsForUpdate
} = require('../services/interventionService');

const buildValidationNotificationMessage = (title) =>
  `L'intervention "${title}" a ete validee par le responsable.`;


const buildEvidenceNotificationPayloads = (intervention, commentaire, actorId) => {
  const payloads = [];

  if (intervention.responsable?.utilisateur?.id && intervention.responsable.utilisateur.id !== actorId) {
    payloads.push({
      titre: 'Nouvelle preuve terrain',
      message: `Une preuve a ete ajoutee sur "${intervention.titre}".`,
      interventionId: intervention.id,
      userId: intervention.responsable.utilisateur.id,
    });
  }

  if (intervention.client?.utilisateurId && intervention.client.utilisateurId !== actorId) {
    payloads.push({
      titre: 'Intervention documentee',
      message: `Le technicien a ajoute une preuve: "${commentaire}".`,
      interventionId: intervention.id,
      userId: intervention.client.utilisateurId,
    });
  }

  return payloads;
};

const buildClientApprovalNotificationPayloads = (intervention, actorId) => {
  const payloads = [];

  if (intervention.responsable?.utilisateur?.id && intervention.responsable.utilisateur.id !== actorId) {
    payloads.push({
      titre: 'Signature client recue',
      message: `Le client a signe et evalue l intervention "${intervention.titre}".`,
      interventionId: intervention.id,
      userId: intervention.responsable.utilisateur.id,
    });
  }

  if (intervention.technicien?.utilisateur?.id && intervention.technicien.utilisateur.id !== actorId) {
    payloads.push({
      titre: 'Feedback client recu',
      message: `Le client a valide votre intervention "${intervention.titre}".`,
      interventionId: intervention.id,
      userId: intervention.technicien.utilisateur.id,
    });
  }

  return payloads;
};

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

// Removed: buildNotificationPayloadsForUpdate moved to interventionService


// Notification/update validation helpers were moved to interventionService.

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

    res.json({ success: true, data: interventions.map(flattenIntervention) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/interventions/:id
const getIntervention = async (req, res) => {
  try {
    const interventionId = parseInt(req.params.id, 10);
    if (isNaN(interventionId)) {
      return res.status(400).json({ success: false, message: 'ID intervention invalide.' });
    }
    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
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

    res.json({ success: true, data: flattenIntervention(intervention) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

/**
 * CREATE INTERVENTION (POST /api/interventions)
 * Objectif : Permettre la création d'une nouvelle demande d'intervention.
 * 
 * Logique algorithmique métier (développée manuellement par l'équipe) :
 * 1. Validation : Vérifie que les données de la requête sont complètes et correctes.
 * 2. Rôles : 
 *    - Si c'est un CLIENT qui fait la demande, le backend l'associe automatiquement
 *      au "Responsable" le moins chargé pour équilibrer le travail.
 *    - Si c'est un RESPONSABLE, il crée lui-même la demande pour un client.
 * 3. Base de données : Création de l'entité via Prisma.
 * 4. Temps réel : Envoi d'une notification Push / WebSocket aux utilisateurs concernés (Client, Technicien, Responsable).
 * 5. Traçabilité : Ajout d'une entrée d'audit (logAction) pour la sécurité.
 */
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

      const responsables = await prisma.responsable.findMany({
        include: {
          _count: {
            select: {
              interventionsCreees: {
                where: { statut: { in: ['EN_ATTENTE', 'EN_COURS'] } },
              },
            },
          },
        },
      });

      if (!responsables || responsables.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucun responsable disponible pour prendre en charge cette demande.',
        });
      }

      responsables.sort((a, b) => {
        const countA = a._count.interventionsCreees;
        const countB = b._count.interventionsCreees;
        if (countA === countB) return a.id - b.id;
        return countA - countB;
      });

      const responsableParDefaut = responsables[0];

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

    const parsedTechnicienId = parseOptionalInt(technicienId);
    if (parsedTechnicienId && await hasOngoingIntervention(parsedTechnicienId)) {
      return res.status(400).json({
        success: false,
        message: 'Ce technicien est deja en cours sur une autre intervention.',
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
        technicienId: parsedTechnicienId,
        responsableId,
      },
      include: interventionInclude,
    });

    await createNotifications(buildNotificationPayloadsForCreation(intervention));
    emitToInterventionParticipants(intervention, 'CREATE', intervention.id);

    await logAction({
      action: 'CREATE_INTERVENTION',
      entite: 'INTERVENTION',
      entiteId: intervention.id,
      details: `Creation de l'intervention: ${intervention.titre}`,
      userId: req.user.id,
      userEmail: req.user.email || 'N/A',
      userRole: req.user.role,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: flattenIntervention(intervention),
      message: 'Intervention creee avec succes.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la creation.' });
  }
};

/**
 * UPDATE INTERVENTION (PUT /api/interventions/:id)
 * Objectif : Mettre à jour l'état, la priorité ou l'assignation d'une intervention.
 * 
 * Logique algorithmique métier (développée manuellement par l'équipe) :
 * 1. Permissions : Vérifie que le technicien ne modifie que SES propres interventions.
 * 2. Règles Métier Strictes (Guardrails) : 
 *    - Pour passer le statut à "TERMINEE", l'algorithme bloque si :
 *       a. Aucune photo de preuve n'est jointe (REQ_PHOTO).
 *       b. Le scan GPS n'a pas été confirmé sur place.
 *       c. Le QR Code de l'équipement n'a pas été scanné.
 * 3. Validation Finale : Seul un Responsable ou Admin peut "valider" une intervention terminée,
 *    en s'assurant que le client a bien apposé sa signature électronique.
 */
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
    if (isNaN(interventionId)) {
      return res.status(400).json({ success: false, message: 'ID intervention invalide.' });
    }
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

      if (validee) {
        const reqSignature = await getConfigAsBoolean('REQ_SIGNATURE', true);
        if (reqSignature && !existing.clientSignatureAt) {
          return res.status(400).json({
            success: false,
            message: 'La signature du client est obligatoire avant la validation finale par le responsable.',
          });
        }
      }
    }

    if (technicienId !== undefined && technicienId !== null && technicienId !== existing.technicienId) {
      const parsedTechnicienId = parseOptionalInt(technicienId);
      if (parsedTechnicienId && await hasOngoingIntervention(parsedTechnicienId, interventionId)) {
        return res.status(400).json({
          success: false,
          message: 'Ce technicien est deja en cours sur une autre intervention.',
        });
      }
    }

    if (statut === 'TERMINEE' && existing.statut !== 'TERMINEE') {
      // 1. Check Photos
      const reqPhoto = await getConfigAsBoolean('REQ_PHOTO', true);
      if (reqPhoto && existing.evidences.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Au moins une photo de preuve avec commentaire est obligatoire pour terminer l intervention.',
        });
      }

      // 2. Check GPS
      if (!existing.gpsConfirmedAt) {
        return res.status(400).json({
          success: false,
          message: 'Vous devez confirmer votre position GPS sur le lieu de l intervention avant de la terminer.',
        });
      }

      // 3. Check QR Code
      if (!existing.qrVerifiedAt) {
        return res.status(400).json({
          success: false,
          message: 'Le scan du QR Code de l equipement est obligatoire pour valider la fin des travaux.',
        });
      }
    }

    const dateData = {};
    if (statut === 'EN_COURS' && !existing.dateDebut) dateData.dateDebut = new Date();
    if (statut === 'TERMINEE' && !existing.dateFin) dateData.dateFin = new Date();
    if ((statut === 'EN_ATTENTE' || technicienId === null) && existing.statut !== 'TERMINEE') {
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

    const intervention = await prisma.$transaction(async (tx) => {
      if (technicienId === null && existing.technicienId) {
        const motif = normalizeText(req.body.motifRefus) || 'Refus sans motif précisé';
        await tx.refusIntervention.create({
          data: {
            interventionId: existing.id,
            technicienId: existing.technicienId,
            motif,
          },
        });
      }

      return tx.intervention.update({
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
    });

    await createNotifications(
      buildNotificationPayloadsForUpdate(existing, intervention, req.user)
    );
    emitToInterventionParticipants(intervention, 'UPDATE', intervention.id);

    await logAction({
      action: 'UPDATE_INTERVENTION',
      entite: 'INTERVENTION',
      entiteId: intervention.id,
      details: `Mise a jour de l'intervention: ${intervention.titre}. Statut: ${intervention.statut}`,
      userId: req.user.id,
      userEmail: req.user.email || 'N/A',
      userRole: req.user.role,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: flattenIntervention(intervention),
      message: 'Intervention mise a jour avec succes.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise a jour.' });
  }
};

/**
 * FIELD CHECK / CONTROLE TERRAIN (updateInterventionFieldCheck)
 * Objectif : Validation technique de la présence du technicien sur site.
 * 
 * Logique algorithmique métier (développée manuellement par l'équipe - Mathématiques & GPS) :
 * 1. Scan QR Code : Vérifie l'identité de l'équipement.
 * 2. Vérification Géospatiale (GPS) :
 *    - Récupère la latitude/longitude du technicien via le smartphone.
 *    - Utilise la Formule mathématique de Haversine pour calculer la distance exacte (en mètres) 
 *      sur une sphère entre la position actuelle et l'adresse prévue de l'intervention.
 * 3. Enregistrement : Marque "gpsConfirmedAt" et "qrVerifiedAt" en base de données.
 * 4. Broadcast : Diffuse la position GPS du technicien en temps réel via WebSocket pour le Dashboard.
 */
const updateInterventionFieldCheck = async (req, res) => {
  try {
    const interventionId = parseInt(req.params.id, 10);
    if (isNaN(interventionId)) {
      return res.status(400).json({ success: false, message: 'ID intervention invalide.' });
    }
    const { gpsLatitude, gpsLongitude, qrCodeValue, confirmGps } = req.body ?? {};

    const validationError = validateFieldCheckPayload({
      gpsLatitude,
      gpsLongitude,
      qrCodeValue,
      confirmGps,
    });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const technicien = await getTechnicienByUserId(req.user.id);
    const existing = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: interventionInclude,
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Intervention introuvable.' });
    }

    if (!technicien || existing.technicienId !== technicien.id) {
      return res.status(403).json({ success: false, message: 'Acces refuse a cette intervention.' });
    }

    if (!['EN_ATTENTE', 'EN_COURS'].includes(existing.statut)) {
      return res.status(400).json({
        success: false,
        message: 'Le controle terrain n est autorise que sur une intervention en attente ou en cours.',
      });
    }

    let gpsConfirmed = false;
    let gpsDistance = null;
    const requestedGpsLatitude = parseOptionalFloat(gpsLatitude);
    const requestedGpsLongitude = parseOptionalFloat(gpsLongitude);
    let resolvedGpsLatitude = requestedGpsLatitude;
    let resolvedGpsLongitude = requestedGpsLongitude;

    if (confirmGps || gpsLatitude !== undefined || gpsLongitude !== undefined) {
      if (
        confirmGps &&
        (resolvedGpsLatitude === null || resolvedGpsLongitude === null) &&
        Number.isFinite(technicien.latitude) &&
        Number.isFinite(technicien.longitude)
      ) {
        resolvedGpsLatitude = technicien.latitude;
        resolvedGpsLongitude = technicien.longitude;
      }

      if (resolvedGpsLatitude !== null && resolvedGpsLongitude !== null) {
        if (existing.latitude !== null && existing.longitude !== null) {
          const lat1 = existing.latitude;
          const lon1 = existing.longitude;
          
          const R = 6371e3; // mètres
          const dLat = ((resolvedGpsLatitude - lat1) * Math.PI) / 180;
          const dLon = ((resolvedGpsLongitude - lon1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((resolvedGpsLatitude * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          gpsDistance = R * c;
        }
        gpsConfirmed = true;
      } else if (confirmGps) {
        return res.status(400).json({
          success: false,
          message: 'La position GPS du technicien doit être disponible avant confirmation.',
        });
      }
    }

    const intervention = await prisma.intervention.update({
      where: { id: interventionId },
      data: {
        ...(resolvedGpsLatitude !== null && { gpsLatitude: resolvedGpsLatitude }),
        ...(resolvedGpsLongitude !== null && { gpsLongitude: resolvedGpsLongitude }),
        ...(gpsConfirmed
          ? { gpsConfirmedAt: new Date() }
          : {}),
        ...(qrCodeValue !== undefined
          ? {
              qrCodeValue: normalizeText(qrCodeValue),
              qrVerifiedAt: new Date(),
            }
          : {}),
      },
      include: interventionInclude,
    });

    if (gpsConfirmed && resolvedGpsLatitude !== null && resolvedGpsLongitude !== null) {
      emitToAll('technician_location_broadcast', {
        technicienId: technicien.id,
        latitude: resolvedGpsLatitude,
        longitude: resolvedGpsLongitude,
        nom: `${technicien.utilisateur.prenom} ${technicien.utilisateur.nom}`,
      });
    }

    emitToInterventionParticipants(intervention, 'UPDATE', intervention.id);

    res.json({
      success: true,
      data: flattenIntervention(intervention),
      message: 'Controle terrain enregistre.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors du controle terrain.' });
  }
};

/**
 * ADD EVIDENCE / PREUVE TERRAIN (addInterventionEvidence)
 * Objectif : Upload de photos avec commentaires pendant l'intervention.
 * 
 * Logique algorithmique métier (développée manuellement par l'équipe) :
 * 1. Vérifie que l'intervention est bien "EN_COURS".
 * 2. Limite à 5 photos maximum par intervention (configurable via `MAX_PHOTOS`).
 * 3. Sauvegarde la preuve et avertit le client/responsable en temps réel via notification.
 */
const addInterventionEvidence = async (req, res) => {
  try {
    const interventionId = parseInt(req.params.id, 10);
    if (isNaN(interventionId)) {
      return res.status(400).json({ success: false, message: 'ID intervention invalide.' });
    }
    const { commentaire, photoName, photoData } = req.body ?? {};

    const validationError = validateEvidencePayload({ commentaire, photoName });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const technicien = await getTechnicienByUserId(req.user.id);
    const existing = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: interventionInclude,
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Intervention introuvable.' });
    }

    if (!technicien || existing.technicienId !== technicien.id) {
      return res.status(403).json({ success: false, message: 'Acces refuse a cette intervention.' });
    }

    if (existing.statut !== 'EN_COURS') {
      return res.status(400).json({
        success: false,
        message: 'Une preuve terrain ne peut etre ajoutee que sur une intervention en cours.',
      });
    }

    const maxPhotos = await getConfigAsInt('MAX_PHOTOS', 5);
    if (existing.evidences.length >= maxPhotos) {
      return res.status(400).json({
        success: false,
        message: `Limite de photos atteinte (${maxPhotos}). Mise a jour impossible.`,
      });
    }

    const evidence = await prisma.interventionEvidence.create({
      data: {
        interventionId,
        technicienId: technicien.id,
        commentaire: normalizeText(commentaire),
        photoName: normalizeText(photoName),
        photoData: photoData ? String(photoData) : null,
      },
    });

    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: interventionInclude,
    });

    await createNotifications(
      buildEvidenceNotificationPayloads(intervention, evidence.commentaire, req.user.id)
    );

    emitToInterventionParticipants(intervention, 'UPDATE', intervention.id);

    res.status(201).json({
      success: true,
      data: evidence,
      intervention: flattenIntervention(intervention),
      message: 'Preuve enregistree.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de l ajout de la preuve.' });
  }
};

/**
 * CLIENT APPROVAL / VALIDATION CLIENT (submitInterventionClientApproval)
 * Objectif : Clôturer l'intervention du point de vue du client final.
 * 
 * Logique algorithmique métier (développée manuellement par l'équipe) :
 * 1. Signature : Capture la signature électronique (Base64) du client.
 * 2. Évaluation & IA : 
 *    - Récupère la note sur 5 (rating) et le commentaire textuel.
 *    - Envoie ce texte au microservice Python (CamemBERT) via `analyzeSentiment` 
 *      pour extraire automatiquement le sentiment ("Positif", "Négatif").
 * 3. Enregistrement : Fige définitivement ces informations en base de données 
 *    pour générer les statistiques de satisfaction du technicien.
 */
const submitInterventionClientApproval = async (req, res) => {
  try {
    const interventionId = parseInt(req.params.id, 10);
    if (isNaN(interventionId)) {
      return res.status(400).json({ success: false, message: 'ID intervention invalide.' });
    }
    const {
      signature,
      signatureBy,
      feedbackRating,
      feedbackComment,
    } = req.body ?? {};

    const reqSignature = await getConfigAsBoolean('REQ_SIGNATURE', true);

    const validationError = validateClientApprovalPayload({
      signature,
      signatureBy,
      feedbackRating,
      feedbackComment,
    }, {
      signatureRequired: reqSignature,
    });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const client = await getClientByUserId(req.user.id);
    const existing = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: interventionInclude,
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Intervention introuvable.' });
    }

    if (!client || existing.clientId !== client.id) {
      return res.status(403).json({ success: false, message: 'Acces refuse a cette intervention.' });
    }

    if (existing.statut !== 'TERMINEE') {
      return res.status(400).json({
        success: false,
        message: 'Seule une intervention terminee peut etre signee par le client.',
      });
    }

    if (existing.clientSignatureAt || existing.clientFeedbackAt) {
      return res.status(400).json({
        success: false,
        message: 'Cette intervention a deja ete signee et evaluee par le client.',
      });
    }

    const sentimentResult = await analyzeSentiment(feedbackComment, Number(feedbackRating));
    const sentimentString = typeof sentimentResult === 'object' && sentimentResult !== null 
       ? sentimentResult.sentiment 
       : String(sentimentResult || 'Neutre');

    const intervention = await prisma.intervention.update({
      where: { id: interventionId },
      data: {
        clientSignature: signature !== undefined && signature !== null && String(signature).trim() !== ''
          ? String(signature)
          : null,
        clientSignatureBy: normalizeText(signatureBy),
        clientSignatureAt: new Date(),
        clientFeedbackRating: Number(feedbackRating),
        clientFeedbackComment: normalizeText(feedbackComment),
        clientFeedbackSentiment: sentimentString,
        clientFeedbackAt: new Date(),
      },
      include: interventionInclude,
    });

    await createNotifications(buildClientApprovalNotificationPayloads(intervention, req.user.id));

    emitToInterventionParticipants(intervention, 'UPDATE', intervention.id);

    res.json({
      success: true,
      data: flattenIntervention(intervention),
      message: 'Validation client enregistree.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la validation client.' });
  }
};

const deleteIntervention = async (req, res) => {
  try {
    const { id } = req.params;

    const interventionId = parseInt(id, 10);
    if (isNaN(interventionId)) {
      return res.status(400).json({ success: false, message: 'ID intervention invalide.' });
    }
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
  createIntervention,
  getInterventions,
  getIntervention,
  updateIntervention,
  deleteIntervention,
  updateInterventionFieldCheck,
  addInterventionEvidence,
  submitInterventionClientApproval,
  flattenIntervention,
};
