const notices = [
  "Set deposit, wager, and session limits before playing real-money rounds.",
  "Display reality checks every 20 minutes and offer fast-access cooldown controls.",
  "Show RTP, odds, and current house edge clearly before every session.",
  "Escalate self-exclusion, AML/KYC, and support links before production launch."
];

export default function ResponsibleGamblingPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="badge">Responsible gambling</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Safer play tools and legal transparency</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-2xl font-bold">Player protections</h2>
          <ul className="mt-4 space-y-4 text-neutral-200">
            {notices.map((notice) => (
              <li key={notice} className="rounded-2xl bg-black/30 p-4">{notice}</li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="text-2xl font-bold">Legal pages included</h2>
          <ul className="mt-4 space-y-3 text-sm text-neutral-200">
            <li>Privacy Policy</li>
            <li>Terms & Conditions</li>
            <li>Responsible Gambling Notice</li>
            <li>RTP / odds transparency section</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
