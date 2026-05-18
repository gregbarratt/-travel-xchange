import type { Metadata } from "next";

import { EventsDirectory } from "@/components/events/events-directory";

export const metadata: Metadata = {
  title: "Events",
  description: "Travel Xchange events directory.",
};

export default function EventsPage() {
  return <EventsDirectory />;
}
