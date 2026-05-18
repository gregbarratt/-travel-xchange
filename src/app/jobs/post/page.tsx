import type { Metadata } from "next";

import { JobPostForm } from "@/components/jobs/job-post-form";

export const metadata: Metadata = {
  title: "Post a Job",
  description: "Post a Travel Xchange job listing.",
};

export default function PostJobPage() {
  return <JobPostForm />;
}
