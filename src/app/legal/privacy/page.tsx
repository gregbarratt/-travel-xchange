import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { legalDocuments } from "@/config/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: legalDocuments.privacy.description,
};

export default function PrivacyPage() {
  return <LegalPage document={legalDocuments.privacy} />;
}
