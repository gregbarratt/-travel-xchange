import type { Metadata } from "next";

import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Travel Xchange owner dashboard and moderation overview.",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
