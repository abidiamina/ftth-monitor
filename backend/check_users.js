const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.utilisateur.findMany({
    where: { role: 'RESPONSABLE', actif: true },
    select: { email: true, id: true }
  });
  console.log('--- RESPONSABLES ACTIFS ---');
  users.forEach(u => console.log(`- ${u.email} (ID: ${u.id})`));
}

check().finally(() => prisma.$disconnect());
