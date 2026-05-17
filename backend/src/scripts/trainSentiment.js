const { PrismaClient } = require('@prisma/client');
const { analyzeSentiment } = require('../utils/aiService');
const prisma = new PrismaClient();

async function trainOnHistory() {
  console.log('🧠 Démarrage de l\'analyse IA sur l\'historique réel...');

  // 1. Récupérer toutes les interventions qui ont un commentaire
  const interventions = await prisma.intervention.findMany({
    where: {
      clientFeedbackComment: { not: null, not: '' }
    }
  });

  console.log(`📊 ${interventions.length} interventions à analyser.`);

  let counts = { Positif: 0, Neutre: 0, Négatif: 0 };

  for (const inter of interventions) {
    try {
      console.log(`🔎 Analyse de l'intervention #${inter.id}: "${inter.clientFeedbackComment}" (${inter.clientFeedbackRating}⭐)`);
      
      // Appel réel à l'IA (CamemBERT via le service)
      const result = await analyzeSentiment(inter.clientFeedbackComment, inter.clientFeedbackRating);
      
      // Mise à jour en base de données avec le label français (Rapport)
      await prisma.intervention.update({
        where: { id: inter.id },
        data: { 
          clientFeedbackSentiment: result.sentiment 
        }
      });

      counts[result.sentiment]++;
    } catch (error) {
      console.error(`❌ Erreur sur l'intervention #${inter.id}:`, error.message);
    }
  }

  console.log('\n✨ ANALYSE TERMINÉE !');
  console.log(`✅ Positifs : ${counts.Positif}`);
  console.log(`✅ Neutres  : ${counts.Neutre}`);
  console.log(`✅ Négatifs : ${counts.Négatif}`);
  console.log('🚀 Votre dashboard affiche maintenant des données 100% réelles issues de l\'IA.');
}

trainOnHistory().finally(() => prisma.$disconnect());
