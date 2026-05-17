const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Nettoyage des données de test IA...');

  try {
    // 1. Supprimer les notifications liées aux alertes IA
    const notifs = await prisma.notification.deleteMany({
      where: {
        titre: { contains: 'RISQUE CRITIQUE' }
      }
    });
    console.log(`✅ Notifications supprimées : ${notifs.count}`);

    // 2. Supprimer les interventions de test
    const interventions = await prisma.intervention.deleteMany({
      where: {
        OR: [
          { titre: { contains: 'CRITICAL TEST' } },
          { titre: { contains: 'TEST ALERTE IA' } }
        ]
      }
    });
    console.log(`✅ Interventions de test supprimées : ${interventions.count}`);

    // 3. Supprimer le technicien de test s'il a été créé
    const testTechUser = await prisma.utilisateur.findFirst({
      where: { email: { startsWith: 'testtech' } }
    });
    
    if (testTechUser) {
       await prisma.utilisateur.delete({
         where: { id: testTechUser.id }
       });
       console.log('✅ Technicien de test supprimé.');
    }

    console.log('✨ Base de données nettoyée !');
  } catch (error) {
    console.error('❌ Erreur pendant le nettoyage :', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
