/**
 * Logic for intervention business rules and notifications
 */

/**
 * Validates if a technician is allowed to perform specific updates
 */
const validateTechnicianUpdate = ({ existing, payload }) => {
  const forbiddenFields = ['titre', 'description', 'adresse', 'latitude', 'longitude', 'priorite', 'datePlanifiee'];
  const changedForbiddenField = forbiddenFields.some((field) => payload[field] !== undefined && payload[field] !== existing[field]);

  if (changedForbiddenField) {
    return 'Un technicien ne peut pas modifier les details ou la priorite d une intervention.';
  }

  if (payload.technicienId === null) {
    if (!['EN_ATTENTE', 'EN_COURS'].includes(existing.statut)) {
      return 'Le refus n est possible que pour une intervention en attente ou en cours.';
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

/**
 * Builds notification messages based on status
 */
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

/**
 * Logic to determine who to notify after an update
 */
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

    if (after.responsable?.utilisateur?.id) {
       payloads.push({
         titre: 'Intervention REFUSÉE par le technicien',
         message: `Le technicien ${before.technicien.utilisateur.prenom} ${before.technicien.utilisateur.nom} a refusé l'intervention "${after.titre}". Elle est de retour en attente.`,
         interventionId: after.id,
         userId: after.responsable.utilisateur.id,
       });
    }
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

module.exports = {
  validateTechnicianUpdate,
  buildStatusNotificationMessage,
  buildNotificationPayloadsForUpdate
};
