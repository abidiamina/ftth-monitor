const { analyzeSentiment } = require('./src/utils/aiService');
const prisma = require('./src/config/prisma');

async function backfill() {
  console.log('--- DÉBUT DU BACKFILL DES SENTIMENTS ---');
  
  const interventions = await prisma.intervention.findMany({
    where: {
      statut: 'TERMINEE',
      clientFeedbackRating: { not: null }
    }
  });

  console.log(`${interventions.length} interventions terminées trouvées.`);

  for (const intervention of interventions) {
    console.log(`Analyse de l'intervention #${intervention.id}...`);
    const sentiment = await analyzeSentiment(intervention.clientFeedbackComment, intervention.clientFeedbackRating);
    
    await prisma.intervention.update({
      where: { id: intervention.id },
      data: { clientFeedbackSentiment: sentiment }
    });
    
    console.log(`-> Résultat : ${sentiment}`);
  }

  console.log('--- BACKFILL TERMINÉ ---');
  process.exit(0);
}

backfill();
