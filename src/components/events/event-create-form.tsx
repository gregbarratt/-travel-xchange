"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarPlus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import {
  eventDeliveryOptions,
  eventTypeOptions,
  slugifyEventTitle,
} from "@/config/events";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { normalizeWebsiteUrl } from "@/lib/urls";
import type {
  Company,
  EventDeliveryFormat,
  EventType,
  Profile,
} from "@/types/database";

const phase8SetupMessage =
  "The Phase 8 events tables are not installed yet. Run supabase/phase-8-events.sql in Supabase, then refresh this page.";

function isMissingEventsTable(error: { code?: string; message?: string }) {
  return isMissingTableError(error, ["events", "event_registrations"]);
}

function numberOrNull(value: FormDataEntryValue | null) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function dateTimeValueOrNull(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function EventCreateForm() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(configured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadViewer = useCallback(async () => {
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

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();

    setViewerProfile(profileData);

    if (profileData?.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profileData.company_id)
        .maybeSingle();

      setCompany(companyData);
    }

    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadViewer();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadViewer]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !userId) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const eventType = String(formData.get("event_type") ?? "webinar") as EventType;
    const deliveryFormat = String(
      formData.get("delivery_format") ?? "online",
    ) as EventDeliveryFormat;
    const startsAt = dateTimeValueOrNull(formData.get("starts_at"));
    const endsAt = dateTimeValueOrNull(formData.get("ends_at"));
    const timezone =
      String(formData.get("timezone") ?? "").trim() || "Europe/London";
    const venueName = String(formData.get("venue_name") ?? "").trim() || null;
    const location = String(formData.get("location") ?? "").trim() || null;
    const registrationUrl = normalizeWebsiteUrl(
      String(formData.get("registration_url") ?? ""),
    );
    const imageUrl = normalizeWebsiteUrl(String(formData.get("image_url") ?? ""));
    const isFeatured = formData.get("is_featured") === "on";

    if (!title || !description || !startsAt) {
      setError("Please add a title, event date, and description.");
      return;
    }

    if (endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
      setError("The end date must be after the start date.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .insert({
        capacity: numberOrNull(formData.get("capacity")),
        company_id: company?.id ?? null,
        created_by: userId,
        delivery_format: deliveryFormat,
        description,
        ends_at: endsAt,
        event_type: eventType,
        image_url: imageUrl,
        is_featured: isFeatured,
        location,
        registration_url: registrationUrl,
        slug: slugifyEventTitle(title),
        starts_at: startsAt,
        status: "published",
        timezone,
        title,
        venue_name: venueName,
        visibility: "members",
      })
      .select("id")
      .single();

    if (eventError) {
      setError(
        isMissingEventsTable(eventError)
          ? phase8SetupMessage
          : eventError.code === "23505"
            ? "An event with this title already exists. Try changing the title slightly."
            : eventError.message,
      );
      setIsSaving(false);
      return;
    }

    router.push(`/events/${eventData.id}`);
  }

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
      eyebrow="Create event"
      title="Add a travel trade event"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so events cannot save.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading event form...
        </div>
      ) : null}

      <form
        className="mx-auto max-w-4xl space-y-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={handleSubmit}
      >
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          This event will be attributed to{" "}
          <strong>{company?.name ?? viewerProfile?.full_name ?? "your account"}</strong>.
          Paid event listings and ticket sales are saved for later phases.
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarPlus className="size-5 text-[#0f766e]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-950">
              Event details
            </h2>
          </div>
          <TextField
            label="Event title"
            name="title"
            placeholder="Luxury Cruise Supplier Webinar"
            required
          />
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Event type"
              name="event_type"
              options={eventTypeOptions
                .filter((option) => option.value !== "all")
                .map((option) => ({
                  label: `${option.label} - ${option.description}`,
                  value: option.value,
                }))}
            />
            <SelectField
              label="Format"
              name="delivery_format"
              options={eventDeliveryOptions
                .filter((option) => option.value !== "all")
                .map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
            />
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Date and place
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Starts"
              name="starts_at"
              required
              type="datetime-local"
            />
            <TextField
              label="Ends"
              name="ends_at"
              type="datetime-local"
            />
            <TextField
              defaultValue="Europe/London"
              label="Timezone"
              name="timezone"
              placeholder="Europe/London"
            />
            <TextField
              label="Venue name"
              name="venue_name"
              placeholder="Manchester Central or Zoom"
            />
            <TextField
              label="Location"
              name="location"
              placeholder="Manchester, UK or Online"
            />
            <TextField
              label="Capacity"
              min={1}
              name="capacity"
              placeholder="50"
              type="number"
            />
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Event description
          </h2>
          <TextareaField
            className="min-h-44"
            label="Description"
            name="description"
            placeholder="Explain who should attend, what they will learn, and any supplier or destination details."
            required
          />
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Registration and placement
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              hint="Optional. Paste a booking link. Travel Xchange will add https:// if needed."
              label="Registration URL"
              name="registration_url"
              placeholder="www.example.com/register"
              type="text"
            />
            <TextField
              hint="Optional. Paste a full image URL if you have one."
              label="Image URL"
              name="image_url"
              placeholder="https://example.com/event.jpg"
              type="text"
            />
          </div>
          <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <input
              className="mt-1 size-4 accent-[#0f766e]"
              name="is_featured"
              type="checkbox"
            />
            <span>
              <span className="block font-semibold text-slate-950">
                Feature this event
              </span>
              <span className="mt-1 block leading-6">
                This places the event in the featured area for MVP testing.
              </span>
            </span>
          </label>
        </section>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "justify-center sm:hidden",
            )}
            href="/events"
          >
            Back to events
          </Link>
          <Button
            className="h-11 bg-[#0f766e] px-5 text-white hover:bg-[#115e59]"
            disabled={isSaving}
            type="submit"
          >
            <Plus className="size-4" aria-hidden="true" />
            {isSaving ? "Publishing" : "Publish event"}
          </Button>
        </div>
      </form>
    </MemberPageShell>
  );
}
