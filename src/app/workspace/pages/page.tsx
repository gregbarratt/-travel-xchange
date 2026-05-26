import type { Metadata } from "next";

import { ManagedPagesPage } from "@/components/workspace/managed-pages-page";

export const metadata: Metadata = {
  title: "Managed Pages | Travel Xchange",
  description: "Supplier and company pages you can manage on Travel Xchange.",
};

export default function Page() {
  return <ManagedPagesPage />;
}
