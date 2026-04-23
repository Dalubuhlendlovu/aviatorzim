import {
  BetStatus as PrismaBetStatus,
  GameRoundStatus,
  PlayMode as PrismaPlayMode,
  Prisma,
  TransactionType,
  type Bet,
  type GameRound,
  type Transaction,
  type User
} from "@prisma/client";
import {
  type AdminOverview,
  type AdminRoundAnalyticsEntry,
  type CrashRound,
  GAME_RULES,
  type ActiveBetState,
  type BetHistoryEntry,
  type PaymentProvider,
  type PlayMode,
  type RoundHistoryEntry,
  type TransactionRecord,
  type UserProfile
} from "@aviator-zim/shared";
import { prisma } from "./prisma.js";
import { hashPassword, verifyPassword } from "./password.js";

const DEMO_EMAIL = "demo@aviatorzim.local";
const DEMO_PASSWORD = "password123";
const ADMIN_EMAIL = "admin@aviatorzim.local";
const ADMIN_PASSWORD = "admin12345";

type WalletBalanceField = "balanceUsd" | "demoBalanceUsd";

export interface AuthenticatedAccount {
  profile: UserProfile;
  contactEmail: string;
}

function decimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || typeof value === "undefined") {
    return undefined;
  }

  return typeof value === "number" ? value : Number(value.toString());
}

function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    fullName: user.fullName,
    address: user.address,
    phoneNumber: user.phoneNumber,
    balanceUsd: toNumber(user.balanceUsd) ?? 0,
    demoBalanceUsd: toNumber(user.demoBalanceUsd) ?? 0,
    level: user.level,
    badge: user.badge,
    isAdmin: user.isAdmin
  };
}

function toTransactionRecord(transaction: Transaction): TransactionRecord {
  return {
    id: transaction.id,
    type: transaction.type,
    amountUsd: toNumber(transaction.amountUsd) ?? 0,
    status: transaction.status as TransactionRecord["status"],
    provider: (transaction.provider as PaymentProvider | null) ?? undefined,
    createdAt: transaction.createdAt.toISOString()
  };
}

function toActiveBetState(bet: Bet): ActiveBetState {
  return {
    id: bet.id,
    roundNonce: bet.roundNonce,
    amountUsd: toNumber(bet.amountUsd) ?? 0,
    mode: bet.mode,
    status: bet.status,
    payoutUsd: toNumber(bet.payoutUsd),
    autoCashOutAt: toNumber(bet.autoCashOutAt)
  };
}

function toBetHistoryEntry(bet: Bet): BetHistoryEntry {
  return {
    ...toActiveBetState(bet),
    createdAt: bet.createdAt.toISOString(),
    settledAt: bet.settledAt?.toISOString(),
    cashedOutAt: toNumber(bet.cashedOutAt),
    crashMultiplier: toNumber(bet.crashMultiplier)
  };
}

function toRoundHistoryEntry(round: GameRound): RoundHistoryEntry {
  return {
    roundId: round.roundId,
    hash: round.hash,
    seedHash: round.seedHash ?? undefined,
    crashPoint: toNumber(round.crashPoint) ?? 0,
    startedAt: round.startedAt.toISOString(),
    crashedAt: round.crashedAt.toISOString(),
    status: round.status
  };
}

function getWalletField(mode: PlayMode): WalletBalanceField {
  return mode === "real" ? "balanceUsd" : "demoBalanceUsd";
}

function buildAuthAccount(user: User): AuthenticatedAccount {
  return {
    profile: toUserProfile(user),
    contactEmail: user.email
  };
}

export async function ensureDemoUser() {
  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      isDemoAccount: true,
      isAdmin: false,
      fullName: "Demo Player",
      address: "Harare, Zimbabwe",
      phoneNumber: "+263771000000",
      level: 4,
      badge: "Bronze Pilot"
    },
    create: {
      fullName: "Demo Player",
      address: "Harare, Zimbabwe",
      phoneNumber: "+263771000000",
      email: DEMO_EMAIL,
      passwordHash: hashPassword(DEMO_PASSWORD),
      isDemoAccount: true,
      isAdmin: false,
      balanceUsd: decimal(25),
      demoBalanceUsd: decimal(GAME_RULES.demoStartingBalanceUsd),
      level: 4,
      badge: "Bronze Pilot"
    }
  });

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      isAdmin: true,
      isDemoAccount: false,
      fullName: "Aviator Admin",
      address: "Harare HQ",
      phoneNumber: "+263771999999",
      badge: "Control Tower"
    },
    create: {
      fullName: "Aviator Admin",
      address: "Harare HQ",
      phoneNumber: "+263771999999",
      email: ADMIN_EMAIL,
      passwordHash: hashPassword(ADMIN_PASSWORD),
      isAdmin: true,
      isDemoAccount: false,
      balanceUsd: decimal(0),
      demoBalanceUsd: decimal(0),
      level: 99,
      badge: "Control Tower"
    }
  });

  const existingTransactions = await prisma.transaction.count({ where: { userId: demoUser.id } });

  if (existingTransactions === 0) {
    await prisma.transaction.createMany({
      data: [
        {
          userId: demoUser.id,
          type: TransactionType.deposit,
          amountUsd: decimal(25),
          status: "completed",
          provider: "PayNow",
          reference: "seed-demo-deposit",
          creditedAt: new Date()
        },
        {
          userId: demoUser.id,
          type: TransactionType.reward,
          amountUsd: decimal(3),
          status: "completed",
          reference: "seed-demo-reward"
        }
      ]
    });
  }

  return demoUser;
}

export async function findUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function getStoredUser(userId: string) {
  return findUserById(userId);
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function getDashboardData(userId: string) {
  const user = await findUserById(userId);

  if (!user) {
    return null;
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  const recentBets = await prisma.bet.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return {
    ...buildAuthAccount(user),
    transactions: transactions.map(toTransactionRecord),
    recentBets: recentBets.map(toBetHistoryEntry)
  };
}

export async function createUser(input: {
  fullName: string;
  address: string;
  phoneNumber: string;
  email: string;
  password: string;
}) {
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      address: input.address,
      phoneNumber: input.phoneNumber,
      email: input.email,
      passwordHash: hashPassword(input.password),
      isDemoAccount: false,
      isAdmin: false,
      balanceUsd: decimal(0),
      demoBalanceUsd: decimal(GAME_RULES.demoStartingBalanceUsd),
      level: 1,
      badge: "New Pilot"
    }
  });

  return buildAuthAccount(user);
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return buildAuthAccount(user);
}

export async function createPendingDeposit(input: {
  userId: string;
  amountUsd: number;
  provider: PaymentProvider;
  pollUrl: string;
  reference: string;
  phoneNumber?: string;
}) {
  const user = await findUserById(input.userId);

  if (!user) {
    throw new Error("User not found.");
  }

  return prisma.transaction.create({
    data: {
      userId: input.userId,
      type: TransactionType.deposit,
      amountUsd: decimal(input.amountUsd),
      status: "pending",
      provider: input.provider,
      reference: input.reference,
      pollUrl: input.pollUrl,
      phoneNumber: input.phoneNumber
    }
  });
}

export async function assertPollBelongsToUser(pollUrl: string, userId: string) {
  const transaction = await prisma.transaction.findUnique({ where: { pollUrl } });
  return Boolean(transaction && transaction.userId === userId);
}

export async function finalizeDeposit(pollUrl: string, paynowReference?: string) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { pollUrl },
      include: { user: true }
    });

    if (!transaction) {
      throw new Error("Unknown payment session.");
    }

    const alreadyCredited = Boolean(transaction.creditedAt);

    if (!alreadyCredited) {
      await tx.user.update({
        where: { id: transaction.userId },
        data: {
          balanceUsd: {
            increment: transaction.amountUsd
          }
        }
      });

      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "completed",
          creditedAt: new Date(),
          paynowReference: paynowReference ?? transaction.paynowReference
        }
      });
    }

    const updatedUser = await tx.user.findUnique({ where: { id: transaction.userId } });

    if (!updatedUser) {
      throw new Error("User not found.");
    }

    return {
      user: toUserProfile(updatedUser),
      alreadyCredited
    };
  });
}

export async function createWithdrawalRequest(input: {
  userId: string;
  amountUsd: number;
  provider: PaymentProvider;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: input.userId } });

    if (!user) {
      throw new Error("User not found.");
    }

    if ((toNumber(user.balanceUsd) ?? 0) < input.amountUsd) {
      throw new Error("Insufficient balance for this withdrawal request.");
    }

    await tx.user.update({
      where: { id: input.userId },
      data: {
        balanceUsd: {
          decrement: decimal(input.amountUsd)
        }
      }
    });

    return tx.transaction.create({
      data: {
        userId: input.userId,
        type: TransactionType.withdrawal,
        amountUsd: decimal(input.amountUsd),
        status: "pending",
        provider: input.provider,
        reference: `withdraw-${Date.now()}`
      }
    });
  });
}

export async function placeCrashBet(input: {
  userId: string;
  amountUsd: number;
  mode: PlayMode;
  roundNonce: number;
  autoCashOutMultiplier?: number;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: input.userId } });

    if (!user) {
      throw new Error("User not found.");
    }

    if (input.amountUsd < GAME_RULES.minimumBetUsd || input.amountUsd > GAME_RULES.maximumBetUsd) {
      throw new Error(`Bet must be between $${GAME_RULES.minimumBetUsd} and $${GAME_RULES.maximumBetUsd}.`);
    }

    const existingBet = await tx.bet.findFirst({
      where: {
        userId: input.userId,
        roundNonce: input.roundNonce,
        status: PrismaBetStatus.active
      }
    });

    if (existingBet) {
      throw new Error("Only one active bet per round is currently supported.");
    }

    const walletField = getWalletField(input.mode);
    const availableBalance = toNumber(user[walletField]) ?? 0;

    if (availableBalance < input.amountUsd) {
      throw new Error(`Insufficient ${input.mode} balance.`);
    }

    await tx.user.update({
      where: { id: input.userId },
      data: {
        [walletField]: {
          decrement: decimal(input.amountUsd)
        }
      }
    });

    const bet = await tx.bet.create({
      data: {
        userId: input.userId,
        roundNonce: input.roundNonce,
        amountUsd: decimal(input.amountUsd),
        autoCashOutAt: typeof input.autoCashOutMultiplier === "number" ? decimal(input.autoCashOutMultiplier) : undefined,
        mode: input.mode as PrismaPlayMode,
        status: PrismaBetStatus.active
      }
    });

    await tx.transaction.create({
      data: {
        userId: input.userId,
        type: TransactionType.bet,
        amountUsd: decimal(input.amountUsd),
        status: "completed",
        reference: `bet-${input.roundNonce}-${bet.id}`
      }
    });

    const updatedUser = await tx.user.findUnique({ where: { id: input.userId } });

    if (!updatedUser) {
      throw new Error("User not found.");
    }

    return {
      bet: toActiveBetState(bet),
      profile: toUserProfile(updatedUser)
    };
  });
}

export async function cashOutCrashBet(input: {
  userId: string;
  roundNonce: number;
  multiplier: number;
}) {
  return prisma.$transaction(async (tx) => {
    const bet = await tx.bet.findFirst({
      where: {
        userId: input.userId,
        roundNonce: input.roundNonce,
        status: PrismaBetStatus.active
      }
    });

    if (!bet) {
      throw new Error("No active bet found for this round.");
    }

    const payoutUsd = Number(((toNumber(bet.amountUsd) ?? 0) * input.multiplier).toFixed(2));
    const walletField = getWalletField(bet.mode);

    await tx.user.update({
      where: { id: input.userId },
      data: {
        [walletField]: {
          increment: decimal(payoutUsd)
        }
      }
    });

    const updatedBet = await tx.bet.update({
      where: { id: bet.id },
      data: {
        status: PrismaBetStatus.cashed_out,
        cashedOutAt: decimal(input.multiplier),
        payoutUsd: decimal(payoutUsd),
        settledAt: new Date()
      }
    });

    await tx.transaction.create({
      data: {
        userId: input.userId,
        type: TransactionType.cashout,
        amountUsd: decimal(payoutUsd),
        status: "completed",
        reference: `cashout-${input.roundNonce}-${bet.id}`
      }
    });

    const updatedUser = await tx.user.findUnique({ where: { id: input.userId } });

    if (!updatedUser) {
      throw new Error("User not found.");
    }

    return {
      bet: toActiveBetState(updatedBet),
      profile: toUserProfile(updatedUser),
      payoutUsd
    };
  });
}

export async function settleCrashedBets(roundNonce: number, crashMultiplier: number) {
  const activeBets = await prisma.bet.findMany({
    where: {
      roundNonce,
      status: PrismaBetStatus.active
    }
  });

  if (activeBets.length === 0) {
    return 0;
  }

  await prisma.bet.updateMany({
    where: {
      roundNonce,
      status: PrismaBetStatus.active
    },
    data: {
      status: PrismaBetStatus.crashed,
      crashMultiplier: decimal(crashMultiplier),
      settledAt: new Date()
    }
  });

  return activeBets.length;
}

export async function finalizeCrashedRound(round: CrashRound) {
  return prisma.$transaction(async (tx) => {
    const activeBets = await tx.bet.findMany({
      where: {
        roundNonce: round.nonce,
        status: PrismaBetStatus.active
      }
    });

    if (activeBets.length > 0) {
      await tx.bet.updateMany({
        where: {
          roundNonce: round.nonce,
          status: PrismaBetStatus.active
        },
        data: {
          status: PrismaBetStatus.crashed,
          crashMultiplier: decimal(round.crashPoint),
          settledAt: new Date()
        }
      });
    }

    const storedRound = await tx.gameRound.upsert({
      where: { roundId: round.roundId },
      update: {
        hash: round.hash,
        seedHash: round.seedHash,
        serverSeed: round.serverSeed,
        clientSeed: round.clientSeed,
        nonce: round.nonce,
        crashPoint: decimal(round.crashPoint),
        status: GameRoundStatus.crashed,
        startedAt: new Date(round.startedAt),
        crashedAt: new Date(round.crashedAt ?? new Date().toISOString())
      },
      create: {
        roundId: round.roundId,
        hash: round.hash,
        seedHash: round.seedHash,
        serverSeed: round.serverSeed,
        clientSeed: round.clientSeed,
        nonce: round.nonce,
        crashPoint: decimal(round.crashPoint),
        status: GameRoundStatus.crashed,
        startedAt: new Date(round.startedAt),
        crashedAt: new Date(round.crashedAt ?? new Date().toISOString())
      }
    });

    return {
      settledBets: activeBets.length,
      round: toRoundHistoryEntry(storedRound)
    };
  });
}

export async function processAutoCashOuts(roundNonce: number, multiplier: number) {
  const bets = await prisma.bet.findMany({
    where: {
      roundNonce,
      status: PrismaBetStatus.active,
      autoCashOutAt: {
        lte: decimal(multiplier)
      }
    }
  });

  if (bets.length === 0) {
    return 0;
  }

  for (const bet of bets) {
    await cashOutCrashBet({
      userId: bet.userId,
      roundNonce,
      multiplier
    });
  }

  return bets.length;
}

export async function getActiveBetForUser(userId: string, roundNonce: number) {
  const bet = await prisma.bet.findFirst({
    where: {
      userId,
      roundNonce,
      status: PrismaBetStatus.active
    }
  });

  return bet ? toActiveBetState(bet) : null;
}

export async function getBetHistoryForUser(userId: string, limit = 20) {
  const bets = await prisma.bet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit
  });

  return bets.map(toBetHistoryEntry);
}

export async function getRecentRoundHistory(limit = 20) {
  const rounds = await prisma.gameRound.findMany({
    orderBy: { crashedAt: "desc" },
    take: limit
  });

  return rounds.map(toRoundHistoryEntry);
}

export async function getRoundByRoundId(roundId: number) {
  const round = await prisma.gameRound.findUnique({ where: { roundId } });
  return round ? toRoundHistoryEntry(round) : null;
}

export async function getRoundVerificationRecord(roundId: number) {
  return prisma.gameRound.findUnique({
    where: { roundId },
    select: {
      roundId: true,
      nonce: true,
      hash: true,
      seedHash: true,
      serverSeed: true,
      clientSeed: true,
      crashPoint: true,
      status: true,
      startedAt: true,
      crashedAt: true
    }
  });
}

export async function getActiveRoundExposure(roundNonce: number) {
  const activeBets = await prisma.bet.findMany({
    where: {
      roundNonce,
      status: PrismaBetStatus.active
    },
    select: {
      amountUsd: true,
      autoCashOutAt: true
    }
  });

  const totals = activeBets.reduce(
    (acc, bet) => {
      const stake = toNumber(bet.amountUsd) ?? 0;
      const targetMultiplier = Math.max(
        1,
        Math.min(
          toNumber(bet.autoCashOutAt) ?? GAME_RULES.maxRiskMultiplierForExposure,
          GAME_RULES.maxRiskMultiplierForExposure
        )
      );
      const potentialPayoutUsd = Number((stake * targetMultiplier).toFixed(2));

      acc.totalStakeUsd += stake;
      acc.totalPotentialPayoutUsd += potentialPayoutUsd;
      return acc;
    },
    { totalStakeUsd: 0, totalPotentialPayoutUsd: 0 }
  );

  return {
    totalStakeUsd: Number(totals.totalStakeUsd.toFixed(2)),
    totalPotentialPayoutUsd: Number(totals.totalPotentialPayoutUsd.toFixed(2)),
    activeBetsCount: activeBets.length
  };
}

export async function approveWithdrawal(transactionId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { user: true }
  });

  if (!transaction || transaction.type !== TransactionType.withdrawal) {
    throw new Error("Withdrawal request not found.");
  }

  if (transaction.status !== "pending") {
    throw new Error("Withdrawal request has already been processed.");
  }

  return prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: "completed",
      creditedAt: new Date()
    }
  });
}

export async function rejectWithdrawal(transactionId: string) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: { user: true }
    });

    if (!transaction || transaction.type !== TransactionType.withdrawal) {
      throw new Error("Withdrawal request not found.");
    }

    if (transaction.status !== "pending") {
      throw new Error("Withdrawal request has already been processed.");
    }

    await tx.user.update({
      where: { id: transaction.userId },
      data: {
        balanceUsd: {
          increment: transaction.amountUsd
        }
      }
    });

    return tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: "failed"
      }
    });
  });
}

async function buildFraudSignals() {
  const duplicatePhoneGroups = await prisma.user.groupBy({
    by: ["phoneNumber"],
    _count: { phoneNumber: true },
    having: {
      phoneNumber: {
        _count: {
          gt: 1
        }
      }
    }
  });

  const withdrawalPressure = await prisma.transaction.groupBy({
    by: ["userId"],
    where: {
      type: TransactionType.withdrawal,
      status: "pending"
    },
    _count: { userId: true },
    having: {
      userId: {
        _count: {
          gt: 1
        }
      }
    }
  });

  return [
    ...(duplicatePhoneGroups.length > 0
      ? [{
          code: "duplicate-phone",
          severity: "high" as const,
          summary: "Multiple accounts share the same phone number.",
          affectedUsers: duplicatePhoneGroups.reduce((sum, group) => sum + group._count.phoneNumber, 0)
        }]
      : []),
    ...(withdrawalPressure.length > 0
      ? [{
          code: "stacked-withdrawals",
          severity: "medium" as const,
          summary: "Users with multiple pending withdrawals may require manual review.",
          affectedUsers: withdrawalPressure.length
        }]
      : [])
  ];
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const since24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [pendingWithdrawals, deposits, withdrawals, bets, cashouts, fraudSignals, totalRounds, roundAggregates, roundsLast24h, autoConfiguredBetCount, autoSuccessfulBetCount, activeRealPlayers, recentRounds] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        type: TransactionType.withdrawal,
        status: "pending"
      },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.transaction.aggregate({
      where: { type: TransactionType.deposit, status: "completed" },
      _sum: { amountUsd: true }
    }),
    prisma.transaction.aggregate({
      where: { type: TransactionType.withdrawal, status: "completed" },
      _sum: { amountUsd: true }
    }),
    prisma.transaction.aggregate({
      where: { type: TransactionType.bet, status: "completed" },
      _sum: { amountUsd: true }
    }),
    prisma.transaction.aggregate({
      where: { type: TransactionType.cashout, status: "completed" },
      _sum: { amountUsd: true }
    }),
    buildFraudSignals(),
    prisma.gameRound.count(),
    prisma.gameRound.aggregate({
      _avg: { crashPoint: true },
      _max: { crashPoint: true },
      _min: { crashPoint: true }
    }),
    prisma.gameRound.count({
      where: {
        crashedAt: {
          gte: since24Hours
        }
      }
    }),
    prisma.bet.count({
      where: {
        autoCashOutAt: {
          not: null
        }
      }
    }),
    prisma.bet.count({
      where: {
        autoCashOutAt: {
          not: null
        },
        status: PrismaBetStatus.cashed_out
      }
    }),
    prisma.bet.findMany({
      where: {
        mode: PrismaPlayMode.real,
        createdAt: {
          gte: since24Hours
        }
      },
      distinct: ["userId"],
      select: { userId: true }
    }),
    prisma.gameRound.findMany({
      orderBy: { crashedAt: "desc" },
      take: 12
    })
  ]);

  const totalBetVolumeUsd = toNumber(bets._sum.amountUsd) ?? 0;
  const totalCashoutsUsd = toNumber(cashouts._sum.amountUsd) ?? 0;
  const recentRoundIds = recentRounds.map((round) => round.roundId);
  const recentRoundBets = recentRoundIds.length > 0
    ? await prisma.bet.findMany({
        where: {
          roundNonce: {
            in: recentRoundIds
          }
        },
        select: {
          roundNonce: true,
          userId: true,
          mode: true,
          status: true,
          amountUsd: true,
          payoutUsd: true,
          autoCashOutAt: true
        }
      })
    : [];

  const roundAnalytics = recentRounds.map((round): AdminRoundAnalyticsEntry => {
    const roundBets = recentRoundBets.filter((bet) => bet.roundNonce === round.roundId);
    const uniquePlayers = new Set(roundBets.map((bet) => bet.userId)).size;
    const totalStakeUsd = Number(roundBets.reduce((sum, bet) => sum + (toNumber(bet.amountUsd) ?? 0), 0).toFixed(2));
    const totalPayoutUsd = Number(roundBets.reduce((sum, bet) => sum + (toNumber(bet.payoutUsd) ?? 0), 0).toFixed(2));

    return {
      ...toRoundHistoryEntry(round),
      totalBets: roundBets.length,
      uniquePlayers,
      realBetCount: roundBets.filter((bet) => bet.mode === PrismaPlayMode.real).length,
      demoBetCount: roundBets.filter((bet) => bet.mode === PrismaPlayMode.demo).length,
      autoCashouts: roundBets.filter((bet) => bet.status === PrismaBetStatus.cashed_out && bet.autoCashOutAt !== null).length,
      crashedBets: roundBets.filter((bet) => bet.status === PrismaBetStatus.crashed).length,
      totalStakeUsd,
      totalPayoutUsd
    };
  });

  return {
    metrics: {
      totalDepositsUsd: toNumber(deposits._sum.amountUsd) ?? 0,
      totalWithdrawalsUsd: toNumber(withdrawals._sum.amountUsd) ?? 0,
      totalBetVolumeUsd,
      totalCashoutsUsd,
      grossGamingRevenueUsd: Number((totalBetVolumeUsd - totalCashoutsUsd).toFixed(2)),
      pendingWithdrawals: pendingWithdrawals.length
    },
    pendingWithdrawals: pendingWithdrawals.map((transaction) => ({
      id: transaction.id,
      userId: transaction.userId,
      player: transaction.user.fullName,
      email: transaction.user.email,
      phoneNumber: transaction.user.phoneNumber,
      amountUsd: toNumber(transaction.amountUsd) ?? 0,
      provider: (transaction.provider as PaymentProvider | null) ?? undefined,
      createdAt: transaction.createdAt.toISOString(),
      status: transaction.status
    })),
    fraudSignals,
    gameAnalytics: {
      totalRounds,
      roundsLast24h,
      averageCrashMultiplier: Number((toNumber(roundAggregates._avg.crashPoint) ?? 0).toFixed(2)),
      highestCrashMultiplier: Number((toNumber(roundAggregates._max.crashPoint) ?? 0).toFixed(2)),
      lowestCrashMultiplier: Number((toNumber(roundAggregates._min.crashPoint) ?? 0).toFixed(2)),
      activeRealPlayers24h: activeRealPlayers.length,
      autoCashoutSuccessRate: autoConfiguredBetCount === 0 ? 0 : Number(((autoSuccessfulBetCount / autoConfiguredBetCount) * 100).toFixed(2)),
      averageBetVolumePerRoundUsd: totalRounds === 0 ? 0 : Number((totalBetVolumeUsd / totalRounds).toFixed(2)),
      recentRounds: roundAnalytics
    }
  };
}
