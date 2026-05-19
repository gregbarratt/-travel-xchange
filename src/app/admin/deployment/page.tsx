import type { Metadata } from "next";

import { DeploymentGuidePage } from "@/components/deployment/deployment-guide-page";

export const metadata: Metadata = {
  title: "Deployment Guide",
  description: "Travel Xchange deployment guide for Vercel, Supabase, Stripe, and domains.",
};

export default function AdminDeploymentRoute() {
  return <DeploymentGuidePage />;
}
