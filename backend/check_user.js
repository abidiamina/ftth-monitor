const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const email = 'aya.benromdhane33@gmail.com';
  const user = await prisma.utilisateur.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (user) {
    console.log('User found:', JSON.stringify(user, null, 2));
  } else {
    console.log('User not found.');
    // List all users to see what we have
    const allUsers = await prisma.utilisateur.findMany({
      take: 10,
      select: { email: true, role: true, actif: true }
    });
    console.log('Sample users in DB:', JSON.stringify(allUsers, null, 2));
  }
  await prisma.$disconnect();
}

checkUser().catch(e => {
  console.error(e);
  process.exit(1);
});
