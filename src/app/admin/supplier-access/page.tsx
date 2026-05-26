import type { Metadata } from "next";

import { AdminSupplierAccessPage } from "@/components/admin/admin-supplier-access-page";

export const metadata: Metadata = {
  title: "Supplier Access Admin | Travel Xchange",
  description: "Manage supplier page access for agents and members.",
};

export default function SupplierAccessAdminRoute() {
  return <AdminSupplierAccessPage />;
}
