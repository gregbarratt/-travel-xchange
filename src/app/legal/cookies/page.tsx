import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { legalDocuments } from "@/config/legal";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: legalDocuments.cookies.description,
};

export default function CookiesPage() {
  return <LegalPage document={legalDocuments.cookies} />;
}
