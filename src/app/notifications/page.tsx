import type { Metadata } from "next";

import { NotificationsCentre } from "@/components/messages/notifications-centre";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Travel Xchange member notifications.",
};

export default function NotificationsPage() {
  return <NotificationsCentre />;
}
