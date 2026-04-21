export default function TermsAndConditionsPage() {
  return (
    <div className="card max-w-4xl space-y-6 p-6 text-neutral-200">
      <div>
        <p className="badge">Terms & Conditions</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Platform rules and participation terms</h1>
      </div>
      <ul className="list-disc space-y-3 pl-6">
        <li>Players must meet the legal age and eligibility requirements for their jurisdiction.</li>
        <li>Demo mode is available before real-money features are unlocked.</li>
        <li>Deposits, withdrawals, and account verification remain subject to payment-provider and compliance review.</li>
        <li>Provably fair outcomes, RTP information, and account limits should be clearly disclosed before play.</li>
        <li>Self-exclusion, cooldowns, and safer-play interventions must remain available at all times.</li>
      </ul>
    </div>
  );
}
