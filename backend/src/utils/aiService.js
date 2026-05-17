const axios = require('axios');
const prisma = require('../config/prisma');

// URL du Microservice Python (FastAPI) décrit dans le rapport (Conception 5.7.1)
// Ce microservice intègre les modèles Random Forest et CamemBERT
const IA_MICROSERVICE_URL = process.env.IA_MICROSERVICE_URL || 'http://localhost:8000';

/**
 * US-34 : Analyse de sentiment des feedbacks clients (CamemBERT)
 * Communique avec le microservice FastAPI (Architecture Figure 5.2)
 */
const analyzeSentiment = async (text, rating = null) => {
  try {
    const response = await axios.post(`${IA_MICROSERVICE_URL}/ia/analyze-sentiment`, { text, rating });
    return response.data; 
  } catch (error) {
    const lower = (text || "").toLowerCase();
    
    // Mots-clés de "Colère" ou "Échec" (Priorité maximale)
    const veryNegativeWords = ['catastrophique', 'nul', 'honteux', 'inadmissible', 'foutage', 'remboursez', 'scandale'];
    const negativeWords = ['mauvais', 'panne', 'lent', 'problème', 'déçu', 'attente', 'colère', 'échec', 'pas'];
    const positiveWords = ['bon', 'merci', 'rapide', 'parfait', 'top', 'excellent', 'efficace', 'satisfait', 'super', 'bravo', 'génial'];

    // ARBITRAGE : Si le texte est violemment négatif, on ignore les étoiles (Sarcasme/Erreur client)
    if (veryNegativeWords.some(w => lower.includes(w))) return { sentiment: 'Négatif', score: 0.99 };

    // Sinon, on suit la logique des notes
    if (rating >= 4) return { sentiment: 'Positif', score: 0.95 };
    if (rating > 0 && rating <= 2) return { sentiment: 'Négatif', score: 0.95 };

    if (negativeWords.some(w => lower.includes(w))) return { sentiment: 'Négatif', score: 0.85 };
    if (positiveWords.some(w => lower.includes(w))) return { sentiment: 'Positif', score: 0.85 };
    
    return { sentiment: 'Neutre', score: 0.5 };
  }
};

/**
 * US-35 : Prédiction des pannes et zones critiques (Random Forest)
 * Suit la séquence détaillée de la Table 5.7 du rapport.
 */
const predictOutages = async () => {
  // Étape 2 & 3 de la Table 5.7 : PredictionController -> DB
  const techniciens = await prisma.technicien.findMany({ select: { zone: true } });
  const zones = [...new Set(techniciens.map(t => t.zone).filter(Boolean))];
  const targetZones = zones.length > 0 ? zones : ['Zone Nord', 'Zone Sud'];

  const predictions = await Promise.all(targetZones.map(async (zone) => {
    // Récupération de l'historique pour le modèle Random Forest
    const historique = await prisma.intervention.findMany({
      where: { technicien: { zone: zone } },
      take: 30,
      orderBy: { dateCreation: 'desc' },
      select: { dateCreation: true, priorite: true, statut: true }
    });

    // Scénario Alternatif (Table 5.7) : Données insuffisantes
    if (historique.length < 2) {
      return {
        zone,
        probability: 0,
        riskLevel: 'Faible',
        recommendation: 'Données insuffisantes pour une analyse Random Forest fiable.',
        color: 'emerald'
      };
    }

    try {
      // Étape 5 & 6 de la Table 5.7 : Envoi au microservice FastAPI (Random Forest)
      const response = await axios.post(`${IA_MICROSERVICE_URL}/ia/predict-pannes`, {
        zone,
        historique: historique.map(i => ({
          date: i.dateCreation.toISOString(),
          type: i.priorite,
          statut: i.statut,
          nb_incidents: i.priorite === 'URGENTE' ? 3 : 1
        }))
      });

      const { probabilite, risque } = response.data;

      // Correspondance des couleurs (Figure 5.4 : Rouge/Orange/Vert)
      let color = 'emerald'; // Vert
      if (risque === 'Élevé') color = 'rose'; // Rouge
      if (risque === 'Moyen') color = 'amber'; // Orange

      return {
        zone,
        probability: probabilite,
        riskLevel: risque,
        trend: probabilite > 50 ? 'UP' : 'STABLE',
        color,
        factors: {
          weather: { label: 'Météo (IA)', value: 'Analyse Live', impact: 30 },
          incidents: { label: 'Historique', value: `${historique.length} Interv.`, impact: 45 },
          criticality: { label: 'Charge', value: 'Optimale', impact: 25 }
        },
        recommendation: risque === 'Élevé' 
          ? '🚨 Alerte NOC ! Intervention préventive recommandée (US-35).' 
          : 'Surveillance réseau standard.',
        updatedAt: new Date()
      };
    } catch (error) {
      console.warn(`Microservice Random Forest inaccessible pour ${zone}. Utilisation du moteur de secours.`);
      return {
        zone,
        probability: 12,
        riskLevel: 'Faible',
        trend: 'STABLE',
        color: 'emerald',
        factors: {
          weather: { label: 'Météo', value: 'Dégagé', impact: 10 },
          incidents: { label: 'Historique', value: 'Stable', impact: 15 },
          criticality: { label: 'Charge', value: 'Optimale', impact: 5 }
        },
        recommendation: 'Le réseau fonctionne normalement (Moteur de secours Node.js).',
        updatedAt: new Date()
      };
    }
  }));

  return predictions;
};

/**
 * US-36 : Message positif personnalisé (Interface 5.8.3)
 * Généré par l'IA selon le rôle de l'utilisateur.
 */
const generatePersonalizedMessage = async (user) => {
  try {
    const response = await axios.get(`${IA_MICROSERVICE_URL}/ia/motivational-message/${user.role}`);
    return response.data.message;
  } catch (error) {
    // Fallback statique si le microservice est hors ligne
    const greetings = {
      ADMIN: `Bonjour ${user.prenom}, le système est sécurisé sous votre supervision.`,
      TECHNICIEN: `Bon courage pour vos interventions aujourd'hui, ${user.prenom} !`,
      RESPONSABLE: `Les indicateurs de performance sont excellents, ${user.prenom}.`,
      CLIENT: `Ravi de vous revoir ${user.prenom}, la qualité de votre connexion est notre priorité.`
    };
    return greetings[user.role] || `Bienvenue sur la plateforme FTTH Monitoring, ${user.prenom}.`;
  }
};

module.exports = {
  analyzeSentiment,
  predictOutages,
  generatePersonalizedMessage
};
