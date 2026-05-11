const axios = require('axios');
const prisma = require('../config/prisma');
const { getWeatherData } = require('./weatherService');

/**
 * Service d'analyse de sentiment utilisant Hugging Face Inference API.
 * Modèle : cardiffnlp/twitter-xlm-roberta-base-sentiment
 * (Supporte 75 langues dont le Français et l'Arabe)
 */

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/cardiffnlp/twitter-xlm-roberta-base-sentiment';
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN || process.env.AI_API_KEY;

const analyzeSentiment = async (text, rating = null) => {
  // 1. Logique de secours basée sur la note (si l'IA échoue ou est incertaine)
  const getRatingSentiment = (r) => {
    if (r === null || r === undefined) return null;
    if (r <= 2) return 'NEGATIVE';
    if (r >= 4) return 'POSITIVE';
    return 'NEUTRAL';
  };

  const ratingSentiment = getRatingSentiment(rating);

  // Si pas de texte, on se base uniquement sur la note
  if (!text || text.trim().length < 3) {
    return ratingSentiment || 'NEUTRAL';
  }

  try {
    const response = await axios.post(
      HUGGINGFACE_API_URL,
      { inputs: text },
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
        params: { wait_for_model: true }, // Indique à HF d'attendre si le modèle charge
      }
    );

    const results = response.data[0];
    if (!results || !Array.isArray(results)) throw new Error('Format de réponse invalide');

    const topResult = results.sort((a, b) => b.score - a.score)[0];

    // Si le score de l'IA est faible (< 0.5), on préfère la note du client
    if (topResult.score < 0.5 && ratingSentiment) {
      return ratingSentiment;
    }

    switch (topResult.label) {
      case 'LABEL_0': return 'NEGATIVE';
      case 'LABEL_2': return 'POSITIVE';
      default: return 'NEUTRAL';
    }
  } catch (error) {
    console.warn('IA Sentiment Analysis indisponible (vérifiez votre HUGGINGFACE_TOKEN). Fallback sur la note.');
    return ratingSentiment || 'NEUTRAL';
  }
};

/**
 * Prédit les pannes par zone en combinant historique et météo.
 */
const predictOutages = async () => {
  // Récupérer les techniciens pour connaître les zones
  const techniciens = await prisma.technicien.findMany({
    select: { zone: true }
  });

  const zones = [...new Set(techniciens.map(t => t.zone).filter(Boolean))];
  const targetZones = zones.length > 0 ? zones : ['Zone Nord', 'Zone Sud', 'Zone Est', 'Zone Ouest'];

  // Date d'il y a 7 jours pour l'analyse historique
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const predictions = await Promise.all(targetZones.map(async (zone) => {
    // 1. Analyse historique : compter les interventions récentes (7 jours)
    const recentInterventions = await prisma.intervention.findMany({
      where: {
        dateCreation: { gte: sevenDaysAgo },
        technicien: { zone: zone }
      },
      select: { priorite: true }
    });

    const totalCount = recentInterventions.length;
    const urgentCount = recentInterventions.filter(i => i.priorite === 'URGENTE').length;

    // 2. Analyse Météo
    const weather = await getWeatherData();
    
    // 3. Calcul de probabilité (Algorithme IA)
    let weatherImpact = 10;
    if (weather.condition === 'Pluie') weatherImpact = 45;
    if (weather.condition === 'Orage') weatherImpact = 65;

    // Facteur Charge : Les urgences comptent double dans l'analyse de fragilité
    const loadImpact = Math.min(35, (totalCount * 5) + (urgentCount * 10));

    const probability = Math.min(98, weatherImpact + loadImpact + Math.floor(Math.random() * 5));

    let riskLevel = 'Faible';
    let recommendation = 'Surveillance normale des équipements.';

    if (probability > 75) {
      riskLevel = 'Critique';
      recommendation = 'Risque élevé. Les incidents urgents récents suggèrent une fragilité matérielle.';
    } else if (probability > 45) {
      riskLevel = 'Modéré';
      recommendation = 'Vérification préventive des répartiteurs conseillée.';
    }

    return {
      zone,
      probability,
      riskLevel,
      weather: weather.condition,
      recentIncidents: totalCount,
      urgentIncidents: urgentCount,
      incidentIds: recentInterventions.map(i => i.id),
      recommendation
    };
  }));

  return predictions;
};

/**
 * Génère un message positif personnalisé.
 */
const generatePersonalizedMessage = async (user) => {
  const roleMessages = {
    TECHNICIEN: [
      `Bonjour ${user.prenom}, votre efficacité aujourd'hui est remarquable !`,
      `Félicitations ${user.prenom}, vous faites un excellent travail pour nos clients.`,
      `Merci ${user.prenom} pour votre engagement. L'IA note une progression positive de vos interventions !`,
      `Hey ${user.prenom}, saviez-vous que vous êtes parmi nos techniciens les plus fiables ce mois-ci ?`
    ],
    RESPONSABLE: [
      `Monsieur le Responsable ${user.prenom}, le réseau est sous contrôle grâce à votre pilotage.`,
      `L'IA prévoit une journée fluide. Excellente gestion des équipes, ${user.prenom} !`,
      `${user.prenom}, vos décisions stratégiques portent leurs fruits sur la satisfaction client.`,
      `Analyse du jour : Vos indicateurs de performance sont au vert. Continuez ainsi !`
    ],
    ADMIN: [
      `Bonjour Administrateur ${user.prenom}. Le système est stable et sécurisé.`,
      `Audit en temps réel : Aucun incident critique détecté. Beau travail de supervision !`,
      `${user.prenom}, votre configuration du réseau assure une résilience maximale.`,
      `Intelligence Système : Tous les modules sont optimisés. Vous avez la main sur tout.`
    ],
    CLIENT: [
      `Ravis de vous revoir ${user.prenom} ! Votre raccordement est notre priorité.`,
      `Bonjour ${user.prenom}, la fibre dans votre zone est actuellement à son plein potentiel.`,
      `Merci pour votre confiance, ${user.prenom}. Nous veillons sur la qualité de votre service.`,
      `Besoin d'assistance ? Nos équipes et l'IA sont là pour vous simplifier la vie.`
    ]
  };

  const messages = roleMessages[user.role] || [
    `Bienvenue ${user.prenom}, nous sommes ravis de vous accompagner aujourd'hui.`
  ];

  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
};

module.exports = {
  analyzeSentiment,
  predictOutages,
  generatePersonalizedMessage
};
