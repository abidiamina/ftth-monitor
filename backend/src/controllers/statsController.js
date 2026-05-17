const prisma = require('../config/prisma');
const { flattenIntervention } = require('./interventionController');

// GET /api/stats/dashboard
const getDashboardStats = async (req, res) => {
  try {
    const totalInterventions = await prisma.intervention.count();
    const completedInterventions = await prisma.intervention.count({ where: { statut: 'TERMINEE' } });
    const pendingInterventions = await prisma.intervention.count({ where: { statut: 'EN_ATTENTE' } });
    const ongoingInterventions = await prisma.intervention.count({ where: { statut: 'EN_COURS' } });

    // Success Rate (US-33)
    const successRate = totalInterventions > 0 ? (completedInterventions / totalInterventions) * 100 : 0;

    // Client Satisfaction (US-33)
    const evaluations = await prisma.intervention.findMany({
      where: { clientFeedbackRating: { not: null } },
      select: { clientFeedbackRating: true },
    });
    const avgSatisfaction = evaluations.length > 0 
      ? evaluations.reduce((acc, curr) => acc + curr.clientFeedbackRating, 0) / evaluations.length 
      : 0;

    // Interventions by month (for charts)
    // Simplified: just get last 6 months
    const statsByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const count = await prisma.intervention.count({
        where: {
          dateCreation: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });

      statsByMonth.push({ month: `${month} ${year}`, count });
    }

    res.json({
      success: true,
      data: {
        summary: {
          total: totalInterventions,
          completed: completedInterventions,
          pending: pendingInterventions,
          ongoing: ongoingInterventions,
          successRate: Math.round(successRate),
          avgSatisfaction: parseFloat(avgSatisfaction.toFixed(1)),
        },
        charts: {
          interventionsByMonth: statsByMonth,
        }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la recuperation des statistiques.' });
  }
};

// GET /api/stats/report
// For US-29: Generate data for a report
const getReportData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filters = {};
    if (startDate || endDate) {
      filters.dateCreation = {};
      if (startDate) filters.dateCreation.gte = new Date(startDate);
      if (endDate) filters.dateCreation.lte = new Date(endDate);
    }

    const interventions = await prisma.intervention.findMany({
      where: filters,
      include: {
        client: true,
        technicien: { include: { utilisateur: true } },
        responsable: { include: { utilisateur: true } },
      },
      orderBy: { dateCreation: 'desc' },
    });

    res.json({
      success: true,
      data: {
        generatedAt: new Date(),
        period: { start: startDate, end: endDate },
        total: interventions.length,
        interventions: interventions.map(flattenIntervention),
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la generation du rapport.' });
  }
};

// GET /api/stats/technicians
const getTechnicianPerformance = async (req, res) => {
  try {
    const technicians = await prisma.technicien.findMany({
      include: {
        utilisateur: {
          select: { nom: true, prenom: true }
        },
        interventions: {
          where: { statut: 'TERMINEE' },
          select: {
            clientFeedbackRating: true,
            clientFeedbackSentiment: true
          }
        }
      }
    });

    const performance = technicians.map(tech => {
      const totalTerminees = tech.interventions.length;
      
      const ratings = tech.interventions
        .filter(i => i.clientFeedbackRating !== null)
        .map(i => i.clientFeedbackRating);
      
      const avgRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : 0;

      const sentiments = tech.interventions.reduce((acc, curr) => {
        const s = curr.clientFeedbackSentiment || 'UNKNOWN';
        // Support pour les anciens labels (maj) et les nouveaux (Français rapport)
        if (s === 'POSITIVE' || s === 'Positif') acc.POSITIVE++;
        else if (s === 'NEGATIVE' || s === 'Négatif') acc.NEGATIVE++;
        else if (s === 'NEUTRAL' || s === 'Neutre') acc.NEUTRAL++;
        return acc;
      }, { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 });

      // Taux de satisfaction basé sur le sentiment positif
      const satisfactionRate = totalTerminees > 0 
        ? (sentiments.POSITIVE / totalTerminees) * 100 
        : 0;

      return {
        id: tech.id,
        nom: `${tech.utilisateur.prenom} ${tech.utilisateur.nom}`,
        totalTerminees,
        avgRating: parseFloat(avgRating.toFixed(1)),
        satisfactionRate: Math.round(satisfactionRate),
        sentiments
      };
    });

    res.json({
      success: true,
      data: performance.sort((a, b) => b.satisfactionRate - a.satisfactionRate)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors du calcul de la performance.' });
  }
};

module.exports = { getDashboardStats, getReportData, getTechnicianPerformance };
