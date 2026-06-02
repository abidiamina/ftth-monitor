const prisma = require('./config/prisma');

async function seedConfigs() {
  const configs = [
    {
      cle: 'APP_NAME',
      valeur: 'FTTH Monitor',
      libelle: 'Nom de la plateforme',
      description: 'Le titre affiché dans le tableau de bord et les notifications.',
    },
    {
      cle: 'MAX_PHOTOS',
      valeur: '5',
      libelle: 'Limite de Photos',
      description: 'Nombre maximum de photos autorisées par intervention.',
    },
    {
      cle: 'REQ_SIGNATURE',
      valeur: 'true',
      libelle: 'Exigence Signature',
      description: 'Le client doit impérativement signer pour terminer l intervention.',
    },
    {
      cle: 'REQ_PHOTO',
      valeur: 'true',
      libelle: 'Exigence Photo',
      description: 'Au moins une photo de preuve est nécessaire pour valider.',
    },
    {
      cle: 'STRICT_QR',
      valeur: 'false',
      libelle: 'Contrôle QR Strict',
      description: 'L intervention échoue si le code QR ne correspond pas exactement.',
    },
    {
      cle: 'AI_ALERT_THRESHOLD',
      valeur: '50',
      libelle: 'Seuil d alerte NOC (%)',
      description: 'Probabilité minimale de panne calculée par l IA pour déclencher l envoi automatique d un e-mail d alerte.',
    },
    {
      cle: 'AI_ALERT_COOLDOWN',
      valeur: '60',
      libelle: 'Rétention d Alerte (min)',
      description: 'Délai d attente minimal en minutes avant d émettre une nouvelle alerte de panne pour la même zone.',
    },
  ];

  // Supprimer les paramètres obsolètes de contrôle GPS de la base de données
  await prisma.configuration.deleteMany({
    where: {
      cle: {
        in: ['GPS_VALIDATION_RADIUS', 'STRICT_GPS_CHECK'],
      },
    },
  });

  for (const config of configs) {
    await prisma.configuration.upsert({
      where: { cle: config.cle },
      update: {
        libelle: config.libelle,
        description: config.description,
      },
      create: config,
    });
  }

  console.log('Default configurations seeded successfully.');
}

seedConfigs()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
