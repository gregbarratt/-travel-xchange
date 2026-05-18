import type { Metadata } from "next";

import { JobsBoard } from "@/components/jobs/jobs-board";

export const metadata: Metadata = {
  title: "Jobs",
  description: "Travel Xchange jobs board.",
};

export default function JobsPage() {
  return <JobsBoard />;
}
