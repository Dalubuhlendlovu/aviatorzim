import { GAME_RULES } from "@aviator-zim/shared";

const codeExample = [
  'hash = HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}`)',
  'r = first_52_bits(hash) / 2^52',
  'crashPoint = max(1, floor((100 / (1 - r)) * (1 - edge)) / 100)'
];

export default function ProvablyFairPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="badge">Provably fair verification</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">How round outcomes are generated</h1>
      </div>

      <div className="card p-6 text-neutral-200">
        <p>
          Each round is derived from a server seed, client seed, and nonce. The starter uses a transparent house edge of
          {(GAME_RULES.defaultHouseEdge * 100).toFixed(1)}% that is visible in product copy and API responses.
        </p>
        <ol className="mt-6 list-decimal space-y-3 pl-6">
          <li>Generate an HMAC-SHA256 hash from the server seed and `clientSeed:nonce`.</li>
          <li>Convert the first 52 bits into a floating-point value between 0 and 1.</li>
          <li>Apply the crash formula and publish the resulting multiplier after the round ends.</li>
          <li>Expose verification data so players can confirm the outcome independently.</li>
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
    </div>
  );
}
