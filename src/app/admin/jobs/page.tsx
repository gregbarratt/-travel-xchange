import type { Metadata } from "next";

import { AdminJobsPage } from "@/components/admin/admin-jobs-page";

export const metadata: Metadata = {
  title: "Admin Jobs",
  description: "Travel Xchange jobs board administration.",
};

export default function AdminJobsRoute() {
  return <AdminJobsPage />;
}
