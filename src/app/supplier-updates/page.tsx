import type { Metadata } from "next";

import { SupplierUpdatesPage } from "@/components/news/supplier-updates-page";

export const metadata: Metadata = {
  title: "Supplier Updates",
  description: "Travel Xchange supplier updates and press releases.",
};

export default function SupplierUpdatesRoute() {
  return <SupplierUpdatesPage />;
}
