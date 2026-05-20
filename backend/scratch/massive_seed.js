const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('--- GENERATING MASSIVE DATASET ---');
  const hashedPassword = await bcrypt.hash('Password123', 10);

  // 1. Create Responsables
  const responsables = [];
  for (let i = 1; i <= 5; i++) {
    const res = await prisma.utilisateur.upsert({
      where: { email: `responsable${i}@example.com` },
      update: {},
      create: {
        email: `responsable${i}@example.com`,
        nom: `Responsable${i}`,
        prenom: 'Staff',
        motDePasse: hashedPassword,
        role: 'RESPONSABLE',
        responsable: { create: {} }
      },
      include: { responsable: true }
    });
    responsables.push(res.responsable);
  }

  // 2. Create Technicians
  const technicians = [];
  const zones = ['Tunis', 'Ariana', 'Ben Arous', 'Sousse', 'Sfax', 'Bizerte'];
  const specialites = ['Fibre Optique', 'Splicing', 'Installation', 'Maintenance', 'Piquetage'];

  for (let i = 1; i <= 12; i++) {
    const tech = await prisma.utilisateur.upsert({
      where: { email: `tech${i}@example.com` },
      update: {},
      create: {
        email: `tech${i}@example.com`,
        nom: `Technicien${i}`,
        prenom: 'Field',
        motDePasse: hashedPassword,
        role: 'TECHNICIEN',
        technicien: {
          create: {
            zone: zones[Math.floor(Math.random() * zones.length)],
            specialite: specialites[Math.floor(Math.random() * specialites.length)],
            disponible: true
          }
        }
      },
      include: { technicien: true }
    });
    technicians.push(tech.technicien);
  }

  // 3. Create Clients
  const clients = [];
  for (let i = 1; i <= 10; i++) {
    const cli = await prisma.utilisateur.upsert({
      where: { email: `client${i}@example.com` },
      update: {},
      create: {
        email: `client${i}@example.com`,
        nom: `Client${i}`,
        prenom: 'Home',
        motDePasse: hashedPassword,
        role: 'CLIENT',
        client: {
          create: {
            adresse: `${i * 12} Rue de la Liberté, ${zones[i % zones.length]}`
          }
        }
      },
      include: { client: true }
    });
    clients.push(cli.client);
  }

  // 4. Create Interventions (60 total)
  const statuts = ['EN_ATTENTE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];
  const priorites = ['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'];
  const titres = [
    'Installation ONT', 'Réparation coupure fibre', 'Maintenance préventive', 
    'Nouveau raccordement', 'Déplacement prise', 'Soudure pigtail',
    'Vérification signal', 'Remplacement box', 'Audit réseau'
  ];

  console.log('Creating 60 interventions...');
  for (let i = 1; i <= 60; i++) {
    const status = i <= 20 ? 'TERMINEE' : (i <= 40 ? 'EN_COURS' : (i <= 55 ? 'EN_ATTENTE' : 'ANNULEE'));
    const dateCreation = new Date();
    dateCreation.setDate(dateCreation.getDate() - Math.floor(Math.random() * 30));

    await prisma.intervention.create({
      data: {
        titre: `${titres[Math.floor(Math.random() * titres.length)]} #${i}`,
        description: 'Intervention générée automatiquement pour le test de charge du dashboard.',
        adresse: `${Math.floor(Math.random() * 200)} Avenue des Martyrs`,
        statut: status,
        priorite: priorites[Math.floor(Math.random() * priorites.length)],
        dateCreation: dateCreation,
        clientId: clients[Math.floor(Math.random() * clients.length)].id,
        responsableId: responsables[Math.floor(Math.random() * responsables.length)].id,
        technicienId: status !== 'EN_ATTENTE' ? technicians[Math.floor(Math.random() * technicians.length)].id : null,
        clientFeedbackRating: status === 'TERMINEE' ? Math.floor(Math.random() * 3) + 3 : null, // 3 to 5 stars
        clientFeedbackSentiment: status === 'TERMINEE' ? (Math.random() > 0.2 ? 'POSITIVE' : 'NEUTRAL') : null
      }
    });
  }

  console.log('--- MASSIVE SEED COMPLETED ---');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
