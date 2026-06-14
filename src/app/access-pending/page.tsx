import type { Metadata } from "next";

import { AccessPendingPanel } from "@/components/auth/access-pending-panel";

export const metadata: Metadata = {
  title: "Access pending",
  description: "Your Travel Xchange account is waiting for approval.",
};

export default function AccessPendingPage() {
  return <AccessPendingPanel />;
}
