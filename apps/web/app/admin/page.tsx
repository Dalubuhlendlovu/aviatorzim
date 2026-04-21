import { AdminDashboardClient } from "../../src/components/admin-dashboard-client";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="badge">Operations console</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Admin dashboard</h1>
      </div>
      <AdminDashboardClient />
    </div>
  );
}
