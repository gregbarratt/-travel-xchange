import type { Metadata } from "next";

import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { PublicPageShell } from "@/components/layout/public-page-shell";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Travel Xchange member dashboard.",
};

export default function DashboardPage() {
  return (
    <PublicPageShell>
      <main className="min-h-screen bg-[#f8fafc] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <DashboardPanel />
        </div>
      </main>
    </PublicPageShell>
  );
}
