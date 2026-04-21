import { GAME_RULES, type ChatMessage, type LeaderboardEntry, type TransactionRecord, type UserProfile } from "@aviator-zim/shared";
import type { PaymentProvider } from "@aviator-zim/shared";

export interface StoredUser extends UserProfile {
  email: string;
  password: string;
}

export interface PaymentSession {
  userId: string;
  amountUsd: number;
  provider: PaymentProvider;
  pollUrl: string;
  reference: string;
  transactionId: string;
  status: "pending" | "paid" | "failed";
  creditedAt?: string;
  paynowReference?: string;
}

export const users = new Map<string, StoredUser>();
export const transactions = new Map<string, TransactionRecord[]>();
export const paymentSessions = new Map<string, PaymentSession>();
export const liveChat: ChatMessage[] = [
  {
    id: crypto.randomUUID(),
    user: "System",
    text: "Welcome to Aviator Zim Game. Play responsibly and use cooldown reminders.",
    timestamp: new Date().toISOString()
  }
];

export const leaderboard: LeaderboardEntry[] = [
  { player: "Tawanda", multiplier: 8.45, payoutUsd: 422.5 },
  { player: "Nyasha", multiplier: 5.2, payoutUsd: 208 },
  { player: "Rudo", multiplier: 4.8, payoutUsd: 144 }
];

const demoUserId = crypto.randomUUID();
users.set(demoUserId, {
  id: demoUserId,
  fullName: "Demo Player",
  address: "Harare, Zimbabwe",
  phoneNumber: "+263771000000",
  email: "demo@aviatorzim.local",
  password: "password123",
  balanceUsd: 25,
  demoBalanceUsd: GAME_RULES.demoStartingBalanceUsd,
  level: 4,
  badge: "Bronze Pilot",
  isAdmin: false
});

transactions.set(demoUserId, [
  {
    id: crypto.randomUUID(),
    type: "deposit",
    amountUsd: 25,
    status: "completed",
    provider: "PayNow",
    createdAt: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    type: "reward",
    amountUsd: 3,
    status: "completed",
    createdAt: new Date().toISOString()
  }
]);

export function getStoredUser(userId: string) {
  return users.get(userId);
}

export function getUserTransactions(userId: string) {
  return transactions.get(userId) ?? [];
}

function prependTransaction(userId: string, transaction: TransactionRecord) {
  const existingTransactions = transactions.get(userId) ?? [];
  transactions.set(userId, [transaction, ...existingTransactions].slice(0, 50));
  return transaction;
}

function updateTransactionStatus(userId: string, transactionId: string, status: TransactionRecord["status"]) {
  const existingTransactions = transactions.get(userId) ?? [];
  transactions.set(
    userId,
    existingTransactions.map((transaction) =>
      transaction.id === transactionId ? { ...transaction, status } : transaction
    )
  );
}

export function creditUserBalance(userId: string, amountUsd: number) {
  const user = users.get(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  user.balanceUsd = Number((user.balanceUsd + amountUsd).toFixed(2));
  users.set(userId, user);
  return user;
}

export function createPendingDeposit(input: {
  userId: string;
  amountUsd: number;
  provider: PaymentProvider;
  pollUrl: string;
  reference: string;
}) {
  if (!users.has(input.userId)) {
    throw new Error("User not found.");
  }

  const transaction = prependTransaction(input.userId, {
    id: crypto.randomUUID(),
    type: "deposit",
    amountUsd: input.amountUsd,
    status: "pending",
    provider: input.provider,
    createdAt: new Date().toISOString()
  });

  paymentSessions.set(input.pollUrl, {
    userId: input.userId,
    amountUsd: input.amountUsd,
    provider: input.provider,
    pollUrl: input.pollUrl,
    reference: input.reference,
    transactionId: transaction.id,
    status: "pending"
  });

  return transaction;
}

export function finalizeDeposit(pollUrl: string, paynowReference?: string) {
  const session = paymentSessions.get(pollUrl);

  if (!session) {
    throw new Error("Unknown payment session.");
  }

  const alreadyCredited = Boolean(session.creditedAt);

  if (!alreadyCredited) {
    creditUserBalance(session.userId, session.amountUsd);
    updateTransactionStatus(session.userId, session.transactionId, "completed");
    session.creditedAt = new Date().toISOString();
    session.paynowReference = paynowReference;
    session.status = "paid";
    paymentSessions.set(pollUrl, session);
  }

  const user = users.get(session.userId);

  if (!user) {
    throw new Error("User not found.");
  }

  return {
    session,
    user,
    alreadyCredited
  };
}

export function createWithdrawalRequest(input: {
  userId: string;
  amountUsd: number;
  provider: PaymentProvider;
}) {
  const user = users.get(input.userId);

  if (!user) {
    throw new Error("User not found.");
  }

  if (input.amountUsd < GAME_RULES.minimumWithdrawalUsd) {
    throw new Error(`Minimum withdrawal is $${GAME_RULES.minimumWithdrawalUsd}.`);
  }

  if (user.balanceUsd < input.amountUsd) {
    throw new Error("Insufficient balance for this withdrawal request.");
  }

  user.balanceUsd = Number((user.balanceUsd - input.amountUsd).toFixed(2));
  users.set(input.userId, user);

  return prependTransaction(input.userId, {
    id: crypto.randomUUID(),
    type: "withdrawal",
    amountUsd: input.amountUsd,
    status: "pending",
    provider: input.provider,
    createdAt: new Date().toISOString()
  });
}
