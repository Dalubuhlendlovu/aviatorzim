-- CreateEnum
CREATE TYPE "GameRoundStatus" AS ENUM ('crashed');

-- CreateTable
CREATE TABLE "GameRound" (
    "id" TEXT NOT NULL,
    "roundId" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "crashPoint" DECIMAL(65,30) NOT NULL,
    "status" "GameRoundStatus" NOT NULL DEFAULT 'crashed',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "crashedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_roundId_key" ON "GameRound"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_hash_key" ON "GameRound"("hash");

-- CreateIndex
CREATE INDEX "GameRound_crashedAt_idx" ON "GameRound"("crashedAt");
