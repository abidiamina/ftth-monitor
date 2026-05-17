const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');

// Chemin vers le fichier d'export
const EXPORT_FILE = path.join(__dirname, '../../data_export/dataset_interventions.jsonl');

const exportMassiveDataForAI = async () => {
  console.log("🚀 Début de l'extraction des données massives pour l'IA...");
  
  // Créer le dossier s'il n'existe pas
  const dir = path.dirname(EXPORT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Vider le fichier existant
  fs.writeFileSync(EXPORT_FILE, '');

  const BATCH_SIZE = 5000; // Extraire par blocs de 5000 pour ne pas saturer la RAM (OOM)
  let skip = 0;
  let totalExported = 0;
  let hasMoreData = true;

  try {
    while (hasMoreData) {
      console.log(`⏳ Extraction du lot : ${skip} à ${skip + BATCH_SIZE}...`);
      
      const interventions = await prisma.intervention.findMany({
        skip: skip,
        take: BATCH_SIZE,
        orderBy: { id: 'asc' }, // Toujours trier lors de la pagination
        select: {
          id: true,
          dateCreation: true,
          priorite: true,
          statut: true,
          technicien: {
            select: { zone: true }
          }
        }
      });

      if (interventions.length === 0) {
        hasMoreData = false;
        break;
      }

      // Format JSONL (1 JSON valide par ligne) très optimisé pour Python/Pandas
      let fileContent = '';
      interventions.forEach(inv => {
        const row = {
          id: inv.id,
          date: inv.dateCreation,
          priorite: inv.priorite,
          statut: inv.statut,
          zone: inv.technicien?.zone || 'Inconnue'
        };
        fileContent += JSON.stringify(row) + '\n';
      });

      // Ajout au fichier en mode 'append'
      fs.appendFileSync(EXPORT_FILE, fileContent);
      
      totalExported += interventions.length;
      skip += BATCH_SIZE;

      // Petite pause optionnelle pour ne pas bloquer le processeur
      await new Promise(resolve => setTimeout(resolve, 50)); 
    }

    console.log(`✅ Succès ! ${totalExported} lignes exportées vers ${EXPORT_FILE}`);
    console.log(`🧠 Le microservice Python peut maintenant utiliser ce fichier pour s'entraîner via Pandas: pd.read_json('dataset.jsonl', lines=True)`);

  } catch (error) {
    console.error("❌ Erreur lors de l'extraction :", error);
  } finally {
    await prisma.$disconnect();
  }
};

exportMassiveDataForAI();
