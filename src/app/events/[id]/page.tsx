import type { Metadata } from "next";

import { EventDetailPage } from "@/components/events/event-detail-page";

export const metadata: Metadata = {
  title: "Event Detail",
  description: "Travel Xchange event detail.",
};

type EventRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function EventRoute({ params }: EventRouteProps) {
  const { id } = await params;

  return <EventDetailPage eventId={id} />;
}
