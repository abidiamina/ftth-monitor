const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- CLEANING UP FAKE DATA ---');

  // Delete interventions created today with the "générée automatiquement" description
  const deletedInterventions = await prisma.intervention.deleteMany({
    where: {
      description: {
        contains: 'Intervention générée automatiquement'
      }
    }
  });
  console.log(`Deleted ${deletedInterventions.count} interventions.`);

  // Delete users with @example.com (except admin)
  const deletedUsers = await prisma.utilisateur.deleteMany({
    where: {
      email: {
        contains: '@example.com',
        not: 'admin@example.com'
      }
    }
  });
  console.log(`Deleted ${deletedUsers.count} users.`);

  console.log('--- CLEANUP COMPLETED ---');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
