"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { EventCard } from "@/components/events/event-card";
import { MemberPageShell } from "@/components/member/member-page-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  eventDeliveryOptions,
  eventTypeOptions,
  formatEventDate,
  formatEventTime,
} from "@/config/events";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  Company,
  Event,
  EventDeliveryFormat,
  EventRegistration,
  EventType,
  EventWithMeta,
  Profile,
} from "@/types/database";

type TypeFilter = EventType | "all";
type DeliveryFilter = EventDeliveryFormat | "all";

const phase8SetupMessage =
  "The Phase 8 events tables are not installed yet. Run supabase/phase-8-events.sql in Supabase, then refresh this page.";

function isMissingEventsTable(error: { code?: string; message?: string }) {
  return isMissingTableError(error, ["events", "event_registrations"]);
}

function buildEventRows(
  events: Event[],
  companies: Pick<Company, "id" | "name" | "company_type">[],
  creators: Pick<Profile, "id" | "full_name" | "headline" | "role">[],
  registrations: Pick<EventRegistration, "event_id" | "user_id">[],
  currentUserId: string,
): EventWithMeta[] {
  const companyMap = new Map(companies.map((company) => [company.id, company]));
  const creatorMap = new Map(creators.map((creator) => [creator.id, creator]));
  const registrationCountMap = registrations.reduce<Map<string, number>>(
    (map, registration) => {
      map.set(registration.event_id, (map.get(registration.event_id) ?? 0) + 1);
      return map;
    },
    new Map(),
  );
  const registeredEventIds = new Set(
    registrations
      .filter((registration) => registration.user_id === currentUserId)
      .map((registration) => registration.event_id),
  );

  return events.map((event) => ({
    ...event,
    company: event.company_id ? companyMap.get(event.company_id) ?? null : null,
    creator: creatorMap.get(event.created_by) ?? null,
    is_registered_by_current_user: registeredEventIds.has(event.id),
    registration_count: registrationCountMap.get(event.id) ?? 0,
  }));
}

export function EventsDirectory() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventWithMeta[]>([]);
  const [activeType, setActiveType] = useState<TypeFilter>("all");
  const [activeDelivery, setActiveDelivery] = useState<DeliveryFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadEvents = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const [{ data: profileData }, { data: eventRows, error: eventsError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase
          .from("events")
          .select("*")
          .eq("status", "published")
          .order("starts_at", { ascending: true }),
      ]);

    setViewerProfile(profileData);

    if (eventsError) {
      setError(
        isMissingEventsTable(eventsError) ? phase8SetupMessage : eventsError.message,
      );
      setEvents([]);
      setIsLoading(false);
      return;
    }

    const typedEvents = (eventRows ?? []) as Event[];
    const eventIds = typedEvents.map((event) => event.id);
    const companyIds = Array.from(
      new Set(
        typedEvents.map((event) => event.company_id).filter(Boolean) as string[],
      ),
    );
    const creatorIds = Array.from(
      new Set(typedEvents.map((event) => event.created_by)),
    );

    let companyRows: Pick<Company, "id" | "name" | "company_type">[] = [];
    let creatorRows: Pick<Profile, "id" | "full_name" | "headline" | "role">[] =
      [];
    let registrationRows: Pick<EventRegistration, "event_id" | "user_id">[] = [];

    if (companyIds.length > 0) {
      const { data: companiesData } = await supabase
        .from("companies")
        .select("id, name, company_type")
        .in("id", companyIds);

      companyRows = (companiesData ?? []) as Pick<
        Company,
        "id" | "name" | "company_type"
      >[];
    }

    if (creatorIds.length > 0) {
      const { data: creatorsData } = await supabase
        .from("profiles")
        .select("id, full_name, headline, role")
        .in("id", creatorIds);

      creatorRows = (creatorsData ?? []) as Pick<
        Profile,
        "id" | "full_name" | "headline" | "role"
      >[];
    }

    if (eventIds.length > 0) {
      const { data: registrationsData, error: registrationsError } = await supabase
        .from("event_registrations")
        .select("event_id, user_id")
        .in("event_id", eventIds);

      if (registrationsError) {
        setError(
          isMissingEventsTable(registrationsError)
            ? phase8SetupMessage
            : registrationsError.message,
        );
        setEvents([]);
        setIsLoading(false);
        return;
      }

      registrationRows = (registrationsData ?? []) as Pick<
        EventRegistration,
        "event_id" | "user_id"
      >[];
    }

    setEvents(
      buildEventRows(
        typedEvents,
        companyRows,
        creatorRows,
        registrationRows,
        userData.user.id,
      ),
    );
    setCurrentTimeMs(Date.now());
    setError(null);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEvents();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadEvents]);

  const filteredEvents = events.filter((event) => {
    const typeMatches = activeType === "all" || event.event_type === activeType;
    const deliveryMatches =
      activeDelivery === "all" || event.delivery_format === activeDelivery;
    const searchMatches =
      !searchTerm.trim() ||
      [event.title, event.description, event.location, event.venue_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase());

    return typeMatches && deliveryMatches && searchMatches;
  });
  const upcomingEvents = events
    .filter(
      (event) =>
        currentTimeMs === 0 ||
        new Date(event.starts_at).getTime() >= currentTimeMs,
    )
    .slice(0, 5);
  const featuredEvents = events.filter((event) => event.is_featured).slice(0, 3);

  return (
    <MemberPageShell
      activeLabel="Events"
      actions={
        <Link
          className={cn(
            buttonVariants({ size: "lg" }),
            "hidden bg-[#0f766e] text-white hover:bg-[#115e59] sm:inline-flex",
          )}
          href="/events/create"
        >
          <Plus className="size-4" aria-hidden="true" />
          Create event
        </Link>
      }
      eyebrow="Events"
      title="Travel industry events"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so events cannot load.
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-[#0f766e]">
              Phase 8 events directory
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
              Webinars, fam trips, roadshows, training days, and trade events
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Members can publish travel trade events, browse by event type,
              and register interest for early MVP testing.
            </p>
          </div>
          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-[#0f766e] text-white hover:bg-[#115e59] sm:hidden",
            )}
            href="/events/create"
          >
            <Plus className="size-4" aria-hidden="true" />
            Create event
          </Link>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                Search events
              </span>
              <input
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cruise, Manchester, webinar..."
                value={searchTerm}
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {eventTypeOptions.map((option) => (
                <button
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition",
                    activeType === option.value
                      ? "border-[#0f766e] bg-[#e0f2f1] text-[#0f766e]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  key={option.value}
                  onClick={() => setActiveType(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {eventDeliveryOptions.map((option) => (
                <button
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition",
                    activeDelivery === option.value
                      ? "border-[#082f49] bg-slate-100 text-[#082f49]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  key={option.value}
                  onClick={() => setActiveDelivery(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading events...
            </div>
          ) : null}

          {!isLoading && filteredEvents.length === 0 && !error ? (
            <div className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
              <CalendarDays
                className="mx-auto size-8 text-[#0f766e]"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">
                No events match this view
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Try clearing the filters or create the first event for the
                travel trade calendar.
              </p>
              <Link
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-5 bg-[#0f766e] text-white hover:bg-[#115e59]",
                )}
                href="/events/create"
              >
                <Plus className="size-4" aria-hidden="true" />
                Create event
              </Link>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredEvents.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                Calendar view
              </h2>
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="mt-4 space-y-3">
                {upcomingEvents.map((event) => (
                  <Link
                    className="grid grid-cols-[58px_1fr] gap-3 rounded-md border border-slate-100 p-3 hover:bg-slate-50"
                    href={`/events/${event.id}`}
                    key={event.id}
                  >
                    <span className="rounded-md bg-[#e0f2f1] px-2 py-2 text-center text-xs font-semibold text-[#0f766e]">
                      {formatEventDate(event.starts_at).split(" ").slice(0, 2).join(" ")}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-950">
                        {event.title}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {formatEventTime(event.starts_at)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Upcoming events will appear here in date order.
              </p>
            )}
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Featured events
            </h2>
            {featuredEvents.length > 0 ? (
              <div className="mt-4 space-y-3">
                {featuredEvents.map((event) => (
                  <Link
                    className="block rounded-md border border-slate-100 p-3 hover:bg-slate-50"
                    href={`/events/${event.id}`}
                    key={event.id}
                  >
                    <p className="font-semibold text-slate-950">{event.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {event.location || event.venue_name || "Online"}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Featured event placements will appear here once selected.
              </p>
            )}
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin className="size-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                Event revenue placeholder
              </h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Paid event listings, sponsored webinars, ticket sales, and virtual
              booths are saved for later monetisation phases.
            </p>
          </article>
        </aside>
      </div>
    </MemberPageShell>
  );
}
