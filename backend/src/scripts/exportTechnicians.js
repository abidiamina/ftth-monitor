const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();
const defaultExportPath = path.resolve(__dirname, '../../prisma/data/technicians-export.json');
const outputPath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : defaultExportPath;

async function main() {
  const techniciens = await prisma.technicien.findMany({
    include: {
      utilisateur: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          role: true,
          actif: true,
          bloque: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    count: techniciens.length,
    techniciens: techniciens.map((technicien) => ({
      nom: technicien.utilisateur.nom,
      prenom: technicien.utilisateur.prenom,
      email: technicien.utilisateur.email,
      telephone: technicien.utilisateur.telephone,
      actif: technicien.utilisateur.actif,
      bloque: technicien.utilisateur.bloque,
      specialite: technicien.specialite,
      zone: technicien.zone,
      disponible: technicien.disponible,
      latitude: technicien.latitude,
      longitude: technicien.longitude,
    })),
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`${payload.count} technicien(s) exported to ${outputPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
