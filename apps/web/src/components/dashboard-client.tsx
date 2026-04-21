"use client";

import { currency, GAME_RULES, type BetHistoryEntry, type LeaderboardEntry, type TransactionRecord, type UserProfile } from "@aviator-zim/shared";
import { useEffect, useRef, useState } from "react";
import { API_URL } from "../lib/api";

interface DashboardClientProps {
  authToken: string;
  onRefreshData: () => Promise<void>;
  profile: UserProfile;
  contactEmail: string;
  transactions: TransactionRecord[];
  recentBets: BetHistoryEntry[];
  leaderboard: LeaderboardEntry[];
  rewards: {
    dailyRewardUsd: number;
    nextLevelProgress: number;
    referralBonusUsd: number;
  };
}

export function DashboardClient({ authToken, onRefreshData, profile, contactEmail, transactions, recentBets, leaderboard, rewards }: DashboardClientProps) {
  const [depositAmount, setDepositAmount] = useState(GAME_RULES.minimumDepositUsd);
  const [withdrawalAmount, setWithdrawalAmount] = useState(GAME_RULES.minimumWithdrawalUsd);
  const [provider, setProvider] = useState<"PayNow" | "EcoCash" | "OneMoney">("EcoCash");
  const [email, setEmail] = useState(contactEmail);
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber);
  const [paymentMessage, setPaymentMessage] = useState("Use live credentials in .env to move from scaffold to real Paynow deposits.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  async function beginPolling(pollUrl: string) {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = window.setInterval(async () => {
      const response = await fetch(`${API_URL}/api/payments/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ pollUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        setPaymentMessage(data.error ?? "Unable to confirm deposit status.");
        return;
      }

      if (data.status === "paid") {
        if (pollIntervalRef.current) {
          window.clearInterval(pollIntervalRef.current);
        }

        setPaymentMessage(`Deposit confirmed. New balance: ${currency(data.balanceUsd ?? profile.balanceUsd)}`);
        await onRefreshData();
        return;
      }

      setPaymentMessage(`Payment status: ${data.status}. Waiting for confirmation...`);
    }, 5000);
  }

  async function handleDeposit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/payments/deposit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          provider,
          amountUsd: depositAmount,
          phoneNumber
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setPaymentMessage(data.error ?? "Unable to start the deposit.");
        return;
      }

      if (data.redirectUrl) {
        window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
      }

      setPaymentMessage(data.instructions ?? "Payment started. Complete the steps on your device.");

      if (data.pollUrl) {
        void beginPolling(data.pollUrl);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleWithdrawal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/payments/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          provider,
          amountUsd: withdrawalAmount
        })
      });

      const data = await response.json();
      setPaymentMessage(response.ok ? data.message : (data.error ?? "Unable to submit withdrawal request."));

      if (response.ok) {
        await onRefreshData();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <section className="space-y-6">
        <div className="card p-6">
          <p className="badge">Player dashboard</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-neutral-400">Real balance</p>
              <p className="mt-2 text-3xl font-black">{currency(profile.balanceUsd)}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Demo balance</p>
              <p className="mt-2 text-3xl font-black">{currency(profile.demoBalanceUsd)}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Rank</p>
              <p className="mt-2 text-3xl font-black">{profile.badge}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-bold">Transactions</h2>
          <div className="mt-4 space-y-3">
            {transactions.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3">
                <div>
                  <p className="font-semibold capitalize">{entry.type}</p>
                  <p className="text-sm text-neutral-400">{new Date(entry.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-aviator.yellow">{currency(entry.amountUsd)}</p>
                  <p className="text-sm capitalize text-neutral-400">{entry.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-bold">Bet history</h2>
          <div className="mt-4 space-y-3">
            {recentBets.map((bet) => (
              <div key={bet.id} className="rounded-2xl bg-black/30 px-4 py-3 text-sm text-neutral-200">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">Round #{bet.roundNonce} • {bet.mode}</p>
                    <p className="text-neutral-400">{new Date(bet.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-aviator.yellow">{currency(bet.amountUsd)}</p>
                    <p className="capitalize text-neutral-400">{bet.status.replace("_", " ")}</p>
                  </div>
                </div>
                <p className="mt-2 text-neutral-300">
                  {bet.autoCashOutAt ? `Auto cash-out at ${bet.autoCashOutAt.toFixed(2)}x • ` : ""}
                  {typeof bet.payoutUsd === "number" ? `Payout ${currency(bet.payoutUsd)}` : typeof bet.crashMultiplier === "number" ? `Crashed at ${bet.crashMultiplier.toFixed(2)}x` : "Awaiting settlement"}
                </p>
              </div>
            ))}
            {recentBets.length === 0 && <p className="text-neutral-300">No bets recorded yet. Your runway is clear.</p>}
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <div className="card p-6">
          <h2 className="text-xl font-bold">Wallet actions</h2>
          <form className="mt-4 space-y-4" onSubmit={handleDeposit}>
            <div>
              <label htmlFor="payment-provider" className="text-sm text-neutral-400">Deposit method</label>
              <select
                id="payment-provider"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
                value={provider}
                onChange={(event) => setProvider(event.target.value as "PayNow" | "EcoCash" | "OneMoney")}
              >
                <option value="PayNow">PayNow redirect</option>
                <option value="EcoCash">EcoCash express</option>
                <option value="OneMoney">OneMoney express</option>
              </select>
            </div>
            <div>
              <label htmlFor="deposit-email" className="text-sm text-neutral-400">Email</label>
              <input
                id="deposit-email"
                type="email"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="deposit-phone" className="text-sm text-neutral-400">Phone number</label>
              <input
                id="deposit-phone"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="0777000000"
              />
            </div>
            <div>
              <label htmlFor="deposit-amount" className="text-sm text-neutral-400">Deposit amount</label>
              <input
                id="deposit-amount"
                type="number"
                min={GAME_RULES.minimumDepositUsd}
                step="0.01"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
                value={depositAmount}
                onChange={(event) => setDepositAmount(Number(event.target.value))}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-aviator.yellow px-4 py-3 font-bold text-black disabled:opacity-50"
            >
              {isSubmitting ? "Starting payment..." : "Start deposit"}
            </button>
          </form>

          <form className="mt-6 space-y-4 border-t border-white/10 pt-6" onSubmit={handleWithdrawal}>
            <div>
              <label htmlFor="withdrawal-amount" className="text-sm text-neutral-400">Withdrawal amount</label>
              <input
                id="withdrawal-amount"
                type="number"
                min={GAME_RULES.minimumWithdrawalUsd}
                step="0.01"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
                value={withdrawalAmount}
                onChange={(event) => setWithdrawalAmount(Number(event.target.value))}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white disabled:opacity-50"
            >
              {isSubmitting ? "Submitting request..." : "Request withdrawal"}
            </button>
          </form>

          <p className="mt-4 rounded-2xl bg-black/30 p-4 text-sm text-neutral-200">{paymentMessage}</p>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-bold">Rewards</h2>
          <ul className="mt-4 space-y-3 text-sm text-neutral-200">
            <li>Daily reward: {currency(rewards.dailyRewardUsd)}</li>
            <li>Referral bonus: {currency(rewards.referralBonusUsd)}</li>
            <li>Level progress: {rewards.nextLevelProgress}%</li>
            <li>Reality checks and cooldown controls available</li>
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-bold">Biggest wins</h2>
          <div className="mt-4 space-y-3">
            {leaderboard.map((entry) => (
              <div key={`${entry.player}-${entry.multiplier}`} className="flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3 text-sm">
                <span>{entry.player}</span>
                <span>{entry.multiplier.toFixed(2)}x</span>
                <span className="font-semibold text-aviator.yellow">{currency(entry.payoutUsd)}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
