const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const audits = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  console.log(JSON.stringify(audits, null, 2));
}

main().finally(() => prisma.$disconnect());
