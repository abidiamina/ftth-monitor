const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Seeding with User Credentials ---');

  // Helper to create or update user
  const upsertUser = async (email, password, role, details) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const subModel = role.toLowerCase() === 'responsable' ? 'responsable' : role.toLowerCase();
    const hasSubModel = ['CLIENT', 'TECHNICIEN', 'RESPONSABLE'].includes(role);

    return prisma.utilisateur.upsert({
      where: { email },
      update: { motDePasse: hashedPassword, role },
      create: {
        email,
        nom: details.nom,
        prenom: details.prenom,
        motDePasse: hashedPassword,
        role,
        actif: true,
        ...(hasSubModel && {
          [subModel]: {
            create: details.subModelData || {},
          },
        }),
      },
    });
  };

  // 1. Admin
  await upsertUser('admin@example.com', 'Password123', 'ADMIN', {
    nom: 'Admin',
    prenom: 'System',
  });
  console.log('Admin seeded: admin@example.com / Password123');

  // 2. Client Test 1
  const client1 = await upsertUser('clienttest1@gmail.com', '123456789', 'CLIENT', {
    nom: 'Client',
    prenom: 'Test1',
    subModelData: {
      nom: 'Client',
      prenom: 'Test1',
      telephone: '0611223344',
      adresse: '456 Avenue des Tests',
    },
  });
  console.log('Client seeded: clienttest1@gmail.com / 123456789');

  // 3. Technician Yahya
  const techYahya = await upsertUser('yahyab822@gmail.com', 'FTTH-65928219', 'TECHNICIEN', {
    nom: 'Yahya',
    prenom: 'Technicien',
    subModelData: {
      specialite: 'Maintenance Fibre',
      zone: 'Zone A',
    },
  });
  console.log('Technician seeded: yahyab822@gmail.com / FTTH-65928219');

  // 4. Responsable Aya
  await upsertUser('aya.benromdhane33@gmail.com', 'FTTH-0ba6e262', 'RESPONSABLE', {
    nom: 'Ben Romdhane',
    prenom: 'Aya',
    subModelData: {},
  });
  console.log('Responsable seeded: aya.benromdhane33@gmail.com / FTTH-0ba6e262');

  // 5. Create a Responsable for management
  const resp = await upsertUser('responsable@example.com', 'Password123', 'RESPONSABLE', {
    nom: 'Manager',
    prenom: 'Paul',
    subModelData: {},
  });

  // Get IDs for sample intervention
  const clientRecord = await prisma.client.findUnique({ where: { utilisateurId: client1.id } });
  const techRecord = await prisma.technicien.findUnique({ where: { utilisateurId: techYahya.id } });
  const respRecord = await prisma.responsable.findUnique({ where: { utilisateurId: resp.id } });

  // 6. Create a sample Intervention assigned to Yahya
  await prisma.intervention.create({
    data: {
      titre: 'Installation FTTH Résidentielle',
      description: 'Nouveau raccordement client. PTO à poser.',
      adresse: '456 Avenue des Tests',
      priorite: 'NORMALE',
      statut: 'EN_ATTENTE',
      clientId: clientRecord.id,
      responsableId: respRecord.id,
      technicienId: techRecord.id,
    },
  });
  console.log('Sample intervention created for Yahya.');

  console.log('--- Seeding Completed with User Credentials ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
