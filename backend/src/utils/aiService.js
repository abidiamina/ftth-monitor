const axios = require('axios');
const prisma = require('../config/prisma');
const { sendOutageAlertEmail } = require('./emailService');

// Suivi des dernières alertes envoyées par zone (évite le spam)
const lastOutageAlerts = {};

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
  // 1. Récupérer les zones des techniciens existants
  const techniciens = await prisma.technicien.findMany({ select: { zone: true } });
  const techZones = techniciens.map(t => t.zone).filter(Boolean);

  // 2. Récupérer les adresses des interventions non assignées pour en faire des zones dynamiques
  const unassigned = await prisma.intervention.findMany({
    where: { technicienId: null },
    select: { adresse: true }
  });
  const unassignedZones = unassigned.map(i => i.adresse).filter(Boolean);

  // Fusionner toutes les zones uniques (Techniciens + Adresses des pannes non assignées)
  const allZones = [...new Set([...techZones, ...unassignedZones])];
  const targetZones = allZones.length > 0 ? allZones : ['Zone Nord', 'Zone Sud'];

  const predictions = await Promise.all(targetZones.map(async (zone) => {
    // Récupération de l'historique pour le modèle Random Forest
    // Isole correctement les risques : on cible la zone du technicien OU l'adresse de la panne non assignée
    const historique = await prisma.intervention.findMany({
      where: {
        OR: [
          { technicien: { zone: zone } },
          { technicienId: null, adresse: { contains: zone, mode: 'insensitive' } }
        ]
      },
      take: 30,
      orderBy: { dateCreation: 'desc' },
      select: { dateCreation: true, priorite: true, statut: true, technicienId: true }
    });

    // Scénario Alternatif : S'il n'y a absolument aucune donnée
    if (historique.length === 0) {
      return {
        zone,
        probability: 0,
        riskLevel: 'Faible',
        recommendation: 'Aucun incident récent. Réseau stable.',
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
          ? '🚨 Alerte NOC ! Intervention préventive recommandée .' 
          : 'Surveillance réseau standard.',
        updatedAt: new Date()
      };
    } catch (error) {
      console.warn(`Microservice Random Forest inaccessible pour ${zone}. Utilisation du moteur de secours basé sur les données réelles.`);
      
      // Calcul dynamique basé sur l'historique réel
      let calculProbabilite = 10; // Base
      let impactInterventions = 0;
      let chargeCritique = 0;

      historique.forEach(interv => {
        let baseImpact = 0;
        if (interv.priorite === 'URGENTE') baseImpact = 35;
        else if (interv.priorite === 'HAUTE') baseImpact = 20;
        else baseImpact = 10;

        // La logique d'atténuation du risque : affecter/résoudre diminue le risque
        if (!interv.technicienId) {
          // Non assignée : Risque maximal (Panne non prise en charge)
          calculProbabilite += baseImpact;
          impactInterventions += baseImpact;
          chargeCritique += 15;
        } else if (interv.statut === 'EN_ATTENTE') {
          // Assignée au technicien mais pas encore démarrée : Le risque diminue
          calculProbabilite += (baseImpact * 0.4);
          impactInterventions += (baseImpact * 0.4);
          chargeCritique += 5;
        } else if (interv.statut === 'EN_COURS') {
          // En cours de résolution : Le risque s'effondre
          calculProbabilite += (baseImpact * 0.1);
        } else if (interv.statut === 'TERMINEE' || interv.statut === 'ANNULEE') {
          // Résolue : Diminue le risque global de la zone
          calculProbabilite -= 5;
        }
      });

      const probability = Math.max(0, Math.min(98, Math.round(calculProbabilite)));
      let riskLevel = 'Faible';
      let color = 'emerald';
      let trend = 'STABLE';
      let recommendation = 'Le réseau fonctionne normalement (Analyse de secours).';

      if (probability >= 70) {
        riskLevel = 'Élevé';
        color = 'rose';
        trend = 'UP';
        recommendation = '🚨 Alerte NOC ! Risque de panne détecté (Analyse de secours).';
      } else if (probability >= 40) {
        riskLevel = 'Moyen';
        color = 'amber';
        trend = 'UP';
        recommendation = 'Surveillance réseau renforcée requise.';
      }

      return {
        zone,
        probability,
        riskLevel,
        trend,
        color,
        factors: {
          weather: { label: 'Météo', value: 'Dégagé', impact: 10 },
          incidents: { label: 'Historique', value: `${historique.length} Interv.`, impact: Math.min(50, impactInterventions) },
          criticality: { label: 'Charge', value: riskLevel === 'Faible' ? 'Optimale' : (riskLevel === 'Moyen' ? 'Modérée' : 'Critique'), impact: Math.min(40, chargeCritique) }
        },
        recommendation,
        updatedAt: new Date()
      };
    }
  }));

  // Trier les prédictions par risque décroissant (les plus critiques en premier)
  predictions.sort((a, b) => b.probability - a.probability);

  // === ENVOI AUTOMATIQUE D'ALERTE AUX RESPONSABLES ===
  // Notification envoyée si la probabilité de panne atteint ou dépasse 50%
  const alertPredictions = predictions.filter(p => p.probability >= 50);
  if (alertPredictions.length > 0) {
    const now = Date.now();
    
    // Vérifier si on doit envoyer des alertes (cooldown d'une heure par zone)
    const zonesToAlert = alertPredictions.filter(p => !lastOutageAlerts[p.zone] || (now - lastOutageAlerts[p.zone]) > 3600000);
    
    if (zonesToAlert.length > 0) {
      try {
        const responsables = await prisma.utilisateur.findMany({
          where: { role: 'RESPONSABLE', actif: true },
          select: { email: true }
        });

        if (responsables.length > 0) {
          for (const p of zonesToAlert) {
            lastOutageAlerts[p.zone] = now; // Mettre à jour le timestamp

            responsables.forEach(resp => {
              sendOutageAlertEmail({
                to: resp.email,
                zone: p.zone,
                probability: p.probability,
                recommendation: p.recommendation
              }).catch(err => console.error(`[Alerte NOC] Échec email pour ${resp.email}:`, err));
            });
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des responsables pour l\'alerte NOC:', error);
      }
    }
  }

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
