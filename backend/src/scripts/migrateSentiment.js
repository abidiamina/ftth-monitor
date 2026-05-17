const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('🔄 Migration des labels de sentiment vers le format Rapport (Français)...');

  const mapping = {
    'POSITIVE': 'Positif',
    'NEGATIVE': 'Négatif',
    'NEUTRAL': 'Neutre'
  };

  for (const [oldVal, newVal] of Object.entries(mapping)) {
    const result = await prisma.intervention.updateMany({
      where: { clientFeedbackSentiment: oldVal },
      data: { clientFeedbackSentiment: newVal }
    });
    console.log(`✅ ${oldVal} -> ${newVal} (${result.count} entrées)`);
  }

  // S'assurer qu'on a au moins quelques données pour la démo
  const count = await prisma.intervention.count({
     where: { clientFeedbackSentiment: { in: ['Positif', 'Neutre', 'Négatif'] } }
  });

  if (count === 0) {
    console.log('📝 Aucune donnée trouvée. Création de données fictives pour le dashboard...');
    const client = await prisma.client.findFirst();
    const tech = await prisma.technicien.findFirst();
    const resp = await prisma.responsable.findFirst();

    if (client && tech && resp) {
      await prisma.intervention.createMany({
        data: [
          { titre: 'DÉMO IA 1', description: '...', adresse: '...', clientId: client.id, technicienId: tech.id, responsableId: resp.id, clientFeedbackSentiment: 'Positif', clientFeedbackRating: 5 },
          { titre: 'DÉMO IA 2', description: '...', adresse: '...', clientId: client.id, technicienId: tech.id, responsableId: resp.id, clientFeedbackSentiment: 'Positif', clientFeedbackRating: 4 },
          { titre: 'DÉMO IA 3', description: '...', adresse: '...', clientId: client.id, technicienId: tech.id, responsableId: resp.id, clientFeedbackSentiment: 'Neutre', clientFeedbackRating: 3 },
          { titre: 'DÉMO IA 4', description: '...', adresse: '...', clientId: client.id, technicienId: tech.id, responsableId: resp.id, clientFeedbackSentiment: 'Négatif', clientFeedbackRating: 1 },
        ]
      });
      console.log('✨ 4 interventions de démo créées.');
    }
  }

  console.log('🚀 Base de données synchronisée avec le rapport !');
}

migrate().finally(() => prisma.$disconnect());
