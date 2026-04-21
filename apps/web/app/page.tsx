import Link from "next/link";
import { currency, GAME_RULES } from "@aviator-zim/shared";

const featureCards = [
  "Real-time multiplier animation and round history",
  "Demo mode with $10,000 virtual balance",
  "PayNow, EcoCash, and OneMoney payment placeholders",
  "Live chat, leaderboard, rewards, tournaments, and referrals",
  "Provably fair verification and visible RTP / odds information",
  "Responsible gambling reminders, cooldowns, and legal pages"
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="card overflow-hidden p-8 sm:p-12">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="badge">Built for Zimbabwe • Mobile-first • Scalable</p>
            <h1 className="mt-6 text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
              Crash-game intensity with transparent odds and safer-play controls.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-neutral-300">
              Aviator Zim Game is a full-stack starter for a Zimbabwe-focused crash platform with demo play, real-time rounds,
              account management, payment integration placeholders, and compliance-focused UX.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/game" className="rounded-2xl bg-aviator.yellow px-6 py-3 font-bold text-black">Launch live game</Link>
              <Link href="/signup" className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-bold text-white">Create account</Link>
            </div>
          </div>

          <div className="card bg-black/30 p-6">
            <h2 className="text-2xl font-bold">Core limits</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-neutral-400">Minimum deposit</p>
                <p className="mt-1 text-2xl font-black">{currency(GAME_RULES.minimumDepositUsd)}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Minimum withdrawal</p>
                <p className="mt-1 text-2xl font-black">{currency(GAME_RULES.minimumWithdrawalUsd)}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Minimum bet</p>
                <p className="mt-1 text-2xl font-black">{currency(GAME_RULES.minimumBetUsd)}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Maximum bet</p>
                <p className="mt-1 text-2xl font-black">{currency(GAME_RULES.maximumBetUsd)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {featureCards.map((item) => (
          <div key={item} className="card p-6 text-neutral-200">
            <p className="text-lg font-semibold text-white">{item}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6">
          <h2 className="text-2xl font-bold">RTP & fairness</h2>
          <p className="mt-4 text-neutral-300">
            The starter ships with a transparent house-edge model and a verification route for round hashes. Players can inspect seeds,
            nonce-based outcomes, and historical crash multipliers.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="text-2xl font-bold">Payments</h2>
          <p className="mt-4 text-neutral-300">
            Payment service endpoints are scaffolded for PayNow, EcoCash, and OneMoney. Production credentials, KYC, AML, and settlement
            flows must be configured before going live.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="text-2xl font-bold">Responsible gambling</h2>
          <p className="mt-4 text-neutral-300">
            Playtime alerts, cooldown reminders, and prominent legal notices are included by default so the product stays clear-eyed about risk.
          </p>
        </div>
      </section>
    </div>
  );
}
