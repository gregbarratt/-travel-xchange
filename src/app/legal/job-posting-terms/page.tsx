import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { legalDocuments } from "@/config/legal";

const document = legalDocuments["job-posting-terms"];

export const metadata: Metadata = {
  title: "Job Posting Terms",
  description: document.description,
};

export default function JobPostingTermsPage() {
  return <LegalPage document={document} />;
}
