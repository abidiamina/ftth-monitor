const prisma = require('../config/prisma');
const { createNotifications } = require('./notificationService');

/**
 * Vérifie les interventions en retard et envoie des notifications.
 * Une intervention est considérée en retard si sa date planifiée est passée 
 * et qu'elle n'est pas terminée ou annulée.
 */
const checkAndNotifyDelays = async () => {
  try {
    const now = new Date();
    
    // Récupérer les interventions en retard qui n'ont pas encore été notifiées pour le retard
    // On pourrait ajouter un champ 'delayNotified' dans le futur, 
    // mais pour le moment on va se baser sur une fenêtre de temps ou une logique simple.
    // Pour éviter de spammer, on ne notifie que si le retard est > 5 min et < 60 min (par exemple)
    // OU on vérifie si une notification de retard existe déjà pour cette intervention.
    
    const delayedInterventions = await prisma.intervention.findMany({
      where: {
        datePlanifiee: { lt: now },
        statut: { in: ['EN_ATTENTE', 'EN_COURS'] },
        // Logique anti-spam : on vérifie si une notification "Retard" a été envoyée dans les dernières 24h pour cette intervention
        notifications: {
          none: {
            titre: { contains: 'Retard' },
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
          }
        }
      },
      include: {
        technicien: { include: { utilisateur: true } },
        responsable: { include: { utilisateur: true } }
      }
    });

    if (delayedInterventions.length === 0) return;

    const notifications = [];

    for (const intervention of delayedInterventions) {
      const msg = `L'intervention #${intervention.id} (${intervention.titre}) prévue à ${intervention.datePlanifiee.toLocaleString('fr-FR')} est en retard.`;
      
      // Notif pour le technicien (si assigné)
      if (intervention.technicien?.utilisateur) {
        notifications.push({
          userId: intervention.technicien.utilisateur.id,
          interventionId: intervention.id,
          titre: '⚠️ Retard d\'Intervention',
          message: `Vous êtes en retard pour l'intervention #${intervention.id}. Veuillez mettre à jour le statut.`
        });
      }

      // Notif pour le responsable
      if (intervention.responsable?.utilisateur) {
        notifications.push({
          userId: intervention.responsable.utilisateur.id,
          interventionId: intervention.id,
          titre: '🚨 Alerte Retard Technicien',
          message: msg
        });
      }
    }

    if (notifications.length > 0) {
      await createNotifications(notifications);
      console.log(`[DelayService] ${notifications.length} notifications de retard envoyées.`);
    }

  } catch (error) {
    console.error('[DelayService] Erreur lors de la vérification des retards:', error);
  }
};

module.exports = { checkAndNotifyDelays };
