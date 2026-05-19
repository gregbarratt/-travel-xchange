import type { Metadata } from "next";

import { AdminArticlesPage } from "@/components/admin/admin-articles-page";

export const metadata: Metadata = {
  title: "Admin Articles",
  description: "Travel Xchange news and supplier update administration.",
};

export default function AdminArticlesRoute() {
  return <AdminArticlesPage />;
}
