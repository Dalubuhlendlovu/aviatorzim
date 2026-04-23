"use client";

import { GAME_RULES, type RoundVerificationResult } from "@aviator-zim/shared";
import { FormEvent, useState } from "react";
import { API_URL } from "../../src/lib/api";

const codeExample = [
  'seedHash = SHA256(serverSeed)',
  'outcomeHash = HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}`)',
  'r = first_52_bits(hash) / 2^52',
  'crashPoint = max(1, floor((100 / (1 - r)) * (1 - edge)) / 100)'
];

export default function ProvablyFairPage() {
  const [nonceInput, setNonceInput] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoundVerificationResult | null>(null);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nonce = Number.parseInt(nonceInput, 10);
    if (Number.isNaN(nonce) || nonce <= 0) {
      setError("Nonce must be a positive integer.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/game/verify/${nonce}`);
      const payload = await response.json();
      if (!response.ok) {
        setResult(null);
        setError(payload?.error ?? "Unable to verify round.");
        return;
      }

      setResult(payload as RoundVerificationResult);
    } catch {
      setResult(null);
      setError("Unable to reach verification service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="badge">Provably fair verification</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">How round outcomes are generated</h1>
      </div>

      <div className="card p-6 text-neutral-200">
        <p>
          Each round now follows full seed lifecycle verification: seed commitment is published before the round,
          the prior round seed is revealed after crash, and anyone can recompute the exact outcome. Current house edge:
          {(GAME_RULES.defaultHouseEdge * 100).toFixed(1)}%.
        </p>
        <ol className="mt-6 list-decimal space-y-3 pl-6">
          <li>Commit the round by publishing <code>seedHash = SHA256(serverSeed)</code> before betting starts.</li>
          <li>Generate <code>outcomeHash = HMAC_SHA256(serverSeed, clientSeed:nonce)</code>.</li>
          <li>Convert the first 52 bits into a floating-point value between 0 and 1.</li>
          <li>Apply the crash formula and settle the round.</li>
          <li>After crash, reveal server seed and verify commitment + outcome recomputation.</li>
        </ol>
      </div>

      <div className="card p-6">
        <h2 className="text-2xl font-bold">Reference flow</h2>
        <div className="mt-4 space-y-3 rounded-3xl bg-black/40 p-5 font-mono text-sm text-aviator.yellow">
          {codeExample.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-2xl font-bold">Verify a round</h2>
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(event) => void handleVerify(event)}>
          <label className="flex min-w-[220px] flex-col gap-2 text-sm text-neutral-300">
            Round nonce
            <input
              className="field"
              inputMode="numeric"
              value={nonceInput}
              onChange={(event) => setNonceInput(event.target.value)}
              placeholder="e.g. 42"
            />
          </label>
          <button
            type="submit"
            className="btn-bet btn-bet-place"
            style={{ width: "auto", paddingInline: "1rem" }}
            disabled={loading}
          >
            {loading ? "Verifying…" : "Verify"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-300">{error}</p>
        )}

        {result && (
          <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/30 p-4 text-sm">
            <p><strong>Round:</strong> #{result.roundId}</p>
            <p><strong>Crash:</strong> {result.crashPoint.toFixed(2)}x</p>
            <p><strong>Seed commitment:</strong> {result.matches.seedCommitment ? "✅ match" : "❌ mismatch"}</p>
            <p><strong>Outcome hash:</strong> {result.matches.outcomeHash ? "✅ match" : "❌ mismatch"}</p>
            <p><strong>Crash recomputation:</strong> {result.matches.crashPoint ? "✅ match" : "❌ mismatch"}</p>

            <details className="pt-2 text-xs text-neutral-300">
              <summary className="cursor-pointer text-neutral-100">Show cryptographic inputs</summary>
              <div className="mt-3 space-y-2 break-all font-mono">
                <p><strong>serverSeed</strong>: {result.serverSeed}</p>
                <p><strong>clientSeed</strong>: {result.clientSeed}</p>
                <p><strong>nonce</strong>: {result.nonce}</p>
                <p><strong>seedHash (published)</strong>: {result.seedHash}</p>
                <p><strong>seedHash (recomputed)</strong>: {result.recomputed.seedHash}</p>
                <p><strong>outcomeHash (stored)</strong>: {result.outcomeHash}</p>
                <p><strong>outcomeHash (recomputed)</strong>: {result.recomputed.outcomeHash}</p>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
