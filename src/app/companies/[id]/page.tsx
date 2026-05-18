import type { Metadata } from "next";

import { CompanyPage } from "@/components/company/company-page";

export const metadata: Metadata = {
  title: "Company Profile",
  description: "Travel Xchange company profile.",
};

type CompanyRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function CompanyRoute({ params }: CompanyRouteProps) {
  const { id } = await params;

  return <CompanyPage companyId={id} variant="company" />;
}
