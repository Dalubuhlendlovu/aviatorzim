import { DashboardPageClient } from "../../src/components/dashboard-page-client";

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="badge">Account overview</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Player dashboard</h1>
      </div>
      <DashboardPageClient />
    </div>
  );
}
