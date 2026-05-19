import type { Metadata } from "next";

import { AdminPostsPage } from "@/components/admin/admin-posts-page";

export const metadata: Metadata = {
  title: "Admin Posts",
  description: "Travel Xchange post moderation.",
};

export default function AdminPostsRoute() {
  return <AdminPostsPage />;
}
