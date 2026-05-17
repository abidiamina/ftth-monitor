const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  console.log('🔨 Correction forcée des sentiments...');
  
  // Forcer tous ceux qui ont 4 ou 5 étoiles en 'Positif'
  const pos = await prisma.intervention.updateMany({
    where: { clientFeedbackRating: { gte: 4 } },
    data: { clientFeedbackSentiment: 'Positif' }
  });
  
  // Forcer tous ceux qui ont 1 ou 2 étoiles en 'Négatif'
  const neg = await prisma.intervention.updateMany({
    where: { clientFeedbackRating: { lte: 2, gt: 0 } },
    data: { clientFeedbackSentiment: 'Négatif' }
  });

  console.log(`✅ Mis à jour Positifs : ${pos.count}`);
  console.log(`✅ Mis à jour Négatifs : ${neg.count}`);
}

fix().finally(() => prisma.$disconnect());
