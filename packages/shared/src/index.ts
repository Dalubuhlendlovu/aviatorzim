export const GAME_RULES = {
  minimumDepositUsd: 1,
  minimumWithdrawalUsd: 5,
  minimumBetUsd: 0.5,
  maximumBetUsd: 200,
  bettingWindowCloseMs: 900,
  maxRiskMultiplierForExposure: 25,
  maxPotentialPayoutPerBetUsd: 5_000,
  maxPotentialPayoutPerRoundUsd: 25_000,
  demoStartingBalanceUsd: 10_000,
  defaultHouseEdge: 0.02,
  roundDurationRangeSeconds: [5, 15] as const,
  locale: "en-ZW",
  supportedCurrencies: ["USD", "ZWG"] as const,
  paymentProviders: ["PayNow", "EcoCash", "OneMoney"] as const
};

export type CurrencyCode = (typeof GAME_RULES.supportedCurrencies)[number];
export type PaymentProvider = (typeof GAME_RULES.paymentProviders)[number];
export type RoundStatus = "starting" | "running" | "crashed";
export type PlayMode = "demo" | "real";
export type BetStatus = "active" | "cashed_out" | "crashed";

export interface UserProfile {
  id: string;
  fullName: string;
  address: string;
  phoneNumber: string;
  balanceUsd: number;
  demoBalanceUsd: number;
  level: number;
  badge: string;
  isAdmin: boolean;
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export interface LeaderboardEntry {
  player: string;
  multiplier: number;
  payoutUsd: number;
}

export interface CrashRound {
  roundId: number;
  hash: string;
  seedHash: string;
  serverSeed?: string;
  crashPoint: number;
  nonce: number;
  clientSeed: string;
  status: RoundStatus;
  elapsedMs: number;
  currentMultiplier: number;
  startedAt: string;
  crashedAt?: string;
}

export interface PublicRoundState {
  roundId: number;
  hash: string;
  seedHash: string;
  status: RoundStatus;
  elapsedMs: number;
  currentMultiplier: number;
  startedAt: string;
  lastCrashPoint?: number;
  history: number[];
}

export interface BetSlip {
  betAmountUsd: number;
  autoCashOutMultiplier?: number;
  mode: PlayMode;
}

export interface ActiveBetState {
  id: string;
  roundNonce: number;
  amountUsd: number;
  mode: PlayMode;
  status: BetStatus;
  payoutUsd?: number;
  autoCashOutAt?: number;
}

export interface BetHistoryEntry extends ActiveBetState {
  createdAt: string;
  settledAt?: string;
  cashedOutAt?: number;
  crashMultiplier?: number;
}

export interface RoundHistoryEntry {
  roundId: number;
  hash: string;
  seedHash?: string;
  crashPoint: number;
  startedAt: string;
  crashedAt?: string;
  status: RoundStatus;
}

export interface RoundVerificationResult {
  roundId: number;
  nonce: number;
  houseEdge: number;
  clientSeed: string;
  serverSeed: string;
  seedHash: string;
  outcomeHash: string;
  crashPoint: number;
  recomputed: {
    seedHash: string;
    outcomeHash: string;
    crashPoint: number;
  };
  matches: {
    seedCommitment: boolean;
    outcomeHash: boolean;
    crashPoint: boolean;
  };
}

export interface AdminRoundAnalyticsEntry extends RoundHistoryEntry {
  totalBets: number;
  uniquePlayers: number;
  realBetCount: number;
  demoBetCount: number;
  autoCashouts: number;
  crashedBets: number;
  totalStakeUsd: number;
  totalPayoutUsd: number;
}

export interface GameAnalyticsSummary {
  totalRounds: number;
  roundsLast24h: number;
  averageCrashMultiplier: number;
  highestCrashMultiplier: number;
  lowestCrashMultiplier: number;
  activeRealPlayers24h: number;
  autoCashoutSuccessRate: number;
  averageBetVolumePerRoundUsd: number;
  recentRounds: AdminRoundAnalyticsEntry[];
}

export interface AdminOverview {
  metrics: {
    totalDepositsUsd: number;
    totalWithdrawalsUsd: number;
    totalBetVolumeUsd: number;
    totalCashoutsUsd: number;
    grossGamingRevenueUsd: number;
    pendingWithdrawals: number;
  };
  pendingWithdrawals: Array<{
    id: string;
    userId: string;
    player: string;
    email: string;
    phoneNumber: string;
    amountUsd: number;
    provider?: PaymentProvider;
    createdAt: string;
    status: string;
  }>;
  fraudSignals: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    summary: string;
    affectedUsers: number;
  }>;
  gameAnalytics: GameAnalyticsSummary;
}

export interface TransactionRecord {
  id: string;
  type: "deposit" | "withdrawal" | "bet" | "cashout" | "reward";
  amountUsd: number;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  provider?: PaymentProvider;
}

export interface VerificationResult {
  hash: string;
  randomFloat: number;
  crashPoint: number;
}

export function getLiveMultiplier(elapsedMs: number): number {
  const elapsedSeconds = elapsedMs / 1000;
  return Math.max(1, Number(Math.exp(0.1 * elapsedSeconds).toFixed(2)));
}

export function currency(amount: number, currencyCode: CurrencyCode = "USD"): string {
  return new Intl.NumberFormat(GAME_RULES.locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2
  }).format(amount);
}
