const aiService = require('../utils/aiService');
const prisma = require('../config/prisma');

const getOutagePredictions = async (req, res) => {
  try {
    const predictions = await aiService.predictOutages();
    res.json(predictions);
  } catch (error) {
    console.error('Erreur predictions IA:', error);
    res.status(500).json({ message: 'Erreur lors de la recuperation des predictions IA' });
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
      return res.status(404).json({ message: 'Utilisateur non trouve' });
    }

    const requestedRole = typeof req.query.role === 'string' ? req.query.role.toUpperCase() : null;
    const role = req.user.role === 'ADMIN' && requestedRole ? requestedRole : user.role;

    const messagePayload = await aiService.generatePersonalizedMessage({
      ...user,
      role
    });
    res.json(messagePayload);
  } catch (error) {
    console.error('Erreur message personnalise IA:', error);
    res.status(500).json({ message: 'Erreur lors de la generation du message personnalise' });
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
    res.status(500).json({ message: 'Erreur lors de la recuperation des statistiques de sentiment' });
  }
};

const testSentiment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Le texte est requis' });
    }

    const result = await aiService.analyzeSentiment(text);
    res.json(result);
  } catch (error) {
    console.error('Erreur test sentiment:', error);
    res.status(500).json({ message: 'Erreur lors du test du sentiment' });
  }
};

module.exports = {
  getOutagePredictions,
  getPersonalizedMessage,
  getSentimentStats,
  testSentiment
};
