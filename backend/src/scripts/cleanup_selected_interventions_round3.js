const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const titles = ['panne fibre36', 'Installation FTTH Résidentielle'];

(async () => {
  const candidates = await prisma.intervention.findMany({
    where: { titre: { in: titles } },
    select: { id: true, titre: true, statut: true, dateCreation: true },
    orderBy: { id: 'asc' }
  });

  console.log('CANDIDATES:', candidates.length);
  for (const c of candidates) {
    console.log(`#${c.id} | ${c.titre} | ${c.statut} | ${c.dateCreation.toISOString()}`);
  }

  const ids = candidates.map((c) => c.id);
  if (!ids.length) {
    console.log('No matching interventions found.');
    await prisma.$disconnect();
    return;
  }

  const notif = await prisma.notification.deleteMany({ where: { interventionId: { in: ids } } });
  const refus = await prisma.refusIntervention.deleteMany({ where: { interventionId: { in: ids } } });
  const evid = await prisma.interventionEvidence.deleteMany({ where: { interventionId: { in: ids } } });
  const del = await prisma.intervention.deleteMany({ where: { id: { in: ids } } });

  console.log('Deleted notifications:', notif.count);
  console.log('Deleted refus:', refus.count);
  console.log('Deleted evidences:', evid.count);
  console.log('Deleted interventions:', del.count);

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
