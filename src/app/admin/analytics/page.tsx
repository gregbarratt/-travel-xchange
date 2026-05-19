import type { Metadata } from "next";

import { AdminAnalyticsPage } from "@/components/admin/admin-analytics-page";

export const metadata: Metadata = {
  title: "Admin Analytics",
  description: "Travel Xchange owner analytics dashboard.",
};

export default function AdminAnalyticsRoute() {
  return <AdminAnalyticsPage />;
}
