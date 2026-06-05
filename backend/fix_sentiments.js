const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function calculateCorrectSentiment(text, rating) {
  const normalizedText = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const veryNegativeWords = ['catastrophique', 'nul', 'honteux', 'inadmissible', 'foutage', 'remboursez', 'scandale'];
  const negativeWords = ['mauvais', 'panne', 'lent', 'probleme', 'decu', 'attente', 'colere', 'echec', 'pas'];
  const positiveWords = ['bon', 'merci', 'rapide', 'parfait', 'top', 'excellent', 'efficace', 'satisfait', 'super', 'bravo', 'genial'];

  if (veryNegativeWords.some((word) => normalizedText.includes(word))) return 'Negatif';
  if (rating >= 4) return 'Positif';
  if (rating === 3) return 'Neutre';
  if (rating > 0 && rating <= 2) return 'Negatif';
  if (negativeWords.some((word) => normalizedText.includes(word))) return 'Negatif';
  if (positiveWords.some((word) => normalizedText.includes(word))) return 'Positif';

  return 'Neutre';
}

async function main() {
  console.log('Analyse des anciennes interventions en cours...');

  const interventions = await prisma.intervention.findMany({
    where: {
      clientFeedbackComment: { not: null }
    }
  });

  let correctionsCount = 0;

  for (const intervention of interventions) {
    const correctSentiment = calculateCorrectSentiment(
      intervention.clientFeedbackComment,
      intervention.clientFeedbackRating
    );

    if (intervention.clientFeedbackSentiment !== correctSentiment) {
      await prisma.intervention.update({
        where: { id: intervention.id },
        data: { clientFeedbackSentiment: correctSentiment }
      });
      correctionsCount++;
      console.log(`[CORRIGE] Intervention ID ${intervention.id}: ${intervention.clientFeedbackSentiment} -> ${correctSentiment}`);
    }
  }

  console.log(`Termine ! ${correctionsCount} anciennes evaluations ont ete corrigees avec succes.`);
}

main()
  .catch((error) => console.error(error))
  .finally(async () => {
    await prisma.$disconnect();
  });
