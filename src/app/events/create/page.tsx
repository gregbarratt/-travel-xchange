import type { Metadata } from "next";

import { EventCreateForm } from "@/components/events/event-create-form";

export const metadata: Metadata = {
  title: "Create Event",
  description: "Create a Travel Xchange event.",
};

export default function CreateEventPage() {
  return <EventCreateForm />;
}
