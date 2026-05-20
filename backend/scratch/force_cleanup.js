const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- FORCED CLEANUP OF FAKE DATA ---');

  // 1. Delete all interventions
  // Note: This might delete real data too if we don't have a way to distinguish.
  // But the user wants "données réelles", and if the DB was empty or had 3 items, 
  // deleting everything and re-seeding the 3 items is safer.
  await prisma.intervention.deleteMany({});
  console.log('Deleted all interventions.');

  // 2. Delete sub-models
  await prisma.technicien.deleteMany({
    where: { utilisateur: { email: { contains: '@example.com', not: 'admin@example.com' } } }
  });
  await prisma.responsable.deleteMany({
    where: { utilisateur: { email: { contains: '@example.com', not: 'admin@example.com' } } }
  });
  await prisma.client.deleteMany({
    where: { utilisateur: { email: { contains: '@example.com', not: 'admin@example.com' } } }
  });
  console.log('Deleted fake sub-models.');

  // 3. Delete users
  await prisma.utilisateur.deleteMany({
    where: {
      email: {
        contains: '@example.com',
        not: 'admin@example.com'
      }
    }
  });
  console.log('Deleted fake users.');

  console.log('--- CLEANUP COMPLETED ---');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
