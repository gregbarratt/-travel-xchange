import type { Metadata } from "next";

import { JobDetailPage } from "@/components/jobs/job-detail-page";

export const metadata: Metadata = {
  title: "Job Detail",
  description: "Travel Xchange job detail.",
};

type JobRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function JobRoute({ params }: JobRouteProps) {
  const { id } = await params;

  return <JobDetailPage jobId={id} />;
}
