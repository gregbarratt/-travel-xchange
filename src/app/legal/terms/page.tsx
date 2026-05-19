import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { legalDocuments } from "@/config/legal";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: legalDocuments.terms.description,
};

export default function TermsPage() {
  return <LegalPage document={legalDocuments.terms} />;
}
