-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('active', 'cashed_out', 'crashed');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Bet"
ADD COLUMN "payoutUsd" DECIMAL(65,30),
ADD COLUMN "crashMultiplier" DECIMAL(65,30),
ADD COLUMN "status" "BetStatus" NOT NULL DEFAULT 'active',
ADD COLUMN "settledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Bet_userId_createdAt_idx" ON "Bet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Bet_roundNonce_status_idx" ON "Bet"("roundNonce", "status");
