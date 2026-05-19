import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { legalDocuments } from "@/config/legal";

const document = legalDocuments["advertiser-terms"];

export const metadata: Metadata = {
  title: "Advertiser Terms",
  description: document.description,
};

export default function AdvertiserTermsPage() {
  return <LegalPage document={document} />;
}
