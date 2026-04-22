"use client";

import {
  currency,
  GAME_RULES,
  type ActiveBetState,
  type BetHistoryEntry,
  type ChatMessage,
  type LeaderboardEntry,
  type PublicRoundState,
  type RoundHistoryEntry,
  type UserProfile
} from "@aviator-zim/shared";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_URL, SOCKET_URL } from "../lib/api";
import { getStoredSession } from "../lib/auth";

const initialState: PublicRoundState = {
  roundId: 1,
  hash: "loading",
  status: "starting",
  elapsedMs: 0,
  currentMultiplier: 1,
  startedAt: new Date().toISOString(),
  history: [1.2, 2.4, 1.01]
};

const dogPositions = [
  "translate-x-0 translate-y-0",
  "translate-x-8 -translate-y-1",
  "translate-x-16 -translate-y-2",
  "translate-x-24 -translate-y-4",
  "translate-x-36 -translate-y-6",
  "translate-x-48 -translate-y-9",
  "translate-x-60 -translate-y-12",
  "translate-x-72 -translate-y-15",
  "translate-x-[21rem] -translate-y-[4.6rem]",
  "translate-x-[25rem] -translate-y-[5.5rem]"
];

interface DashboardSnapshot {
  profile: UserProfile;
}

interface BetHistorySnapshot {
  recentBets: BetHistoryEntry[];
}

interface RoundHistorySnapshot {
  rounds: RoundHistoryEntry[];
}

export function GameClient() {
  const [state, setState] = useState<PublicRoundState>(initialState);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [betAmount, setBetAmount] = useState(2);
  const [mode, setMode] = useState<"demo" | "real">("demo");
  const [message, setMessage] = useState("Log in to sync bets, balances, and history with the persistent wallet.");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeBet, setActiveBet] = useState<ActiveBetState | null>(null);
  const [autoCashOutMultiplier, setAutoCashOutMultiplier] = useState<number | "">("");
  const [recentBets, setRecentBets] = useState<BetHistoryEntry[]>([]);
  const [roundHistory, setRoundHistory] = useState<RoundHistoryEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastAutoCashOutSyncRef = useRef<string | null>(null);

  async function loadWallet(token: string) {
    const response = await fetch(`${API_URL}/api/me/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json() as DashboardSnapshot;
    setProfile(data.profile);
  }

  async function loadActiveBet(token: string) {
    const response = await fetch(`${API_URL}/api/me/game/active-bet`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json() as { activeBet: ActiveBetState | null };
    setActiveBet(data.activeBet);
  }

  async function loadBetHistory(token: string) {
    const response = await fetch(`${API_URL}/api/me/game/history`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json() as BetHistorySnapshot;
    setRecentBets(data.recentBets);
  }

  async function loadRoundHistory() {
    const response = await fetch(`${API_URL}/api/game/history`);

    if (!response.ok) {
      return;
    }

    const data = await response.json() as RoundHistorySnapshot;
    setRoundHistory(data.rounds);
  }

  useEffect(() => {
    const session = getStoredSession();

    if (session) {
      setSessionToken(session.token);
      void loadWallet(session.token);
      void loadActiveBet(session.token);
      void loadBetHistory(session.token);
    }

    void loadRoundHistory();

    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("round:update", (payload: PublicRoundState) => setState(payload));
    socket.on("round:crashed", () => {
      setActiveBet((currentBet) => {
        if (currentBet) {
          setMessage("The dog vanished before your cash out. Your bet was settled as a loss.");
        }

        return null;
      });
      lastAutoCashOutSyncRef.current = null;
      void loadRoundHistory();
      if (session?.token) {
        void loadWallet(session.token);
        void loadBetHistory(session.token);
      }
    });
    socket.on("community:update", (payload: { chat: ChatMessage[]; leaderboard: LeaderboardEntry[] }) => {
      setChat(payload.chat);
      setLeaderboard(payload.leaderboard);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const dogPositionClass = useMemo(() => {
    const bucket = Math.min(dogPositions.length - 1, Math.floor(state.currentMultiplier));
    return dogPositions[bucket];
  }, [state.currentMultiplier]);

  const canPlaceBet = betAmount >= GAME_RULES.minimumBetUsd && betAmount <= GAME_RULES.maximumBetUsd;

  useEffect(() => {
    if (!activeBet) {
      lastAutoCashOutSyncRef.current = null;
      return;
    }

    if (
      sessionToken &&
      activeBet?.autoCashOutAt &&
      state.status === "running" &&
      state.currentMultiplier >= activeBet.autoCashOutAt &&
      lastAutoCashOutSyncRef.current !== activeBet.id
    ) {
      lastAutoCashOutSyncRef.current = activeBet.id;
      setMessage(`Auto cash-out threshold ${activeBet.autoCashOutAt.toFixed(2)}x reached. Syncing payout...`);
      void loadWallet(sessionToken);
      void loadActiveBet(sessionToken);
      void loadBetHistory(sessionToken);
    }
  }, [activeBet, sessionToken, state.currentMultiplier, state.status]);

  async function handlePlaceBet() {
    if (!sessionToken) {
      setMessage("Log in first to place persistent bets.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/me/game/bet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          amountUsd: betAmount,
          mode,
          autoCashOutMultiplier: autoCashOutMultiplier === "" ? undefined : autoCashOutMultiplier
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Unable to place bet.");
        return;
      }

      setActiveBet(data.activeBet as ActiveBetState);
      setProfile(data.profile as UserProfile);
      await loadBetHistory(sessionToken);
      setMessage(`Bet placed for ${currency(betAmount)} in ${mode} mode.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCashOut() {
    if (!sessionToken) {
      setMessage("Log in first to cash out.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/me/game/cashout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Unable to cash out bet.");
        return;
      }

      setActiveBet(null);
      setProfile(data.profile as UserProfile);
      await loadBetHistory(sessionToken);
      setMessage(`Cash out successful: ${currency(data.payoutUsd ?? 0)}.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.45fr_0.55fr]">
      <section className="space-y-6">
        <div className="card grid-overlay relative overflow-hidden p-6 shadow-glow danger-pulse">
          <div className="absolute inset-0 bg-gradient-to-br from-aviator.red/20 via-transparent to-aviator.yellow/10" />
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="badge">Round #{state.roundId}</p>
              <h1 className="mt-4 text-5xl font-black tracking-tight sm:text-7xl">
                <span className={clsx(state.status === "crashed" ? "text-aviator.red" : "text-aviator.yellow")}>{state.currentMultiplier.toFixed(2)}x</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-neutral-300 sm:text-base">
                Transparent house edge: {(GAME_RULES.defaultHouseEdge * 100).toFixed(1)}% • Demo balance: {currency(GAME_RULES.demoStartingBalanceUsd)} • RTP and fairness details remain visible each session.
              </p>
              {profile && (
                <p className="mt-2 text-sm text-neutral-300">
                  Wallets • Real: {currency(profile.balanceUsd)} • Demo: {currency(profile.demoBalanceUsd)}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-neutral-300">
              <p>Status: <span className="font-semibold text-white">{state.status}</span></p>
              <p>Recent crashes: {state.history.slice(0, 5).map((value) => `${value.toFixed(2)}x`).join(" • ")}</p>
            </div>
          </div>

          <div className="speed-track relative mt-10 h-72 overflow-hidden rounded-3xl border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <div className="absolute bottom-0 h-20 w-full bg-gradient-to-r from-red-900/30 via-orange-800/30 to-red-900/30" />
            <div className={clsx("absolute left-8 top-24 text-6xl transition-transform duration-75", dogPositionClass, state.status === "crashed" && "opacity-0 scale-75 blur-sm")}>
              🐕
            </div>
            <div className="absolute left-8 top-7 text-xs uppercase tracking-[0.25em] text-amber-200/80">Speed lane</div>
            <div className="absolute bottom-6 left-6 text-sm text-neutral-200">
              {state.status === "crashed"
                ? "The dog disappeared. Round over."
                : "Cash out before the dog disappears."}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">Bet slip</p>
            <label htmlFor="bet-amount" className="mt-4 block text-sm text-neutral-300">Bet amount</label>
            <input
              id="bet-amount"
              type="number"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
              min={GAME_RULES.minimumBetUsd}
              max={GAME_RULES.maximumBetUsd}
              step="0.5"
              placeholder="Enter stake amount"
              title="Bet amount"
              value={betAmount}
              onChange={(event) => setBetAmount(Number(event.target.value))}
            />
            <div className="mt-3 flex gap-2 text-sm">
              <button type="button" className={clsx("rounded-full px-3 py-2", mode === "demo" ? "bg-aviator.yellow text-black" : "bg-white/5 text-white")} onClick={() => setMode("demo")}>Demo</button>
              <button type="button" className={clsx("rounded-full px-3 py-2", mode === "real" ? "bg-aviator.red text-white" : "bg-white/5 text-white")} onClick={() => setMode("real")}>Real</button>
            </div>
            <label htmlFor="auto-cashout" className="mt-4 block text-sm text-neutral-300">Auto cash-out multiplier</label>
            <input
              id="auto-cashout"
              type="number"
              min="1.01"
              step="0.01"
              placeholder="Optional e.g. 2.00"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
              value={autoCashOutMultiplier}
              onChange={(event) => setAutoCashOutMultiplier(event.target.value ? Number(event.target.value) : "")}
            />
            <button
              type="button"
              className="mt-4 w-full rounded-2xl bg-aviator.yellow px-4 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canPlaceBet || Boolean(activeBet) || state.status !== "running" || isSubmitting}
              onClick={() => void handlePlaceBet()}
            >
              {activeBet ? "Bet placed" : "Place bet"}
            </button>
            <button
              type="button"
              className="mt-3 w-full rounded-2xl border border-aviator.red/40 bg-aviator.red/10 px-4 py-3 font-bold text-white disabled:opacity-50"
              disabled={!activeBet || state.status !== "running" || isSubmitting}
              onClick={() => void handleCashOut()}
            >
              Cash Out
            </button>
            <p className="mt-3 text-xs text-neutral-400">Min bet {currency(GAME_RULES.minimumBetUsd)} • Max bet {currency(GAME_RULES.maximumBetUsd)} • Min withdrawal {currency(GAME_RULES.minimumWithdrawalUsd)}</p>
            <p className="mt-3 text-sm text-neutral-300">
              {activeBet
                ? `Active ${activeBet.mode} bet for round ${activeBet.roundNonce}${activeBet.autoCashOutAt ? ` • auto cash-out ${activeBet.autoCashOutAt.toFixed(2)}x` : ""}.`
                : message}
            </p>
          </div>

          <div className="card p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">Rewards & alerts</p>
            <ul className="mt-4 space-y-3 text-sm text-neutral-200">
              <li>Daily reward streak: <strong>6 days</strong></li>
              <li>Level progress: <strong>68%</strong></li>
              <li>Playtime alert: <strong>Every 20 minutes</strong></li>
              <li>Cooldown reminder: <strong>Available in settings</strong></li>
            </ul>
          </div>

          <div className="card p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">Season events</p>
            <ul className="mt-4 space-y-3 text-sm text-neutral-200">
              <li>Harare Sprint League</li>
              <li>Referral bonus campaign</li>
              <li>Cosmetic collars & runner badges</li>
              <li>Localized USD / ZWG support</li>
            </ul>
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">Live chat</p>
            <span className="text-xs text-neutral-500">Moderation ready</span>
          </div>
          <div className="mt-4 space-y-3">
            {chat.map((entry) => (
              <div key={entry.id} className="rounded-2xl bg-black/30 p-3 text-sm">
                <p className="font-semibold text-aviator.yellow">{entry.user}</p>
                <p className="mt-1 text-neutral-200">{entry.text}</p>
              </div>
            ))}
          </div>
          <input
            className="mt-4 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Status messages and chat input share this field for now"
          />
        </div>

        <div className="card p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">Leaderboard</p>
          <div className="mt-4 space-y-3">
            {leaderboard.map((entry) => (
              <div key={`${entry.player}-${entry.multiplier}`} className="flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-white">{entry.player}</p>
                  <p className="text-neutral-400">{entry.multiplier.toFixed(2)}x</p>
                </div>
                <p className="font-semibold text-aviator.yellow">{currency(entry.payoutUsd)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">Recent round history</p>
          <div className="mt-4 space-y-3">
            {roundHistory.map((round) => (
              <div key={`${round.roundId}-${round.hash}`} className="rounded-2xl bg-black/30 px-4 py-3 text-sm text-neutral-200">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-white">Round #{round.roundId}</span>
                  <span className="font-semibold text-aviator.yellow">{round.crashPoint.toFixed(2)}x</span>
                </div>
                <p className="mt-1 text-neutral-400">{new Date(round.startedAt).toLocaleString()}</p>
              </div>
            ))}
            {roundHistory.length === 0 && <p className="text-neutral-300">Round history will appear after a few flights.</p>}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">Your recent bets</p>
          <div className="mt-4 space-y-3">
            {recentBets.map((bet) => (
              <div key={bet.id} className="rounded-2xl bg-black/30 px-4 py-3 text-sm text-neutral-200">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-white">Round #{bet.roundNonce}</span>
                  <span className="capitalize text-neutral-400">{bet.status.replace("_", " ")}</span>
                </div>
                <p className="mt-1">Stake {currency(bet.amountUsd)} • {bet.mode}</p>
                <p className="mt-1 text-neutral-400">
                  {typeof bet.payoutUsd === "number"
                    ? `Payout ${currency(bet.payoutUsd)}`
                    : typeof bet.crashMultiplier === "number"
                      ? `Crashed at ${bet.crashMultiplier.toFixed(2)}x`
                      : "Awaiting settlement"}
                </p>
              </div>
            ))}
            {recentBets.length === 0 && <p className="text-neutral-300">Log in and place bets to build your flight history.</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
