"use client";

import type { BetHistoryEntry, LeaderboardEntry, TransactionRecord, UserProfile } from "@aviator-zim/shared";
import { useEffect, useState } from "react";
import { API_URL } from "../lib/api";
import { getStoredSession } from "../lib/auth";
import { DashboardClient } from "./dashboard-client";

interface DashboardResponse {
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

export function DashboardPageClient() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function loadDashboard(token: string) {
    setLoading(true);
    const response = await fetch(`${API_URL}/api/me/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error ?? "Unable to load dashboard.");
    }

    setData(result as DashboardResponse);
    setError("");
  }

  useEffect(() => {
    const session = getStoredSession();

    if (!session) {
      setError("Log in to view your persistent wallet, payment history, and protected controls.");
      setLoading(false);
      return;
    }

    setSessionToken(session.token);
    void loadDashboard(session.token).catch((loadError: Error) => {
      setError(loadError.message);
      setLoading(false);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="card p-6 text-neutral-200">Loading secure wallet data...</div>;
  }

  if (!sessionToken || !data) {
    return <div className="card p-6 text-neutral-200">{error || "No active session found."}</div>;
  }

  return (
    <DashboardClient
      {...data}
      authToken={sessionToken}
      onRefreshData={() => loadDashboard(sessionToken)}
    />
  );
}
