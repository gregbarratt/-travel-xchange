import type { Metadata } from "next";

import { CompanyPage } from "@/components/company/company-page";

export const metadata: Metadata = {
  title: "Supplier Profile",
  description: "Travel Xchange supplier profile.",
};

type SupplierRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function SupplierRoute({ params }: SupplierRouteProps) {
  const { id } = await params;

  return <CompanyPage companyId={id} variant="supplier" />;
}
