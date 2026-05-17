const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const lastNotif = await prisma.notification.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log('--- DERNIÈRE NOTIFICATION GÉNÉRÉE PAR L\'IA ---');
  console.log(JSON.stringify(lastNotif, null, 2));

  const totalInterventions = await prisma.intervention.count({
    where: { titre: { startsWith: 'CRITICAL TEST' } }
  });
  console.log(`\n--- NOMBRE D'INTERVENTIONS DE TEST CRÉÉES : ${totalInterventions} ---`);
}

check().finally(() => prisma.$disconnect());
