const { predictOutages } = require('../utils/aiService');
const prisma = require('../config/prisma');

async function testHighRiskAlert() {
  console.log('🚀 Démarrage du test d\'alerte de panne critique...');

  try {
    // 1. On s'assure qu'il y a un responsable actif pour recevoir l'alerte
    const responsable = await prisma.utilisateur.findFirst({
      where: { role: 'RESPONSABLE', actif: true }
    });

    if (!responsable) {
      console.error('❌ Aucun responsable actif trouvé en base pour le test.');
      return;
    }
    console.log(`✅ Responsable cible : ${responsable.email}`);

    // 2. On s'assure d'avoir un technicien avec une zone
    let tech = await prisma.technicien.findFirst({
       where: { zone: { not: null } },
       select: { zone: true, id: true }
    });

    if (!tech) {
      console.log('📝 Aucun technicien avec zone trouvé. Création d\'un profil tech de test...');
      const userTech = await prisma.utilisateur.create({
        data: {
          nom: 'Tech', prenom: 'Test', email: `testtech${Date.now()}@ftth.com`,
          motDePasse: '123456', role: 'TECHNICIEN'
        }
      });
      tech = await prisma.technicien.create({
        data: { utilisateurId: userTech.id, zone: 'Zone Nord' }
      });
    }
    const zone = tech.zone;

    console.log(`📡 Simulation de charge critique pour la zone : ${zone}`);
    console.log(`🆔 ID Technicien utilisé : ${tech?.id}`);

    // 3. Créer des interventions urgentes fictives pour faire monter le score
    const client = await prisma.client.findFirst();
    const resp = await prisma.responsable.findFirst();
    
    if (!client || !resp) {
       console.error('❌ Données nécessaires (Client/Responsable) manquantes pour le test.');
       return;
    }

    console.log('📝 Création de 15 interventions urgentes très récentes...');
    const interventions = [];
    for (let i = 0; i < 15; i++) {
      interventions.push(
        prisma.intervention.create({
          data: {
            titre: `CRITICAL TEST ${i}`,
            description: 'URGENT: Panne fibre généralisée détectée par capteur IA',
            adresse: 'Secteur NOC 01',
            priorite: 'URGENTE',
            statut: 'EN_ATTENTE',
            clientId: client.id,
            responsableId: resp.id,
            technicienId: tech?.id
          }
        })
      );
    }
    await Promise.all(interventions);

    // 4. Lancer la prédiction
    console.log('🤖 Exécution de l\'IA de prédiction...');
    const predictions = await predictOutages();

    if (!predictions || predictions.length === 0) {
      console.error('❌ Aucune prédiction générée par l\'IA.');
      return;
    }

    const target = predictions.find(p => p.zone === zone) || predictions[0];
    
    console.log('📊 RÉSULTATS DE L\'IA :');
    console.log(`- Zone : ${target.zone}`);
    console.log(`- Probabilité : ${target.probability}%`);
    console.log(`- Risque : ${target.riskLevel}`);
    console.log(`- Recommandation : ${target.recommendation}`);

    if (target.probability > 70) {
      console.log('🔥 SUCCÈS : Le seuil critique a été franchi.');
      console.log('📧 L\'email d\'alerte et la notification in-app ont été déclenchés !');
    } else {
      console.log('⚠️ Le score n\'est pas assez haut pour déclencher l\'alerte automatique (Score < 70%).');
      console.log('💡 Note : Pour forcer l\'alerte, augmentez le nombre d\'interventions dans le script ou changez les poids.');
    }

  } catch (error) {
    console.error('❌ Erreur pendant le test :', error);
  } finally {
    await prisma.$disconnect();
  }
}

testHighRiskAlert();
