import type { Metadata } from "next";

import { AdminUsersPage } from "@/components/admin/admin-users-page";

export const metadata: Metadata = {
  title: "Admin Users",
  description: "Travel Xchange user management.",
};

export default function AdminUsersRoute() {
  return <AdminUsersPage />;
}
