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
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { DogSprite } from "./dog-sprite";
import { API_URL, SOCKET_URL } from "../lib/api";
import { getStoredSession } from "../lib/auth";
import { useGameAudio } from "../lib/use-game-audio";

// ─── helpers ────────────────────────────────────────────────────────────────

function pillClass(v: number) {
  if (v < 2)   return "pill-low";
  if (v < 10)  return "pill-mid";
  return "pill-high";
}

function multClass(status: string) {
  if (status === "running")  return "mult-running";
  if (status === "crashed")  return "mult-crashed";
  return "mult-starting";
}

const QUICK_STAKES = [0.5, 1, 2, 5, 10, 25];

const INIT: PublicRoundState = {
  roundId: 0, hash: "", status: "starting",
  elapsedMs: 0, currentMultiplier: 1,
  startedAt: new Date().toISOString(), history: [3.21, 1.04, 8.67, 1.98, 2.34, 1.22],
};

interface DashboardSnap  { profile: UserProfile }
interface BetHistorySnap { recentBets: BetHistoryEntry[] }
interface RoundHistorySnap { rounds: RoundHistoryEntry[] }

// ─── Canvas graph ────────────────────────────────────────────────────────────

function useMultiplierCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  multiplier: number,
  status: string,
) {
  // store a growing path of [elapsed%, multiplier] samples
  const samplesRef = useRef<[number, number][]>([[0, 1]]);
  const maxMultRef  = useRef(1);

  useEffect(() => {
    if (status === "starting") {
      samplesRef.current = [[0, 1]];
      maxMultRef.current  = 1;
    }
    if (status === "running") {
      const last = samplesRef.current[samplesRef.current.length - 1];
      if (multiplier > (last?.[1] ?? 1)) {
        samplesRef.current.push([Date.now(), multiplier]);
        if (multiplier > maxMultRef.current) maxMultRef.current = multiplier;
      }
    }
  }, [multiplier, status]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(0, (H / 5) * i); ctx.lineTo(W, (H / 5) * i); ctx.stroke();
      ctx.beginPath(); ctx.moveTo((W / 5) * i, 0); ctx.lineTo((W / 5) * i, H); ctx.stroke();
    }

    const samples = samplesRef.current;
    if (samples.length < 2) return;

    const firstTs = samples[0][0];
    const lastTs  = samples[samples.length - 1][0];
    const tSpan   = Math.max(1, lastTs - firstTs);
    const maxM    = Math.max(maxMultRef.current, 2);

    const toX = (ts: number) => ((ts - firstTs) / tSpan) * W * 0.92 + W * 0.04;
    const toY = (m: number)  => H - ((m - 1) / (maxM - 1)) * H * 0.85 - H * 0.07;

    const crashed = status === "crashed";
    const lineColor = crashed ? "#e03535" : "#f5c518";

    // glow fill under curve
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, crashed ? "rgba(224,53,53,0.18)"  : "rgba(245,197,24,0.15)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.moveTo(toX(samples[0][0]), H);
    for (const [ts, m] of samples) ctx.lineTo(toX(ts), toY(m));
    ctx.lineTo(toX(samples[samples.length - 1][0]), H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // main curve
    ctx.beginPath();
    ctx.moveTo(toX(samples[0][0]), toY(samples[0][1]));
    for (const [ts, m] of samples) ctx.lineTo(toX(ts), toY(m));
    ctx.strokeStyle = lineColor;
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = "round";
    ctx.stroke();

    // leading dot
    const tip = samples[samples.length - 1];
    ctx.beginPath();
    ctx.arc(toX(tip[0]), toY(tip[1]), 5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.shadowColor = lineColor;
    ctx.shadowBlur  = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [canvasRef, status]);

  useEffect(() => {
    draw();
  }, [multiplier, status, draw]);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GameClient() {
  const [state,       setState]       = useState<PublicRoundState>(INIT);
  const [chat,        setChat]        = useState<ChatMessage[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [betAmount,   setBetAmount]   = useState(2);
  const [mode,        setMode]        = useState<"demo"|"real">("demo");
  const [autoCashOut, setAutoCashOut] = useState<number|"">("");
  const [message,     setMessage]     = useState("");
  const [sessionToken,setSessionToken]= useState<string|null>(null);
  const [profile,     setProfile]     = useState<UserProfile|null>(null);
  const [activeBet,   setActiveBet]   = useState<ActiveBetState|null>(null);
  const [recentBets,  setRecentBets]  = useState<BetHistoryEntry[]>([]);
  const [roundHistory,setRoundHistory]= useState<RoundHistoryEntry[]>([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [sideTab,     setSideTab]     = useState<"chat"|"leaderboard"|"history">("history");
  const [flashCrash,  setFlashCrash]  = useState(false);
  const [connectionMode, setConnectionMode] = useState<"live" | "simulated">("simulated");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevMultRef = useRef(1);
  const lastACORef  = useRef<string|null>(null);
  const fallbackTimerRef = useRef<number|undefined>(undefined);
  const socketOnlineRef = useRef(false);
  const fallbackRoundRef = useRef({
    phase: "starting" as "starting" | "running" | "crashed",
    roundId: 1,
    phaseStartedAt: Date.now(),
    crashAt: 2,
  });
  const { playTick, playBetPlaced, playCashOut, playCrash } = useGameAudio();

  useMultiplierCanvas(canvasRef, state.currentMultiplier, state.status);

  function stopFallbackSimulation() {
    if (fallbackTimerRef.current !== undefined) {
      window.clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = undefined;
    }
  }

  function startFallbackSimulation() {
    if (fallbackTimerRef.current !== undefined) return;

    setConnectionMode("simulated");
    setMessage("Live server unavailable — running local simulation.");
    fallbackRoundRef.current = {
      phase: "starting",
      roundId: Math.max(1, state.roundId || 1),
      phaseStartedAt: Date.now(),
      crashAt: Number((1.05 + Math.random() * 8.5).toFixed(2)),
    };

    fallbackTimerRef.current = window.setInterval(() => {
      if (socketOnlineRef.current) {
        stopFallbackSimulation();
        return;
      }

      const sim = fallbackRoundRef.current;
      const now = Date.now();

      if (sim.phase === "starting") {
        const elapsedMs = now - sim.phaseStartedAt;
        setState((prev) => ({
          ...prev,
          roundId: sim.roundId,
          status: "starting",
          elapsedMs,
          currentMultiplier: 1,
          startedAt: new Date(sim.phaseStartedAt).toISOString(),
        }));

        if (elapsedMs >= 1000) {
          sim.phase = "running";
          sim.phaseStartedAt = now;
          sim.crashAt = Number((1.05 + Math.random() * 8.5).toFixed(2));
        }
        return;
      }

      if (sim.phase === "running") {
        const elapsedSeconds = (now - sim.phaseStartedAt) / 1000;
        const live = Math.max(1, Number(Math.exp(0.1 * elapsedSeconds).toFixed(2)));
        const current = Math.min(live, sim.crashAt);

        setState((prev) => ({
          ...prev,
          roundId: sim.roundId,
          status: "running",
          elapsedMs: now - sim.phaseStartedAt,
          currentMultiplier: current,
          startedAt: new Date(sim.phaseStartedAt).toISOString(),
        }));

        if (current >= sim.crashAt) {
          sim.phase = "crashed";
          sim.phaseStartedAt = now;

          setState((prev) => ({
            ...prev,
            status: "crashed",
            currentMultiplier: sim.crashAt,
            history: [sim.crashAt, ...prev.history].slice(0, 20),
          }));

          playCrash();
          prevMultRef.current = 1;
          setFlashCrash(true);
          setTimeout(() => setFlashCrash(false), 600);
        }
        return;
      }

      if (now - sim.phaseStartedAt >= 1800) {
        sim.phase = "starting";
        sim.phaseStartedAt = now;
        sim.roundId += 1;
      }
    }, 100);
  }

  // ── data loaders ──────────────────────────────────────────────────────────
  async function loadWallet(token: string) {
    try {
      const r = await fetch(`${API_URL}/api/me/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return;
      const d = await r.json() as DashboardSnap;
      setProfile(d.profile);
    } catch {
      // ignore transient network failure
    }
  }
  async function loadActiveBet(token: string) {
    try {
      const r = await fetch(`${API_URL}/api/me/game/active-bet`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return;
      const d = await r.json() as { activeBet: ActiveBetState|null };
      setActiveBet(d.activeBet);
    } catch {
      // ignore transient network failure
    }
  }
  async function loadBetHistory(token: string) {
    try {
      const r = await fetch(`${API_URL}/api/me/game/history`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return;
      const d = await r.json() as BetHistorySnap;
      setRecentBets(d.recentBets);
    } catch {
      // ignore transient network failure
    }
  }
  async function loadRoundHistory() {
    try {
      const r = await fetch(`${API_URL}/api/game/history`);
      if (!r.ok) return;
      const d = await r.json() as RoundHistorySnap;
      setRoundHistory(d.rounds);
    } catch {
      // ignore transient network failure
    }
  }

  // ── socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setSessionToken(session.token);
      void loadWallet(session.token);
      void loadActiveBet(session.token);
      void loadBetHistory(session.token);
    }
    void loadRoundHistory();

    const socket = io(SOCKET_URL, { transports: ["websocket"], timeout: 5000, reconnectionAttempts: 4 });

    socket.on("connect", () => {
      socketOnlineRef.current = true;
      setConnectionMode("live");
      stopFallbackSimulation();
      setMessage("");
    });

    socket.on("connect_error", () => {
      socketOnlineRef.current = false;
      setConnectionMode("simulated");
      startFallbackSimulation();
    });

    socket.on("disconnect", () => {
      socketOnlineRef.current = false;
      setConnectionMode("simulated");
      startFallbackSimulation();
    });

    socket.on("round:update", (payload: PublicRoundState) => {
      socketOnlineRef.current = true;
      setConnectionMode("live");
      stopFallbackSimulation();
      setState(payload);
      const prev = prevMultRef.current;
      const curr = payload.currentMultiplier;
      if (payload.status === "running" && Math.floor(curr) > Math.floor(prev)) playTick(curr);
      prevMultRef.current = curr;
    });

    socket.on("round:crashed", () => {
      playCrash();
      prevMultRef.current = 1;
      setFlashCrash(true);
      setTimeout(() => setFlashCrash(false), 600);
      setActiveBet(cur => {
        if (cur) setMessage("The dog vanished — bet settled as a loss.");
        return null;
      });
      lastACORef.current = null;
      void loadRoundHistory();
      if (session?.token) { void loadWallet(session.token); void loadBetHistory(session.token); }
    });

    socket.on("community:update", (p: { chat: ChatMessage[]; leaderboard: LeaderboardEntry[] }) => {
      setChat(p.chat);
      setLeaderboard(p.leaderboard);
    });

    return () => {
      socket.disconnect();
      stopFallbackSimulation();
    };
  }, []);

  // ── auto cash-out sync ────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeBet) { lastACORef.current = null; return; }
    if (
      sessionToken && activeBet.autoCashOutAt &&
      state.status === "running" &&
      state.currentMultiplier >= activeBet.autoCashOutAt &&
      lastACORef.current !== activeBet.id
    ) {
      lastACORef.current = activeBet.id;
      setMessage(`Auto cash-out at ${activeBet.autoCashOutAt.toFixed(2)}x — syncing…`);
      void loadWallet(sessionToken);
      void loadActiveBet(sessionToken);
      void loadBetHistory(sessionToken);
    }
  }, [activeBet, sessionToken, state.currentMultiplier, state.status]);

  // ── actions ───────────────────────────────────────────────────────────────
  const canBet = betAmount >= GAME_RULES.minimumBetUsd && betAmount <= GAME_RULES.maximumBetUsd;

  async function handlePlaceBet() {
    if (!sessionToken) { setMessage("Log in to place real bets."); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`${API_URL}/api/me/game/bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ amountUsd: betAmount, mode, autoCashOutMultiplier: autoCashOut === "" ? undefined : autoCashOut }),
      });
      const d = await r.json();
      if (!r.ok) { setMessage(d.error ?? "Unable to place bet."); return; }
      setActiveBet(d.activeBet as ActiveBetState);
      setProfile(d.profile as UserProfile);
      await loadBetHistory(sessionToken);
      setMessage(`Bet of ${currency(betAmount)} placed.`);
      playBetPlaced();
    } catch {
      setMessage("Unable to place bet. Please check your connection.");
    } finally { setSubmitting(false); }
  }

  async function handleCashOut() {
    if (!sessionToken) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API_URL}/api/me/game/cashout`, {
        method: "POST", headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const d = await r.json();
      if (!r.ok) { setMessage(d.error ?? "Unable to cash out."); return; }
      setActiveBet(null);
      setProfile(d.profile as UserProfile);
      await loadBetHistory(sessionToken);
      setMessage(`Cashed out: ${currency(d.payoutUsd ?? 0)}`);
      playCashOut();
    } catch {
      setMessage("Unable to cash out. Please check your connection.");
    } finally { setSubmitting(false); }
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
    {/* ── crash history pills ───────────────────────────────────────── */}
    <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", padding: "6px 0 8px", scrollbarWidth: "none" }}>
      {state.history.slice(0, 20).map((v, i) => (
        <span key={i} className={pillClass(v)} style={{ borderRadius: 6, padding: "0.22rem 0.55rem", fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
          {v.toFixed(2)}x
        </span>
      ))}
    </div>

    {/* ── main layout: game | bet panel ─────────────────────────────── */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 10, alignItems: "start" }} className="max-lg:flex max-lg:flex-col">

      {/* ── LEFT: game canvas + sidebar ─────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Canvas card */}
        <div className={clsx("surface", flashCrash && "crash-flash")} style={{ padding: 0, overflow: "hidden" }}>
          {/* Round info bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid var(--c-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Round #{state.roundId}</span>
              <span style={{
                padding: "0.15rem 0.5rem", borderRadius: 5,
                fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em",
                background: state.status === "running" ? "rgba(34,197,94,0.12)" : state.status === "crashed" ? "rgba(224,53,53,0.14)" : "rgba(255,255,255,0.06)",
                color: state.status === "running" ? "#4ade80" : state.status === "crashed" ? "#f87171" : "#94a3b8",
                border: `1px solid ${state.status === "running" ? "rgba(34,197,94,0.3)" : state.status === "crashed" ? "rgba(224,53,53,0.3)" : "rgba(255,255,255,0.1)"}`,
                textTransform: "uppercase",
              }}>
                {state.status}
              </span>
              <span
                style={{
                  padding: "0.15rem 0.5rem",
                  borderRadius: 5,
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: connectionMode === "live" ? "rgba(34,197,94,0.12)" : "rgba(245,197,24,0.12)",
                  color: connectionMode === "live" ? "#4ade80" : "#f5c518",
                  border: `1px solid ${connectionMode === "live" ? "rgba(34,197,94,0.3)" : "rgba(245,197,24,0.3)"}`,
                }}
                title={connectionMode === "live" ? "Connected to live server" : "Using local simulation fallback"}
              >
                {connectionMode === "live" ? "Live" : "Simulated"}
              </span>
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--c-muted)" }}>
              House edge {(GAME_RULES.defaultHouseEdge * 100).toFixed(1)}% · RTP visible
            </span>
          </div>

          {/* Canvas */}
          <div className="game-canvas-wrap" style={{ position: "relative" }}>
            <canvas ref={canvasRef} width={900} height={320} style={{ width: "100%", height: "100%", display: "block" }} />

            {/* Large multiplier overlay */}
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <span className={multClass(state.status)} style={{ fontSize: "clamp(3rem, 8vw, 5.5rem)", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em" }}>
                {state.currentMultiplier.toFixed(2)}x
              </span>
              {state.status === "crashed" && (
                <span style={{ marginTop: 8, fontSize: "0.85rem", color: "#f87171", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                  FLEW AWAY
                </span>
              )}
              {state.status === "starting" && (
                <span style={{ marginTop: 8, fontSize: "0.78rem", color: "#94a3b8", letterSpacing: "0.12em" }}>
                  NEXT ROUND STARTING…
                </span>
              )}
            </div>

            {/* Dog sprite riding the curve */}
            {state.status !== "starting" && (
              <div style={{ position: "absolute", bottom: 28, left: 32, transition: "transform 80ms linear" }}>
                <DogSprite running={state.status === "running"} crashed={state.status === "crashed"} multiplier={state.currentMultiplier} />
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div style={{ padding: "7px 14px", borderTop: "1px solid var(--c-border)", fontSize: "0.72rem", color: "var(--c-muted)" }}>
            🔒 Provably fair · Seed verified after each round · {currency(GAME_RULES.demoStartingBalanceUsd)} demo balance available
          </div>
        </div>

        {/* Tabs: history / leaderboard / chat */}
        <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
          <div className="tab-group" style={{ borderRadius: "12px 12px 0 0" }}>
            {(["history", "leaderboard", "chat"] as const).map(t => (
              <button key={t} type="button" className={clsx("tab-btn", sideTab === t && "active")} onClick={() => setSideTab(t)} style={{ textTransform: "capitalize" }}>
                {t === "history" ? "Round History" : t === "leaderboard" ? "Leaderboard" : "Live Chat"}
              </button>
            ))}
          </div>

          <div style={{ maxHeight: 260, overflowY: "auto", padding: "8px 0" }}>
            {/* Round history */}
            {sideTab === "history" && (
              <table className="bets-table">
                <thead><tr><th>Round</th><th>Crash</th><th>Time</th></tr></thead>
                <tbody>
                  {roundHistory.length === 0 && (
                    <tr><td colSpan={3} style={{ color: "var(--c-muted)", textAlign: "center", padding: "1.5rem" }}>No rounds yet.</td></tr>
                  )}
                  {roundHistory.map(r => (
                    <tr key={`${r.roundId}-${r.hash}`}>
                      <td>#{r.roundId}</td>
                      <td className={clsx("td-mult", r.crashPoint >= 2 ? "td-won" : "td-lost")}>{r.crashPoint.toFixed(2)}x</td>
                      <td>{new Date(r.startedAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Leaderboard */}
            {sideTab === "leaderboard" && (
              <table className="bets-table">
                <thead><tr><th>Player</th><th>Mult</th><th>Payout</th></tr></thead>
                <tbody>
                  {leaderboard.length === 0 && (
                    <tr><td colSpan={3} style={{ color: "var(--c-muted)", textAlign: "center", padding: "1.5rem" }}>No entries yet.</td></tr>
                  )}
                  {leaderboard.map(e => (
                    <tr key={`${e.player}-${e.multiplier}`}>
                      <td>{e.player}</td>
                      <td className="td-mult td-won">{e.multiplier.toFixed(2)}x</td>
                      <td className="td-won">{currency(e.payoutUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Chat */}
            {sideTab === "chat" && (
              <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                {chat.length === 0 && <p style={{ color: "var(--c-muted)", fontSize: "0.78rem", textAlign: "center", padding: "1.5rem 0" }}>No messages yet.</p>}
                {chat.map(m => (
                  <div key={m.id} style={{ background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "6px 10px" }}>
                    <span style={{ color: "var(--c-yellow)", fontWeight: 700, fontSize: "0.78rem" }}>{m.user}</span>
                    <span style={{ color: "#c8cce0", fontSize: "0.78rem", marginLeft: 6 }}>{m.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Your bet history */}
        {recentBets.length > 0 && (
          <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--c-border)", fontSize: "0.72rem", fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Your bets
            </div>
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              <table className="bets-table">
                <thead><tr><th>Round</th><th>Stake</th><th>Mode</th><th>Result</th></tr></thead>
                <tbody>
                  {recentBets.map(b => (
                    <tr key={b.id}>
                      <td>#{b.roundNonce}</td>
                      <td>{currency(b.amountUsd)}</td>
                      <td style={{ textTransform: "capitalize" }}>{b.mode}</td>
                      <td className={b.status === "cashed_out" ? "td-won" : b.status === "crashed" ? "td-lost" : ""}>
                        {b.status === "cashed_out"  ? `+${currency(b.payoutUsd ?? 0)}`  :
                         b.status === "crashed"     ? `${b.crashMultiplier?.toFixed(2) ?? "?"}x` :
                         "active"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: bet panel ──────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Balance */}
        {profile && (
          <div className="surface" style={{ padding: "12px 14px", display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.65rem", color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Real</p>
              <p style={{ fontWeight: 800, color: "#e8eaf0" }}>{currency(profile.balanceUsd)}</p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.65rem", color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Demo</p>
              <p style={{ fontWeight: 800, color: "#e8eaf0" }}>{currency(profile.demoBalanceUsd)}</p>
            </div>
          </div>
        )}

        {/* Mode toggle */}
        <div className="surface" style={{ padding: "12px 14px" }}>
          <div className="tab-group" style={{ marginBottom: 12 }}>
            <button type="button" className={clsx("tab-btn", mode === "demo" && "active")} onClick={() => setMode("demo")}>Demo</button>
            <button type="button" className={clsx("tab-btn", mode === "real" && "active")} onClick={() => setMode("real")}>Real</button>
          </div>

          {/* Stake */}
          <label style={{ fontSize: "0.72rem", color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Stake (USD)</label>
          <input
            type="number" className="field" style={{ marginTop: 4 }}
            min={GAME_RULES.minimumBetUsd} max={GAME_RULES.maximumBetUsd} step="0.5"
            value={betAmount}
            onChange={e => setBetAmount(Number(e.target.value))}
          />

          {/* Quick chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
            {QUICK_STAKES.map(s => (
              <button key={s} type="button" className="chip" onClick={() => setBetAmount(s)}>${s}</button>
            ))}
          </div>

          {/* Auto cash-out */}
          <label style={{ fontSize: "0.72rem", color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginTop: 12 }}>
            Auto cash-out (optional)
          </label>
          <input
            type="number" className="field" style={{ marginTop: 4 }}
            min="1.01" step="0.01" placeholder="e.g. 2.00"
            value={autoCashOut}
            onChange={e => setAutoCashOut(e.target.value ? Number(e.target.value) : "")}
          />

          {/* CTA buttons */}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
            {!activeBet ? (
              <button
                type="button"
                className="btn-bet btn-bet-place"
                disabled={!canBet || state.status !== "running" || submitting}
                onClick={() => void handlePlaceBet()}
              >
                {submitting ? "Placing…" : `BET ${currency(betAmount)}`}
              </button>
            ) : (
              <button
                type="button"
                className="btn-bet btn-bet-cashout"
                disabled={state.status !== "running" || submitting}
                onClick={() => void handleCashOut()}
              >
                {submitting ? "Cashing…" : `CASH OUT @ ${state.currentMultiplier.toFixed(2)}x`}
              </button>
            )}
          </div>

          {/* Status message */}
          {message && (
            <p style={{ marginTop: 10, fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.5 }}>{message}</p>
          )}
          {!sessionToken && (
            <p style={{ marginTop: 10, fontSize: "0.73rem", color: "var(--c-muted)" }}>
              <a href="/login" style={{ color: "var(--c-yellow)", textDecoration: "none" }}>Log in</a> to place real bets and sync balances.
            </p>
          )}

          <p style={{ marginTop: 10, fontSize: "0.65rem", color: "var(--c-muted)", lineHeight: 1.6 }}>
            Min {currency(GAME_RULES.minimumBetUsd)} · Max {currency(GAME_RULES.maximumBetUsd)} · House edge {(GAME_RULES.defaultHouseEdge*100).toFixed(1)}%
          </p>
        </div>

        {/* Active bet status */}
        {activeBet && (
          <div className="surface" style={{ padding: "10px 14px", borderColor: "rgba(245,197,24,0.3)" }}>
            <p style={{ fontSize: "0.68rem", color: "var(--c-yellow)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Active bet</p>
            <p style={{ marginTop: 4, fontWeight: 800, fontSize: "1.1rem", color: "#e8eaf0" }}>{currency(activeBet.amountUsd)}</p>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>
              Potential {currency(activeBet.amountUsd * state.currentMultiplier)} @ {state.currentMultiplier.toFixed(2)}x
            </p>
            {activeBet.autoCashOutAt && (
              <p style={{ fontSize: "0.72rem", color: "var(--c-muted)", marginTop: 3 }}>Auto @ {activeBet.autoCashOutAt.toFixed(2)}x</p>
            )}
          </div>
        )}

        {/* Responsible gambling notice */}
        <div style={{ fontSize: "0.68rem", color: "var(--c-muted)", lineHeight: 1.7, padding: "0 2px" }}>
          🔞 18+ only. Gambling can be addictive.{" "}
          <a href="/responsible-gambling" style={{ color: "var(--c-yellow)", textDecoration: "none" }}>Safer Play tools</a> available.
          Provably fair — <a href="/provably-fair" style={{ color: "var(--c-yellow)", textDecoration: "none" }}>verify any round</a>.
        </div>
      </div>
    </div>

    {/* ── Mobile floating bet bar ────────────────────────────────────── */}
    <div className="mobile-bet-bar">
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: "0.4rem 0.7rem", border: "1px solid var(--c-border)" }}>
        <span style={{ fontSize: "0.7rem", color: "var(--c-muted)" }}>$</span>
        <input
          type="number" style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e8eaf0", fontWeight: 700, fontSize: "0.9rem", textAlign: "right" }}
          min={GAME_RULES.minimumBetUsd} max={GAME_RULES.maximumBetUsd} step="0.5"
          aria-label="Stake"
          value={betAmount} onChange={e => setBetAmount(Number(e.target.value))}
        />
      </div>
      {!activeBet ? (
        <button
          type="button"
          className="btn-bet btn-bet-place"
          style={{ flex: 1 }}
          disabled={!canBet || state.status !== "running" || submitting}
          onClick={() => void handlePlaceBet()}
        >
          BET
        </button>
      ) : (
        <button
          type="button"
          className="btn-bet btn-bet-cashout"
          style={{ flex: 1 }}
          disabled={state.status !== "running" || submitting}
          onClick={() => void handleCashOut()}
        >
          CASH OUT
        </button>
      )}
    </div>
    </>
  );
}
