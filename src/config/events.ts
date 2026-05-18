import type { EventDeliveryFormat, EventType } from "@/types/database";

export const eventTypeOptions: Array<{
  description: string;
  label: string;
  value: EventType | "all";
}> = [
  {
    description: "All event types.",
    label: "All events",
    value: "all",
  },
  {
    description: "Online industry session.",
    label: "Webinar",
    value: "webinar",
  },
  {
    description: "Familiarisation trip.",
    label: "Fam trip",
    value: "fam_trip",
  },
  {
    description: "Supplier or destination roadshow.",
    label: "Roadshow",
    value: "roadshow",
  },
  {
    description: "Conference or summit.",
    label: "Conference",
    value: "conference",
  },
  {
    description: "Training day or workshop.",
    label: "Training day",
    value: "training_day",
  },
  {
    description: "Networking event.",
    label: "Networking",
    value: "networking",
  },
  {
    description: "Virtual event.",
    label: "Virtual event",
    value: "virtual_event",
  },
  {
    description: "Trade show or exhibition.",
    label: "Trade show",
    value: "trade_show",
  },
];

export const eventDeliveryOptions: Array<{
  label: string;
  value: EventDeliveryFormat | "all";
}> = [
  { label: "All formats", value: "all" },
  { label: "Online", value: "online" },
  { label: "In person", value: "in_person" },
  { label: "Hybrid", value: "hybrid" },
];

export function getEventTypeLabel(type: string) {
  return (
    eventTypeOptions.find((option) => option.value === type)?.label ??
    type.replaceAll("_", " ")
  );
}

export function getEventDeliveryLabel(format: string) {
  return (
    eventDeliveryOptions.find((option) => option.value === format)?.label ??
    format.replaceAll("_", " ")
  );
}

export function slugifyEventTitle(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "event"}-${Date.now()}`;
}

export function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatEventDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function toDateTimeLocalValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 16);
}
