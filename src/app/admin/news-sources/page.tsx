import type { Metadata } from "next";

import { AdminNewsSourcesPage } from "@/components/admin/admin-news-sources-page";

export const metadata: Metadata = {
  title: "News Sources Admin | Travel Xchange",
  description: "Verify publisher feeds and control automated trade news ingestion.",
};

export default function NewsSourcesAdminRoute() {
  return <AdminNewsSourcesPage />;
}
