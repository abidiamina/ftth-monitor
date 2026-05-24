const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const exactTitles = [
  'panne',
  'inter',
  'probeme problme',
  'panne panne fibro',
  'Panne panne',
  'mission2',
  'Mission 2',
  'nouvelle panne fibre',
  'panne8',
  'Panne 6',
  'panne251',
  'panne69',
  'panne fibro',
  'panne fibre urgente'
];

(async () => {
  const interventions = await prisma.intervention.findMany({
    select: { id: true, titre: true, statut: true, dateCreation: true },
    orderBy: { id: 'asc' }
  });

  const targets = interventions.filter((i) =>
    exactTitles.some((t) => t.toLowerCase() === String(i.titre || '').toLowerCase().trim())
  );

  console.log('CANDIDATES:', targets.length);
  for (const t of targets) {
    console.log(`#${t.id} | ${t.titre} | ${t.statut} | ${t.dateCreation.toISOString()}`);
  }

  const ids = targets.map((t) => t.id);
  if (!ids.length) {
    console.log('No matching interventions to delete.');
    await prisma.$disconnect();
    return;
  }

  const notif = await prisma.notification.deleteMany({ where: { interventionId: { in: ids } } });
  const refus = await prisma.refusIntervention.deleteMany({ where: { interventionId: { in: ids } } });
  const evid = await prisma.interventionEvidence.deleteMany({ where: { interventionId: { in: ids } } });
  const deleted = await prisma.intervention.deleteMany({ where: { id: { in: ids } } });

  console.log('Deleted notifications:', notif.count);
  console.log('Deleted refus:', refus.count);
  console.log('Deleted evidences:', evid.count);
  console.log('Deleted interventions:', deleted.count);

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
