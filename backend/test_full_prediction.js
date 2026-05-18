const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const { predictOutages } = require('./src/utils/aiService');
const prisma = new PrismaClient();

async function run() {
  console.log('=== TEST COMPLET : PREDICTION ET EMAIL ===');
  
  // 1. On cherche un client et un responsable pour associer la panne
  const client = await prisma.client.findFirst();
  const responsable = await prisma.responsable.findFirst();

  if (!client || !responsable) {
    console.error('Aucun client ou responsable trouvé pour créer la panne de test.');
    return;
  }

  // 2. On crée 2 pannes URGENTES dans une ville totalement nouvelle (Kasserine 9000)
  console.log('1. Création de 2 pannes urgentes à "Kasserine 9000"...');
  await prisma.intervention.createMany({
    data: [
      {
        titre: 'CRITICAL TEST 1 - Kasserine',
        description: 'Panne totale',
        adresse: 'Kasserine 9000',
        priorite: 'URGENTE',
        clientId: client.id,
        responsableId: responsable.id,
        statut: 'EN_ATTENTE',
        technicienId: null // Non assigné ! Risque max !
      },
      {
        titre: 'CRITICAL TEST 2 - Kasserine',
        description: 'Coupure fibre',
        adresse: 'Kasserine 9000',
        priorite: 'URGENTE',
        clientId: client.id,
        responsableId: responsable.id,
        statut: 'EN_ATTENTE',
        technicienId: null
      }
    ]
  });

  // 3. On déclenche le service IA (Comme le ferait le Dashboard)
  console.log('2. Déclenchement de la prédiction...');
  const predictions = await predictOutages();
  
  // 4. On vérifie le risque de la nouvelle ville
  const kasserineRisk = predictions.find(p => p.zone === 'Kasserine 9000');
  console.log('-> Résultat calculé pour Kasserine 9000 :', JSON.stringify(kasserineRisk, null, 2));
  
  console.log('3. L\'email a dû être expédié automatiquement par le service !');
}

run().catch(console.error).finally(() => prisma.$disconnect());
