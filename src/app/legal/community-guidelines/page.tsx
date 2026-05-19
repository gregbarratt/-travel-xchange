import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { legalDocuments } from "@/config/legal";

const document = legalDocuments["community-guidelines"];

export const metadata: Metadata = {
  title: "Community Guidelines",
  description: document.description,
};

export default function CommunityGuidelinesPage() {
  return <LegalPage document={document} />;
}
