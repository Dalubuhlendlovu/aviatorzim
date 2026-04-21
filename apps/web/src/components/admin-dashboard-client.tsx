"use client";

import { currency, type AdminOverview } from "@aviator-zim/shared";
import { useEffect, useState } from "react";
import { API_URL } from "../lib/api";
import { getStoredSession } from "../lib/auth";

export function AdminDashboardClient() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);

  async function loadOverview(activeToken: string) {
    const response = await fetch(`${API_URL}/api/admin/overview`, {
      headers: {
        Authorization: `Bearer ${activeToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load admin overview.");
    }

    setOverview(data as AdminOverview);
    setError("");
  }

  async function processWithdrawal(action: "approve" | "reject", transactionId: string) {
    if (!token) {
      return;
    }

    const response = await fetch(`${API_URL}/api/admin/withdrawals/${transactionId}/${action}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? `Unable to ${action} withdrawal.`);
      return;
    }

    await loadOverview(token);
  }

  useEffect(() => {
    const session = getStoredSession();

    if (!session) {
      setError("Log in with an administrator account to access the withdrawals queue.");
      return;
    }

    if (!session.user.isAdmin) {
      setError("This account does not have administrator access.");
      return;
    }

    setToken(session.token);
    void loadOverview(session.token).catch((loadError: Error) => setError(loadError.message));
  }, []);

  if (!overview) {
    return <div className="card p-6 text-neutral-200">{error || "Loading admin telemetry..."}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Deposits" value={currency(overview.metrics.totalDepositsUsd)} />
        <MetricCard label="Withdrawals" value={currency(overview.metrics.totalWithdrawalsUsd)} />
        <MetricCard label="Bet volume" value={currency(overview.metrics.totalBetVolumeUsd)} />
        <MetricCard label="Cashouts" value={currency(overview.metrics.totalCashoutsUsd)} />
        <MetricCard label="GGR" value={currency(overview.metrics.grossGamingRevenueUsd)} />
        <MetricCard label="Pending queue" value={String(overview.metrics.pendingWithdrawals)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-6">
          <h2 className="text-2xl font-bold">Withdrawal approvals</h2>
          <div className="mt-4 space-y-4">
            {overview.pendingWithdrawals.map((request) => (
              <div key={request.id} className="rounded-2xl bg-black/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{request.player}</p>
                    <p className="text-sm text-neutral-400">{request.email} • {request.phoneNumber}</p>
                    <p className="text-sm text-neutral-400">{request.provider ?? "Manual"} • {new Date(request.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="text-lg font-bold text-aviator.yellow">{currency(request.amountUsd)}</p>
                </div>
                <div className="mt-4 flex gap-3">
                  <button className="rounded-2xl bg-aviator.yellow px-4 py-2 font-bold text-black" onClick={() => void processWithdrawal("approve", request.id)}>Approve</button>
                  <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-bold text-white" onClick={() => void processWithdrawal("reject", request.id)}>Reject & refund</button>
                </div>
              </div>
            ))}
            {overview.pendingWithdrawals.length === 0 && <p className="text-neutral-300">No pending withdrawals. The control tower is calm.</p>}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-2xl font-bold">Fraud signals</h2>
          <div className="mt-4 space-y-3">
            {overview.fraudSignals.map((signal) => (
              <div key={signal.code} className="rounded-2xl bg-black/30 p-4">
                <p className="font-semibold capitalize text-white">{signal.severity} priority</p>
                <p className="mt-1 text-sm text-neutral-300">{signal.summary}</p>
                <p className="mt-2 text-sm text-aviator.yellow">Affected users: {signal.affectedUsers}</p>
              </div>
            ))}
            {overview.fraudSignals.length === 0 && <p className="text-neutral-300">No fraud signals triggered right now.</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Persisted rounds" value={String(overview.gameAnalytics.totalRounds)} />
        <MetricCard label="Rounds (24h)" value={String(overview.gameAnalytics.roundsLast24h)} />
        <MetricCard label="Avg crash" value={`${overview.gameAnalytics.averageCrashMultiplier.toFixed(2)}x`} />
        <MetricCard label="Highest crash" value={`${overview.gameAnalytics.highestCrashMultiplier.toFixed(2)}x`} />
        <MetricCard label="Lowest crash" value={`${overview.gameAnalytics.lowestCrashMultiplier.toFixed(2)}x`} />
        <MetricCard label="Real players (24h)" value={String(overview.gameAnalytics.activeRealPlayers24h)} />
        <MetricCard label="Auto cashout hit rate" value={`${overview.gameAnalytics.autoCashoutSuccessRate.toFixed(2)}%`} />
        <MetricCard label="Avg volume per round" value={currency(overview.gameAnalytics.averageBetVolumePerRoundUsd)} />
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Game analytics</h2>
            <p className="mt-1 text-sm text-neutral-400">Persisted crash rounds, per-round volume, and cashout behavior for live operations monitoring.</p>
          </div>
          <p className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-neutral-300">Backed by Prisma round history</p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-neutral-200">
            <thead className="text-xs uppercase tracking-[0.2em] text-neutral-400">
              <tr>
                <th className="pb-3 pr-4">Round</th>
                <th className="pb-3 pr-4">Crash</th>
                <th className="pb-3 pr-4">Players</th>
                <th className="pb-3 pr-4">Bets</th>
                <th className="pb-3 pr-4">Stake</th>
                <th className="pb-3 pr-4">Payout</th>
                <th className="pb-3 pr-4">Auto exits</th>
                <th className="pb-3 pr-4">Status mix</th>
                <th className="pb-3">When</th>
              </tr>
            </thead>
            <tbody>
              {overview.gameAnalytics.recentRounds.map((round) => (
                <tr key={`${round.roundId}-${round.hash}`} className="border-t border-white/5 align-top">
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-white">#{round.roundId}</p>
                    <p className="text-xs text-neutral-500">{round.hash.slice(0, 12)}...</p>
                  </td>
                  <td className="py-3 pr-4 font-semibold text-aviator.yellow">{round.crashPoint.toFixed(2)}x</td>
                  <td className="py-3 pr-4">{round.uniquePlayers}</td>
                  <td className="py-3 pr-4">
                    <p>{round.totalBets} total</p>
                    <p className="text-xs text-neutral-500">{round.realBetCount} real • {round.demoBetCount} demo</p>
                  </td>
                  <td className="py-3 pr-4">{currency(round.totalStakeUsd)}</td>
                  <td className="py-3 pr-4">{currency(round.totalPayoutUsd)}</td>
                  <td className="py-3 pr-4">{round.autoCashouts}</td>
                  <td className="py-3 pr-4">
                    <p>{round.crashedBets} crashed</p>
                    <p className="text-xs text-neutral-500">{Math.max(round.totalBets - round.crashedBets, 0)} survived</p>
                  </td>
                  <td className="py-3">{new Date(round.crashedAt ?? round.startedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {overview.gameAnalytics.recentRounds.length === 0 && (
            <p className="mt-4 text-neutral-300">No persisted rounds yet. Once the first flights crash, analytics will light up nicely.</p>
          )}
        </div>
      </div>

      {error && <div className="card p-4 text-sm text-red-300">{error}</div>}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-neutral-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
