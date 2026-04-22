"use client";

import Link from "next/link";
import { currency, GAME_RULES } from "@aviator-zim/shared";
import { useEffect, useRef } from "react";

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Animated multiplier animation on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrame: number;
    let time = 0;

    const animate = () => {
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      // Draw background gradient
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "rgba(245,197,24,0.02)");
      grad.addColorStop(0.5, "rgba(34,197,94,0.01)");
      grad.addColorStop(1, "rgba(224,53,53,0.02)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Simulate multiplier curve
      time += 0.02;
      const baseMultiplier = 1 + Math.exp(time / 3) * 0.5;

      // Draw grid
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (H / 5) * i);
        ctx.lineTo(W, (H / 5) * i);
        ctx.stroke();
      }

      // Draw curve
      ctx.beginPath();
      for (let x = 0; x < W; x += 5) {
        const t = (x / W) * 4;
        const m = 1 + Math.exp(t / 3) * 0.5 * Math.sin(time * 0.5 + x * 0.005);
        const y = H - (m / baseMultiplier) * (H * 0.7);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#f5c518";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw dot
      const dotX = W * 0.8 + Math.sin(time * 0.3) * 20;
      const dotM = 1 + Math.exp((dotX / W) * 4 / 3) * 0.5;
      const dotY = H - (dotM / baseMultiplier) * (H * 0.7);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#f5c518";
      ctx.shadowColor = "#f5c518";
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (time < 6) animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="space-y-16 py-8">
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center lg:min-h-[80vh]">
        {/* Background glow effect */}
        <div
          className="absolute inset-0 -z-10 mx-auto max-w-4xl"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at center, rgba(245, 197, 24, 0.08) 0%, transparent 80%)",
            filter: "blur(40px)",
          }}
        />

        <div className="hero-title space-y-2">
          <p className="badge mx-auto">🐕 Sky Sprint • Live Crash Betting</p>
          <h1 className="text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl leading-tight">
            <span className="text-white">Instant thrills.</span>
            <br />
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
              Transparent odds.
            </span>
          </h1>
        </div>

        <p className="hero-subtitle mt-6 max-w-2xl text-lg text-neutral-300">
          Real-time multiplier rounds with provably fair verification, demo play, and responsible gambling controls.
        </p>

        <div className="hero-buttons mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/game"
            className="glow-box rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 px-8 py-3 font-bold text-black shadow-lg hover:shadow-xl transition-all"
          >
            Play Now
          </Link>
          <Link
            href="/signup"
            className="rounded-xl border border-white/20 bg-white/5 px-8 py-3 font-bold text-white hover:bg-white/10 transition-all"
          >
            Create Account
          </Link>
        </div>
      </section>

      {/* ─── Game Preview Canvas ──────────────────────────────────── */}
      <section className="game-preview max-w-4xl mx-auto w-full">
        <div className="card overflow-hidden border-2 border-yellow-400/30 shadow-2xl">
          <canvas
            ref={canvasRef}
            width={900}
            height={360}
            className="w-full h-auto display-block bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
          />
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 font-semibold">LIVE ROUNDS</span>
            </span>
            <span className="text-neutral-400">Watch real multipliers • Verify any round</span>
          </div>
        </div>
      </section>

      {/* ─── Why Sky Sprint ────────────────────────────────────────– */}
      <section className="grid gap-6 md:grid-cols-3 py-8 max-w-5xl mx-auto">
        <div className="card p-6 hover:border-yellow-400/50 transition-colors">
          <div className="text-3xl mb-3">⚡</div>
          <h3 className="font-bold text-lg">Instant Action</h3>
          <p className="mt-2 text-sm text-neutral-400">Real-time multiplier rounds. Pure adrenaline. Cash out anytime before the crash.</p>
        </div>
        <div className="card p-6 hover:border-yellow-400/50 transition-colors">
          <div className="text-3xl mb-3">🔐</div>
          <h3 className="font-bold text-lg">Provably Fair</h3>
          <p className="mt-2 text-sm text-neutral-400">Every round cryptographically verified. Check the math behind every result.</p>
        </div>
        <div className="card p-6 hover:border-yellow-400/50 transition-colors">
          <div className="text-3xl mb-3">💰</div>
          <h3 className="font-bold text-lg">Play Safe</h3>
          <p className="mt-2 text-sm text-neutral-400">Demo mode with $10,000. Built-in responsible gambling controls always active.</p>
        </div>
      </section>

      {/* ─── Stats Bar ────────────────────────────────────────────── */}
      <section className="card p-8 border-yellow-400/20 bg-gradient-to-br from-yellow-400/5 to-transparent max-w-5xl mx-auto w-full">
        <div className="grid gap-6 sm:grid-cols-4">
          <div className="text-center">
            <p className="text-2xl font-black text-yellow-400">
              {currency(GAME_RULES.minimumBetUsd)}–{currency(GAME_RULES.maximumBetUsd)}
            </p>
            <p className="mt-1 text-xs text-neutral-400 uppercase tracking-wider">Bet Range</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-green-400">98%</p>
            <p className="mt-1 text-xs text-neutral-400 uppercase tracking-wider">RTP</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-blue-400">18+</p>
            <p className="mt-1 text-xs text-neutral-400 uppercase tracking-wider">Age Limit</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-purple-400">100%</p>
            <p className="mt-1 text-xs text-neutral-400 uppercase tracking-wider">Fair</p>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────────── */}
      <section className="text-center py-8">
        <h2 className="text-3xl font-bold mb-6">Ready to play?</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/game"
            className="inline-block rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 px-10 py-4 font-bold text-black hover:shadow-2xl transition-all"
          >
            Start Playing →
          </Link>
          <Link
            href="/provably-fair"
            className="inline-block rounded-xl border border-white/20 bg-white/5 px-10 py-4 font-bold text-white hover:bg-white/10 transition-all"
          >
            How We Work
          </Link>
        </div>
      </section>
    </div>
  );
}
