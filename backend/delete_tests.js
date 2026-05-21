const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.intervention.deleteMany({
    where: {
      titre: {
        contains: 'CRITICAL TEST',
      },
    },
  });
  console.log(`Suppression réussie : ${deleted.count} interventions de test supprimées.`);
}

main()
  .catch(e => {
    console.error("Erreur lors de la suppression:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
