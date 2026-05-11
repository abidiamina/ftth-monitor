const aiService = require('../utils/aiService');
const prisma = require('../config/prisma');

const getOutagePredictions = async (req, res) => {
  try {
    const predictions = await aiService.predictOutages();
    res.json(predictions);
  } catch (error) {
    console.error('Erreur prédictions IA:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des prédictions IA' });
  }
};

const getPersonalizedMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: { prenom: true, nom: true, role: true }
    });

    if (!user) {
      return res.status(44).json({ message: 'Utilisateur non trouvé' });
    }

    const message = await aiService.generatePersonalizedMessage(user);
    res.json({ message });
  } catch (error) {
    console.error('Erreur message personnalisé IA:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du message personnalisé' });
  }
};

const getSentimentStats = async (req, res) => {
  try {
    const stats = await prisma.intervention.groupBy({
      by: ['clientFeedbackSentiment'],
      _count: {
        id: true
      },
      where: {
        clientFeedbackSentiment: { not: null }
      }
    });

    res.json(stats);
  } catch (error) {
    console.error('Erreur stats sentiment IA:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques de sentiment' });
  }
};

module.exports = {
  getOutagePredictions,
  getPersonalizedMessage,
  getSentimentStats
};
