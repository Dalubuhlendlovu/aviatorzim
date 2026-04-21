-- CreateEnum
CREATE TYPE "PlayMode" AS ENUM ('demo', 'real');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('deposit', 'withdrawal', 'bet', 'cashout', 'reward');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isDemoAccount" BOOLEAN NOT NULL DEFAULT false,
    "balanceUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "demoBalanceUsd" DECIMAL(65,30) NOT NULL DEFAULT 10000,
    "level" INTEGER NOT NULL DEFAULT 1,
    "badge" TEXT NOT NULL DEFAULT 'New Pilot',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amountUsd" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT,
    "reference" TEXT,
    "pollUrl" TEXT,
    "paynowReference" TEXT,
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creditedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "roundNonce" INTEGER NOT NULL,
    "amountUsd" DECIMAL(65,30) NOT NULL,
    "autoCashOutAt" DECIMAL(65,30),
    "cashedOutAt" DECIMAL(65,30),
    "mode" "PlayMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_pollUrl_key" ON "Transaction"("pollUrl");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
