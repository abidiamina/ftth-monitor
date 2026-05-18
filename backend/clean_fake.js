const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  await prisma.intervention.deleteMany({ where: { titre: { startsWith: 'CRITICAL TEST' } } });
  await prisma.technicien.deleteMany({ where: { utilisateur: { email: { startsWith: 'testtech' } } } });
  await prisma.utilisateur.deleteMany({ where: { email: { startsWith: 'testtech' } } });
  console.log('Fake data removed');
}

clean().catch(console.error).finally(() => prisma.$disconnect());
