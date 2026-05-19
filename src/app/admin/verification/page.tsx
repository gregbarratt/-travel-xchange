import type { Metadata } from "next";

import { AdminVerificationPage } from "@/components/admin/admin-verification-page";

export const metadata: Metadata = {
  title: "Admin Verification",
  description: "Travel Xchange verification review queue.",
};

export default function AdminVerificationRoute() {
  return <AdminVerificationPage />;
}
