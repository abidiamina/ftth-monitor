const axios = require('axios');
const prisma = require('../config/prisma');
const { sendOutageAlertEmail } = require('./emailService');
const { getWeatherData } = require('./weatherService');
const { getConfigAsInt } = require('./configService');

// Suivi des dernières alertes envoyées par zone (évite le spam)
const lastOutageAlerts = {};

// URL du Microservice Python (FastAPI) décrit dans le rapport (Conception 5.7.1)
// Ce microservice intègre les modèles Random Forest et CamemBERT
const IA_MICROSERVICE_URL = process.env.IA_MICROSERVICE_URL || 'http://localhost:8001';
const IA_HTTP_TIMEOUT_MS = Number(process.env.IA_HTTP_TIMEOUT_MS || 10000);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const postIAWithRetry = async (path, payload, attempts = 2) => {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await axios.post(`${IA_MICROSERVICE_URL}${path}`, payload, { timeout: IA_HTTP_TIMEOUT_MS });
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) await sleep(300 * (i + 1));
    }
  }
  throw lastError;
};

const getIAWithRetry = async (path, attempts = 2) => {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await axios.get(`${IA_MICROSERVICE_URL}${path}`, { timeout: IA_HTTP_TIMEOUT_MS });
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) await sleep(300 * (i + 1));
    }
  }
  throw lastError;
};

const normalizeZoneKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const mapWeatherForModel = (weatherData) => ({
  condition: weatherData?.condition || 'Degage',
  wind_kmh: Number.isFinite(weatherData?.windSpeedKmh) ? weatherData.windSpeedKmh : 10,
  precip_mm: Number.isFinite(weatherData?.precipitationMm) ? weatherData.precipitationMm : 0,
});

const computeWeatherRiskDelta = (weatherData) => {
  if (!weatherData) return 0;
  let delta = 0;
  if (weatherData.condition === 'Orage') delta += 18;
  else if (weatherData.condition === 'Pluie') delta += 8;
  else if (weatherData.condition === 'Neige') delta += 12;
  if (Number.isFinite(weatherData.windSpeedKmh) && weatherData.windSpeedKmh >= 60) delta += 10;
  else if (Number.isFinite(weatherData.windSpeedKmh) && weatherData.windSpeedKmh >= 40) delta += 5;
  if (Number.isFinite(weatherData.precipitationMm) && weatherData.precipitationMm >= 12) delta += 8;
  else if (Number.isFinite(weatherData.precipitationMm) && weatherData.precipitationMm >= 5) delta += 4;
  return Math.max(0, Math.min(30, delta));
};

const normalizeSentimentLabel = (value) => {
  const raw = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (raw.startsWith('POS')) return 'Positif';
  if (raw.startsWith('NEG')) return 'Negatif';
  if (raw.startsWith('NEU')) return 'Neutre';
  return 'Neutre';
};

const normalizeTextForRules = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const hasAnyToken = (text, tokens) => tokens.some((token) => text.includes(token));

const resolveSentimentDeterministic = ({ text, rating, predicted }) => {
  const normalizedPredicted = normalizeSentimentLabel(predicted);
  const normalizedText = normalizeTextForRules(text);
  const safeRating = Number.isFinite(Number(rating)) ? Number(rating) : null;

  const veryNegativeWords = ['catastrophique', 'nul', 'honteux', 'inadmissible', 'foutage', 'remboursez', 'scandale', 'inacceptable'];
  const negativeWords = ['mauvais', 'panne', 'lent', 'probleme', 'decu', 'attente', 'colere', 'echec', 'pas'];
  const positiveWords = ['bon', 'merci', 'rapide', 'parfait', 'top', 'excellent', 'efficace', 'satisfait', 'super', 'bravo', 'genial'];

  if (hasAnyToken(normalizedText, veryNegativeWords)) return 'Negatif';
  if (safeRating !== null && safeRating >= 4) return 'Positif';
  if (safeRating !== null && safeRating <= 2) return 'Negatif';
  if (hasAnyToken(normalizedText, negativeWords)) return 'Negatif';
  if (hasAnyToken(normalizedText, positiveWords)) return 'Positif';
  return normalizedPredicted;
};

/**
 * US-34 : Analyse de sentiment des feedbacks clients (CamemBERT)
 * Communique avec le microservice FastAPI (Architecture Figure 5.2)
 */
const analyzeSentiment = async (text, rating = null) => {
  const normalizedText = String(text || '').trim();
  const normalizedRating = Number.isFinite(Number(rating)) ? Number(rating) : null;

  try {
    const response = await postIAWithRetry('/ia/analyze-sentiment', {
      text: normalizedText,
      rating: normalizedRating
    });
    const payload = response?.data || {};
    const finalSentiment = resolveSentimentDeterministic({
      text: normalizedText,
      rating: normalizedRating,
      predicted: payload.sentiment
    });

    return {
      ...payload,
      sentiment: finalSentiment,
      score: Number.isFinite(Number(payload.score)) ? Number(payload.score) : 0.5
    };
  } catch (error) {
    const finalSentiment = resolveSentimentDeterministic({
      text: normalizedText,
      rating: normalizedRating,
      predicted: 'Neutre'
    });
    return { sentiment: finalSentiment, score: 0.85, ia_used: false };
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

  // 2. Récupérer les adresses des interventions (assignées + non assignées)
  // pour éviter qu'une zone disparaisse après affectation.
  const withAddress = await prisma.intervention.findMany({
    where: { adresse: { not: '' } },
    select: { adresse: true }
  });
  const addressZones = withAddress.map(i => i.adresse).filter(Boolean);

  // Fusionner/dedupliquer avec une clé normalisée.
  const zoneMap = new Map();
  for (const zone of techZones) {
    const key = normalizeZoneKey(zone);
    if (key && !zoneMap.has(key)) zoneMap.set(key, { zone, source: 'TECH_ZONE' });
  }
  for (const zone of addressZones) {
    const key = normalizeZoneKey(zone);
    if (key && !zoneMap.has(key)) zoneMap.set(key, { zone, source: 'ADDRESS' });
  }
  const targetZones = zoneMap.size > 0
    ? Array.from(zoneMap.values())
    : [{ zone: 'Zone Nord', source: 'DEFAULT' }, { zone: 'Zone Sud', source: 'DEFAULT' }];

  const predictions = await Promise.all(targetZones.map(async ({ zone, source }) => {
    // Récupération de l'historique pour le modèle Random Forest
    // Isole correctement les risques : on cible la zone du technicien OU l'adresse de la panne non assignée
    const historique = await prisma.intervention.findMany({
      where: source === 'TECH_ZONE'
        ? { technicien: { zone } }
        : { adresse: { contains: zone, mode: 'insensitive' } },
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
      const weatherData = await getWeatherData({ zone });
      const weatherForModel = mapWeatherForModel(weatherData);
      const weatherRiskDelta = computeWeatherRiskDelta(weatherData);
      const response = await postIAWithRetry('/ia/predict-pannes', {
        zone,
        historique: historique.map(i => ({
          date: i.dateCreation.toISOString(),
          type: i.priorite,
          statut: i.statut,
          nb_incidents: i.priorite === 'URGENTE' ? 3 : 1
        })),
        weather: weatherForModel
      });

      const { probabilite } = response.data;

      const pendingCount = historique.filter(i => i.statut === 'EN_ATTENTE' || i.statut === 'EN_COURS').length;
      const completedCount = historique.filter(i => i.statut === 'TERMINEE' || i.statut === 'ANNULEE').length;
      const lastStatus = historique[0]?.statut; // historique is sorted desc by dateCreation
      const urgentCount = historique.filter(i => i.priorite === 'URGENTE').length;
      const highCount = historique.filter(i => i.priorite === 'HAUTE').length;

      // Keep model signal, then damp with operational progress so closures reduce risk.
      let adjustedProbability = Number.isFinite(probabilite) ? probabilite : 0;
      adjustedProbability += Math.min(20, pendingCount * 3);
      adjustedProbability -= Math.min(35, completedCount * 4);
      if (lastStatus === 'TERMINEE' || lastStatus === 'ANNULEE') adjustedProbability -= 20;
      if (lastStatus === 'EN_COURS') adjustedProbability -= 8;
      adjustedProbability += weatherRiskDelta;
      adjustedProbability = Math.max(1, Math.min(99, Math.round(adjustedProbability)));

      let adjustedRisk = 'Faible';
      if (adjustedProbability >= 70) adjustedRisk = 'Élevé';
      else if (adjustedProbability >= 40) adjustedRisk = 'Moyen';

      // Correspondance des couleurs ( Rouge/Orange/Vert)
      let color = 'emerald'; // Vert
      if (adjustedRisk === 'Élevé') color = 'rose'; // Rouge
      if (adjustedRisk === 'Moyen') color = 'amber'; // Orange

      const historyImpact = Math.max(5, Math.min(95, Math.round((urgentCount * 14) + (highCount * 8) + (pendingCount * 5) + (historique.length * 0.8))));
      const chargeImpact = Math.max(5, Math.min(95, Math.round((pendingCount * 16) - (completedCount * 7) + (lastStatus === 'EN_COURS' ? 10 : 0) + (lastStatus === 'TERMINEE' ? -10 : 0))));

      return {
        zone,
        probability: adjustedProbability,
        riskLevel: adjustedRisk,
        trend: adjustedProbability > 50 ? 'UP' : 'STABLE',
        color,
        factors: {
          weather: {
            label: 'Meteo (IA)',
            value: `${weatherData.condition} | vent ${weatherForModel.wind_kmh} km/h | pluie ${weatherForModel.precip_mm} mm`,
            impact: Math.max(5, Math.min(95, weatherRiskDelta * 3))
          },
          incidents: { label: 'Historique', value: `${historique.length} Interv.`, impact: historyImpact },
          criticality: { label: 'Charge', value: chargeImpact >= 65 ? 'Elevee' : (chargeImpact >= 35 ? 'Moderee' : 'Optimale'), impact: chargeImpact }
        },
        recommendation: adjustedRisk === 'Élevé' 
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
  // Notification envoyée si la probabilité de panne atteint ou dépasse le seuil configuré
  const threshold = await getConfigAsInt('AI_ALERT_THRESHOLD', 50);
  const cooldownMin = await getConfigAsInt('AI_ALERT_COOLDOWN', 60);
  const cooldownMs = cooldownMin * 60 * 1000;

  const alertPredictions = predictions.filter(p => p.probability >= threshold);
  if (alertPredictions.length > 0) {
    const now = Date.now();
    
    // Vérifier si on doit envoyer des alertes (cooldown dynamique par zone)
    const zonesToAlert = alertPredictions.filter(p => !lastOutageAlerts[p.zone] || (now - lastOutageAlerts[p.zone]) > cooldownMs);
    
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
    const response = await getIAWithRetry(`/ia/motivational-message/${user.role}`);
    return response.data;
  } catch (error) {
    // Fallback statique si le microservice est hors ligne
    const greetings = {
      ADMIN: `Bonjour ${user.prenom}, le système est sécurisé sous votre supervision.`,
      TECHNICIEN: `Bon courage pour vos interventions aujourd'hui, ${user.prenom} !`,
      RESPONSABLE: `Les indicateurs de performance sont excellents, ${user.prenom}.`,
      CLIENT: `Ravi de vous revoir ${user.prenom}, la qualité de votre connexion est notre priorité.`
    };
    return {
      message: greetings[user.role] || `Bienvenue sur la plateforme FTTH Monitoring, ${user.prenom}.`,
      ia_used: false
    };
  }
};

module.exports = {
  analyzeSentiment,
  predictOutages,
  generatePersonalizedMessage
};
