import type { Metadata } from "next";

import { SupportHub } from "@/components/support/support-hub";

export const metadata: Metadata = {
  title: "Support",
  description: "Travel Xchange support and Q&A hub.",
};

export default function SupportPage() {
  return <SupportHub />;
}
