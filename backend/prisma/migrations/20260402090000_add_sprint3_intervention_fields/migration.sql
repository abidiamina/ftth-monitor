ALTER TABLE "Intervention"
ADD COLUMN "gpsConfirmedAt" TIMESTAMP(3),
ADD COLUMN "qrCodeValue" TEXT,
ADD COLUMN "qrVerifiedAt" TIMESTAMP(3),
ADD COLUMN "clientSignature" TEXT,
ADD COLUMN "clientSignatureAt" TIMESTAMP(3),
ADD COLUMN "clientSignatureBy" TEXT,
ADD COLUMN "clientFeedbackRating" INTEGER,
ADD COLUMN "clientFeedbackComment" TEXT,
ADD COLUMN "clientFeedbackAt" TIMESTAMP(3);

CREATE TABLE "InterventionEvidence" (
    "id" SERIAL NOT NULL,
    "interventionId" INTEGER NOT NULL,
    "technicienId" INTEGER,
    "commentaire" TEXT NOT NULL,
    "photoName" TEXT NOT NULL,
    "photoData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterventionEvidence_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InterventionEvidence"
ADD CONSTRAINT "InterventionEvidence_interventionId_fkey"
FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InterventionEvidence"
ADD CONSTRAINT "InterventionEvidence_technicienId_fkey"
FOREIGN KEY ("technicienId") REFERENCES "Technicien"("id") ON DELETE SET NULL ON UPDATE CASCADE;
