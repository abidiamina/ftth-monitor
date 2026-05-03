const axios = require('axios');

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

module.exports = {
  analyzeSentiment,
};
