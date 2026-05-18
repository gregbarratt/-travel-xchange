"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ExternalLink,
  MapPin,
  SendHorizontal,
  Star,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  formatEventDateTime,
  getEventDeliveryLabel,
  getEventTypeLabel,
} from "@/config/events";
import { getCompanyTypeLabel } from "@/config/roles";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  Company,
  Event,
  EventRegistration,
  Profile,
} from "@/types/database";

type EventDetailPageProps = {
  eventId: string;
};

const phase8SetupMessage =
  "The Phase 8 events tables are not installed yet. Run supabase/phase-8-events.sql in Supabase, then refresh this page.";

function isMissingEventsTable(error: { code?: string; message?: string }) {
  return isMissingTableError(error, ["events", "event_registrations"]);
}

export function EventDetailPage({ eventId }: EventDetailPageProps) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(configured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadEvent = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    setUserId(userData.user.id);

    const [{ data: profileData }, { data: eventData, error: eventError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
      ]);

    setViewerProfile(profileData);

    if (eventError) {
      setError(
        isMissingEventsTable(eventError) ? phase8SetupMessage : eventError.message,
      );
      setIsLoading(false);
      return;
    }

    if (!eventData) {
      setError("That event could not be found.");
      setIsLoading(false);
      return;
    }

    const typedEvent = eventData as Event;
    setEvent(typedEvent);

    const [registrationResult, creatorResult] = await Promise.all([
      supabase
        .from("event_registrations")
        .select("*")
        .eq("event_id", eventId),
      supabase
        .from("profiles")
        .select("*")
        .eq("id", typedEvent.created_by)
        .maybeSingle(),
    ]);

    if (registrationResult.error) {
      setError(
        isMissingEventsTable(registrationResult.error)
          ? phase8SetupMessage
          : registrationResult.error.message,
      );
      setIsLoading(false);
      return;
    }

    const registrationRows = (registrationResult.data ?? []) as EventRegistration[];
    const currentRegistration =
      registrationRows.find((row) => row.user_id === userData.user.id) ?? null;

    setRegistration(currentRegistration);
    setRegistrationCount(registrationRows.length);
    setNote(currentRegistration?.note ?? "");
    setCreator(creatorResult.data as Profile | null);

    if (typedEvent.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", typedEvent.company_id)
        .maybeSingle();

      setCompany(companyData as Company | null);
    }

    setError(null);
    setIsLoading(false);
  }, [eventId, router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEvent();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadEvent]);

  async function handleRegister(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();

    if (!supabase || !userId || !event || registration) {
      return;
    }

    setIsSaving(true);
    setActionError(null);

    const { error: registrationError } = await supabase
      .from("event_registrations")
      .insert({
        event_id: event.id,
        note: note.trim() || null,
        status: "registered",
        user_id: userId,
      });

    if (registrationError) {
      setActionError(
        isMissingEventsTable(registrationError)
          ? phase8SetupMessage
          : registrationError.code === "23505"
            ? "You are already registered for this event."
            : registrationError.message,
      );
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    await loadEvent();
  }

  async function handleCancelRegistration() {
    if (!supabase || !userId || !event || !registration) {
      return;
    }

    setIsSaving(true);
    setActionError(null);

    const { error: deleteError } = await supabase
      .from("event_registrations")
      .delete()
      .eq("event_id", event.id)
      .eq("user_id", userId);

    if (deleteError) {
      setActionError(
        isMissingEventsTable(deleteError)
          ? phase8SetupMessage
          : deleteError.message,
      );
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    await loadEvent();
  }

  const isOwner = Boolean(event && userId === event.created_by);

  return (
    <MemberPageShell
      activeLabel="Events"
      actions={
        <Link
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "hidden sm:inline-flex",
          )}
          href="/events"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Events
        </Link>
      }
      eyebrow="Event detail"
      title={event?.title ?? "Event"}
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so events cannot load.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading event...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      {event ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-5">
            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
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

              <h2 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">
                {event.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {company?.name ?? creator?.full_name ?? "Travel Xchange member"}
              </p>

              {event.image_url ? (
                <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    className="h-64 w-full object-cover"
                    src={event.image_url}
                  />
                </div>
              ) : null}
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                About this event
              </h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {event.description}
              </p>
            </article>
          </section>

          <aside className="space-y-5">
            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5 text-[#0f766e]" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950">
                  When and where
                </h2>
              </div>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-500">
                    Starts
                  </dt>
                  <dd className="mt-1 font-medium text-slate-950">
                    {formatEventDateTime(event.starts_at)}
                  </dd>
                </div>
                {event.ends_at ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-500">
                      Ends
                    </dt>
                    <dd className="mt-1 font-medium text-slate-950">
                      {formatEventDateTime(event.ends_at)}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-500">
                    Timezone
                  </dt>
                  <dd className="mt-1 font-medium text-slate-950">
                    {event.timezone}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-500">
                    Location
                  </dt>
                  <dd className="mt-1 flex items-center gap-1 font-medium text-slate-950">
                    <MapPin className="size-3" aria-hidden="true" />
                    {event.location || event.venue_name || "Online"}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-[#0f766e]" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950">
                  Registration
                </h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {registrationCount} member{registrationCount === 1 ? "" : "s"} registered
                {event.capacity ? ` out of ${event.capacity} places` : ""}.
              </p>

              {isOwner ? (
                <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  You created this event. Attendee management arrives in later
                  admin and analytics phases.
                </p>
              ) : registration ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                    You are registered for this event.
                  </div>
                  <Button
                    className="h-10 w-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                    disabled={isSaving}
                    onClick={handleCancelRegistration}
                    type="button"
                  >
                    Cancel registration
                  </Button>
                </div>
              ) : (
                <form className="mt-4 space-y-3" onSubmit={handleRegister}>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-800">
                      Note for organiser
                    </span>
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15"
                      onChange={(eventChange) => setNote(eventChange.target.value)}
                      placeholder="Optional note."
                      value={note}
                    />
                  </label>
                  {actionError ? (
                    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                      {actionError}
                    </p>
                  ) : null}
                  <Button
                    className="h-10 w-full bg-[#0f766e] text-white hover:bg-[#115e59]"
                    disabled={isSaving}
                    type="submit"
                  >
                    <SendHorizontal className="size-4" aria-hidden="true" />
                    {isSaving ? "Saving" : "Register interest"}
                  </Button>
                </form>
              )}

              {event.registration_url ? (
                <a
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "mt-4 w-full bg-[#082f49] text-white hover:bg-[#0c4a6e]",
                  )}
                  href={event.registration_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  External registration
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              ) : null}
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-[#0f766e]" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950">
                  Organiser
                </h2>
              </div>
              {company ? (
                <div className="mt-4 space-y-3">
                  <p className="font-semibold text-slate-950">{company.name}</p>
                  <p className="text-sm text-slate-600">
                    {getCompanyTypeLabel(company.company_type)}
                  </p>
                  <Link
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "w-full justify-center bg-white",
                    )}
                    href={`/companies/${company.id}`}
                  >
                    View company
                  </Link>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  This event is attributed to the publishing member until a
                  company is connected.
                </p>
              )}
            </article>
          </aside>
        </div>
      ) : null}
    </MemberPageShell>
  );
}
