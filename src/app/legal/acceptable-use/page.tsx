import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { legalDocuments } from "@/config/legal";

const document = legalDocuments["acceptable-use"];

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description: document.description,
};

export default function AcceptableUsePage() {
  return <LegalPage document={document} />;
}
