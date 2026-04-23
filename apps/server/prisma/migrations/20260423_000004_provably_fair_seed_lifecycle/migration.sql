-- AlterTable
ALTER TABLE "GameRound"
ADD COLUMN "seedHash" TEXT,
ADD COLUMN "serverSeed" TEXT,
ADD COLUMN "clientSeed" TEXT,
ADD COLUMN "nonce" INTEGER;

-- Optional index for nonce-based verification lookups
CREATE INDEX "GameRound_nonce_idx" ON "GameRound"("nonce");
