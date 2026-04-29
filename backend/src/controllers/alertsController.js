const prisma = require('../config/prisma');
const { getWeatherData } = require('../utils/weatherService');

// GET /api/alerts
const getActiveAlerts = async (req, res) => {
  try {
    const alerts = [];

    // 1. Critical Incidents (US-30)
    // We consider interventions with priority "URGENTE" or "HAUTE" that are still "EN_ATTENTE"
    const criticalInterventions = await prisma.intervention.findMany({
      where: {
        priorite: { in: ['URGENTE', 'HAUTE'] },
        statut: 'EN_ATTENTE',
      },
      include: { client: true },
    });

    criticalInterventions.forEach(interv => {
      alerts.push({
        type: 'CRITICAL_INCIDENT',
        severity: interv.priorite === 'URGENTE' ? 'CRITICAL' : 'HIGH',
        message: `Incident ${interv.priorite} en attente: "${interv.titre}"`,
        interventionId: interv.id,
        createdAt: interv.dateCreation,
      });
    });

    // 2. Delays (US-31)
    // Interventions past their planned date and not "TERMINEE"
    const now = new Date();
    const delayedInterventions = await prisma.intervention.findMany({
      where: {
        datePlanifiee: { lt: now },
        statut: { not: 'TERMINEE' },
        NOT: { datePlanifiee: null }
      },
    });

    delayedInterventions.forEach(interv => {
      alerts.push({
        type: 'DELAY',
        severity: 'MEDIUM',
        message: `Retard détecté sur l'intervention: "${interv.titre}"`,
        interventionId: interv.id,
        createdAt: interv.datePlanifiee,
      });
    });

    // 3. Technician Overload (US-31)
    // Check if any technician has > 3 active/planned interventions for today
    const technicians = await prisma.technicien.findMany({
      include: {
        utilisateur: { select: { nom: true, prenom: true } },
        _count: {
          select: {
            interventions: {
              where: {
                statut: { in: ['EN_ATTENTE', 'EN_COURS'] },
                // Simplified: just count total active
              }
            }
          }
        }
      }
    });

    const OVERLOAD_THRESHOLD = 5;
    technicians.forEach(tech => {
      if (tech._count.interventions >= OVERLOAD_THRESHOLD) {
        alerts.push({
          type: 'OVERLOAD',
          severity: 'MEDIUM',
          message: `Surcharge technicien: ${tech.utilisateur.prenom} ${tech.utilisateur.nom} (${tech._count.interventions} interventions actives)`,
          technicienId: tech.id,
        });
      }
    });

    // 4. Weather Risks (US-32)
    // Fetch global weather for the main zone (or iterate over active zones)
    const weather = await getWeatherData();
    if (weather.riskLevel !== 'Faible') {
      alerts.push({
        type: 'WEATHER',
        severity: weather.riskLevel === 'Haut' ? 'HIGH' : 'MEDIUM',
        message: `Alerte Météo: ${weather.condition}. ${weather.description}`,
        details: weather,
      });
    }

    res.json({
      success: true,
      data: alerts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la recuperation des alertes.' });
  }
};

module.exports = { getActiveAlerts };
