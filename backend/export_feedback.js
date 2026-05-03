const prisma = require('./src/config/prisma');
const fs = require('fs');

async function exportData() {
  console.log('--- EXPORTATION DES DONNÉES POUR ENTRAÎNEMENT IA ---');
  
  const interventions = await prisma.intervention.findMany({
    where: {
      clientFeedbackRating: { not: null },
      clientFeedbackComment: { not: '' }
    },
    select: {
      clientFeedbackComment: true,
      clientFeedbackRating: true
    }
  });

  if (interventions.length === 0) {
    console.log('Aucune donnée de feedback trouvée pour le moment.');
    return;
  }

  // Création du CSV
  let csvContent = "comment,rating\n";
  interventions.forEach(i => {
    // Nettoyage simple des virgules et sauts de ligne pour le CSV
    const cleanComment = i.clientFeedbackComment.replace(/,/g, ' ').replace(/\n/g, ' ');
    csvContent += `"${cleanComment}",${i.clientFeedbackRating}\n`;
  });

  fs.writeFileSync('feedback_data.csv', csvContent);
  console.log(`Succès ! ${interventions.length} lignes exportées dans feedback_data.csv`);
  process.exit(0);
}

exportData();
