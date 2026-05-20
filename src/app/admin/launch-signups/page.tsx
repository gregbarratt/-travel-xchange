import type { Metadata } from "next";

import { AdminLaunchSignupsPage } from "@/components/admin/admin-launch-signups-page";

export const metadata: Metadata = {
  title: "Admin Launch Signups",
  description: "Travel Xchange pre-launch signup management.",
};

export default function AdminLaunchSignupsRoute() {
  return <AdminLaunchSignupsPage />;
}
