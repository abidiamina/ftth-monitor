ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CLIENT';

ALTER TABLE "Utilisateur"
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Client"
ADD COLUMN "utilisateurId" INTEGER;

CREATE UNIQUE INDEX "Client_utilisateurId_key" ON "Client"("utilisateurId");

ALTER TABLE "Client"
ADD CONSTRAINT "Client_utilisateurId_fkey"
FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
