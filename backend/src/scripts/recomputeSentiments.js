const prisma = require('../config/prisma');
const { analyzeSentiment } = require('../utils/aiService');

const normalizeSentimentLabel = (value) => {
  const raw = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (raw === 'POSITIVE' || raw === 'POSITIF') return 'Positif';
  if (raw === 'NEGATIVE' || raw === 'NEGATIF') return 'Negatif';
  return 'Neutre';
};

async function recomputeSentiments() {
  console.log('[sentiment] Recalcul global en cours...');

  const interventions = await prisma.intervention.findMany({
    where: {
      clientFeedbackComment: { not: null },
    },
    select: {
      id: true,
      clientFeedbackComment: true,
      clientFeedbackRating: true,
      clientFeedbackSentiment: true,
    },
    orderBy: { id: 'asc' },
  });

  const candidates = interventions.filter(
    (item) => String(item.clientFeedbackComment || '').trim().length > 0
  );

  let updated = 0;
  let kept = 0;

  for (const item of candidates) {
    try {
      const result = await analyzeSentiment(
        item.clientFeedbackComment,
        item.clientFeedbackRating ?? null
      );

      const normalized = normalizeSentimentLabel(result?.sentiment);
      const previous = normalizeSentimentLabel(item.clientFeedbackSentiment);

      if (normalized !== previous) {
        await prisma.intervention.update({
          where: { id: item.id },
          data: { clientFeedbackSentiment: normalized },
        });
        updated += 1;
      } else {
        kept += 1;
      }
    } catch (error) {
      console.error(`[sentiment] Echec intervention #${item.id}:`, error.message);
    }
  }

  console.log('[sentiment] Termine.');
  console.log(`[sentiment] Total commentaires traites: ${candidates.length}`);
  console.log(`[sentiment] Mis a jour: ${updated}`);
  console.log(`[sentiment] Inchanges: ${kept}`);
}

recomputeSentiments()
  .catch((error) => {
    console.error('[sentiment] Erreur globale:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

