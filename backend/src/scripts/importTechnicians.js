const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();
const defaultImportPath = path.resolve(__dirname, '../../prisma/data/technicians-export.json');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fileArg = args.find((arg) => arg !== '--dry-run');
const inputPath = fileArg ? path.resolve(process.cwd(), fileArg) : defaultImportPath;
const temporaryPassword = process.env.TECHNICIAN_IMPORT_PASSWORD || 'FTTH-Temp123!';

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const nullableText = (value) => {
  const normalized = normalizeText(value);
  return normalized || null;
};

async function upsertTechnician(technicien, hashedPassword) {
  const email = normalizeText(technicien.email).toLowerCase();

  if (!email) {
    return { status: 'skipped', email: '(empty)', reason: 'missing email' };
  }

  const existingUser = await prisma.utilisateur.findUnique({
    where: { email },
    include: { technicien: true },
  });

  if (existingUser && existingUser.role !== 'TECHNICIEN') {
    return {
      status: 'skipped',
      email,
      reason: `email already exists with role ${existingUser.role}`,
    };
  }

  if (dryRun) {
    return { status: existingUser ? 'updated' : 'created', email };
  }

  const user = existingUser
    ? await prisma.utilisateur.update({
        where: { email },
        data: {
          nom: normalizeText(technicien.nom),
          prenom: normalizeText(technicien.prenom),
          telephone: nullableText(technicien.telephone),
          actif: technicien.actif ?? true,
          bloque: technicien.bloque ?? false,
        },
      })
    : await prisma.utilisateur.create({
        data: {
          nom: normalizeText(technicien.nom),
          prenom: normalizeText(technicien.prenom),
          email,
          telephone: nullableText(technicien.telephone),
          motDePasse: hashedPassword,
          role: 'TECHNICIEN',
          actif: technicien.actif ?? true,
          bloque: technicien.bloque ?? false,
          mustChangePassword: true,
        },
      });

  const technicienData = {
    specialite: nullableText(technicien.specialite),
    zone: nullableText(technicien.zone),
    disponible: technicien.disponible ?? true,
    latitude: technicien.latitude ?? null,
    longitude: technicien.longitude ?? null,
  };

  await prisma.technicien.upsert({
    where: { utilisateurId: user.id },
    update: technicienData,
    create: {
      utilisateurId: user.id,
      ...technicienData,
    },
  });

  return { status: existingUser ? 'updated' : 'created', email };
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Import file not found: ${inputPath}`);
  }

  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const techniciens = Array.isArray(payload.techniciens) ? payload.techniciens : [];
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
  const summary = { created: 0, updated: 0, skipped: 0 };

  for (const technicien of techniciens) {
    const result = await upsertTechnician(technicien, hashedPassword);
    summary[result.status] += 1;

    const detail = result.reason ? ` (${result.reason})` : '';
    console.log(`${result.status}: ${result.email}${detail}`);
  }

  console.log(
    `Import complete. Created: ${summary.created}, updated: ${summary.updated}, skipped: ${summary.skipped}.`
  );
  if (dryRun) {
    console.log('Dry run only. No database changes were written.');
  } else {
    console.log(`Temporary password for new technicians: ${temporaryPassword}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
