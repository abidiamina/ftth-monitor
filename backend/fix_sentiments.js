const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function calculateCorrectSentiment(text, rating) {
  const lower = (text || "").toLowerCase();
  
  const veryNegativeWords = ['catastrophique', 'nul', 'honteux', 'inadmissible', 'foutage', 'remboursez', 'scandale'];
  const negativeWords = ['mauvais', 'panne', 'lent', 'problème', 'déçu', 'attente', 'colère', 'échec', 'pas'];
  const positiveWords = ['bon', 'merci', 'rapide', 'parfait', 'top', 'excellent', 'efficace', 'satisfait', 'super', 'bravo', 'génial'];

  if (veryNegativeWords.some(w => lower.includes(w))) return 'Négatif';

  if (rating >= 4) return 'Positif';
  if (rating > 0 && rating <= 2) return 'Négatif';

  if (negativeWords.some(w => lower.includes(w))) return 'Négatif';
  if (positiveWords.some(w => lower.includes(w))) return 'Positif';
  
  return 'Neutre';
}

async function main() {
  console.log("Analyse des anciennes interventions en cours...");
  
  // Récupérer toutes les interventions qui ont un commentaire client
  const interventions = await prisma.intervention.findMany({
    where: {
      clientFeedbackComment: { not: null }
    }
  });

  let correctionsCount = 0;

  for (const interv of interventions) {
    const correctSentiment = calculateCorrectSentiment(interv.clientFeedbackComment, interv.clientFeedbackRating);
    
    // Si le sentiment en base de données ne correspond pas à la réalité, on le corrige
    if (interv.clientFeedbackSentiment !== correctSentiment) {
      await prisma.intervention.update({
        where: { id: interv.id },
        data: { clientFeedbackSentiment: correctSentiment }
      });
      correctionsCount++;
      console.log(`[CORRIGÉ] Intervention ID ${interv.id}: ${interv.clientFeedbackSentiment} -> ${correctSentiment}`);
    }
  }

  console.log(`Terminé ! ${correctionsCount} anciennes évaluations ont été corrigées avec succès.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
