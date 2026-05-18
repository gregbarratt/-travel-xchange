import type { Metadata } from "next";

import { DashboardPanel } from "@/components/dashboard/dashboard-panel";

export const metadata: Metadata = {
  title: "Xchange Feed",
  description: "Travel Xchange member feed and dashboard.",
};

export default function DashboardPage() {
  return <DashboardPanel />;
}
