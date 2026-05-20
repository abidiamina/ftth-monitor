const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.intervention.count();
  const audits = await prisma.auditLog.count();
  console.log(`Interventions: ${count}`);
  console.log(`Audit Logs: ${audits}`);
}

main().finally(() => prisma.$disconnect());
