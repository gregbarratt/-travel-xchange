import Link from "next/link";
import { CalendarDays, MapPin, Star, Users } from "lucide-react";

import {
  formatEventDate,
  formatEventTime,
  getEventDeliveryLabel,
  getEventTypeLabel,
} from "@/config/events";
import { cn } from "@/lib/utils";
import type { EventWithMeta } from "@/types/database";

type EventCardProps = {
  event: EventWithMeta;
};

export function EventCard({ event }: EventCardProps) {
  return (
    <article
      className={cn(
        "rounded-md border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        event.is_featured ? "border-[#0f766e]" : "border-slate-200",
      )}
    >
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-[#e0f2f1] px-2 py-1 text-xs font-semibold text-[#0f766e]">
          <CalendarDays className="size-3" aria-hidden="true" />
          {getEventTypeLabel(event.event_type)}
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
          {getEventDeliveryLabel(event.delivery_format)}
        </span>
        {event.is_featured ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
            <Star className="size-3" aria-hidden="true" />
            Featured
          </span>
        ) : null}
      </div>

      <Link href={`/events/${event.id}`}>
        <h2 className="mt-3 text-xl font-semibold tracking-normal text-slate-950">
          {event.title}
        </h2>
      </Link>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            Date
          </p>
          <p className="mt-1 font-medium text-slate-950">
            {formatEventDate(event.starts_at)}
          </p>
          <p className="mt-1 text-slate-600">{formatEventTime(event.starts_at)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            Location
          </p>
          <p className="mt-1 flex items-center gap-1 font-medium text-slate-950">
            <MapPin className="size-3" aria-hidden="true" />
            {event.location || event.venue_name || "Online"}
          </p>
        </div>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-700">
        {event.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>{event.company?.name ?? event.creator?.full_name ?? "Travel Xchange"}</span>
        <span>-</span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3" aria-hidden="true" />
          {event.registration_count} registered
        </span>
        {event.is_registered_by_current_user ? (
          <>
            <span>-</span>
            <span className="font-semibold text-emerald-700">You are registered</span>
          </>
        ) : null}
      </div>
    </article>
  );
}
