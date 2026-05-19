import type { Metadata } from "next";

import { AdminReportsPage } from "@/components/admin/admin-reports-page";

export const metadata: Metadata = {
  title: "Admin Reports",
  description: "Travel Xchange reports and moderation queue.",
};

export default function AdminReportsRoute() {
  return <AdminReportsPage />;
}
