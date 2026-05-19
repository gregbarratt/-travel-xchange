"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  AdminEmptyState,
  AdminStatusBadge,
  getStatusTone,
} from "@/components/admin/admin-ui";
import { AdminPageShell, phase14SetupMessage } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { SelectField, TextareaField } from "@/components/ui/field";
import {
  getVerificationTierLabel,
  verificationTierOptions,
} from "@/config/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type {
  Company,
  Profile,
  VerificationRequest,
  VerificationRequestStatus,
  VerificationTier,
} from "@/types/database";

type VerificationRequestWithMeta = VerificationRequest & {
  company: Pick<Company, "id" | "name" | "company_type"> | null;
  profile: Pick<Profile, "id" | "full_name" | "headline" | "role"> | null;
};

const requestStatusOptions: Array<{
  label: string;
  value: VerificationRequestStatus;
}> = [
  { label: "Pending", value: "pending" },
  { label: "In review", value: "in_review" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "More info needed", value: "more_info" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function AdminVerificationPage() {
  return (
    <AdminPageShell
      activeHref="/admin/verification"
      description="Review verification requests and approve trusted travel professionals, suppliers, recruiters, trainers, or admins."
      title="Verification review"
    >
      {({ userId }) => <AdminVerificationContent userId={userId} />}
    </AdminPageShell>
  );
}

function AdminVerificationContent({ userId }: { userId: string }) {
  const configured = isSupabaseConfigured();
  const [requests, setRequests] = useState<VerificationRequestWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadRequests = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: requestData, error: requestError } = await supabase
      .from("verification_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);

    if (requestError) {
      setError(
        isMissingTableError(requestError, ["verification_requests"])
          ? phase14SetupMessage
          : requestError.message,
      );
      setIsLoading(false);
      return;
    }

    const requestRows = (requestData ?? []) as VerificationRequest[];
    const profileIds = Array.from(new Set(requestRows.map((request) => request.user_id)));
    const companyIds = Array.from(
      new Set(requestRows.map((request) => request.company_id).filter(Boolean) as string[]),
    );

    const [{ data: profileData }, { data: companyData }] = await Promise.all([
      profileIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, full_name, headline, role")
            .in("id", profileIds)
        : Promise.resolve({ data: [] }),
      companyIds.length > 0
        ? supabase
            .from("companies")
            .select("id, name, company_type")
            .in("id", companyIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map(
      ((profileData ?? []) as Pick<
        Profile,
        "id" | "full_name" | "headline" | "role"
      >[]).map((profile) => [profile.id, profile]),
    );
    const companyMap = new Map(
      ((companyData ?? []) as Pick<
        Company,
        "id" | "name" | "company_type"
      >[]).map((company) => [company.id, company]),
    );

    setRequests(
      requestRows.map((request) => ({
        ...request,
        company: request.company_id ? companyMap.get(request.company_id) ?? null : null,
        profile: profileMap.get(request.user_id) ?? null,
      })),
    );
    setError(null);
    setIsLoading(false);
  }, [supabase]);

  async function updateRequestStatus(
    request: VerificationRequestWithMeta,
    status: VerificationRequestStatus,
  ) {
    if (!supabase || request.status === status) {
      return;
    }

    setBusyId(request.id);
    setError(null);

    const { error: requestUpdateError } = await supabase
      .from("verification_requests")
      .update({
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        status,
      })
      .eq("id", request.id);

    if (requestUpdateError) {
      setError(requestUpdateError.message);
      setBusyId(null);
      return;
    }

    if (status === "approved") {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ verification_tier: request.requested_tier })
        .eq("id", request.user_id);

      if (profileError) {
        setError(profileError.message);
        setBusyId(null);
        return;
      }
    }

    await Promise.all([
      supabase.from("moderation_actions").insert({
        action: `verification_${status}`,
        moderator_id: userId,
        target_id: request.user_id,
        target_type: "profile",
      }),
      supabase.from("audit_logs").insert({
        action: "verification.status_updated",
        actor_id: userId,
        entity_id: request.id,
        entity_type: "verification_request",
        summary: `Changed verification request to ${status}.`,
      }),
    ]);

    setMessage("Verification request updated.");
    setBusyId(null);
    await loadRequests();
  }

  async function createStarterRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const requestedTier = String(formData.get("requested_tier")) as VerificationTier;
    const notes = String(formData.get("notes") ?? "").trim();

    const { error: insertError } = await supabase
      .from("verification_requests")
      .insert({
        notes: notes || "Starter verification request for Phase 14 testing.",
        requested_tier: requestedTier,
        status: "pending",
        user_id: userId,
      });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    event.currentTarget.reset();
    setMessage("Starter verification request created.");
    await loadRequests();
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRequests();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRequests]);

  if (isLoading) {
    return (
      <div className="tx-card p-6 text-sm text-[#4d6b9e]">
        Loading verification requests...
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        {message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {error}
          </div>
        ) : null}

        {requests.length === 0 && !error ? (
          <AdminEmptyState title="No verification requests yet">
            Use the starter form to create a test request, then approve it to
            check the review workflow.
          </AdminEmptyState>
        ) : null}

        {requests.map((request) => (
          <article className="tx-card p-5" key={request.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-extrabold text-[#061b4f]">
                    {request.profile?.full_name ?? "Unknown member"}
                  </h2>
                  <AdminStatusBadge tone={getStatusTone(request.status)}>
                    {request.status.replaceAll("_", " ")}
                  </AdminStatusBadge>
                </div>
                <p className="mt-1 text-sm leading-6 text-[#4d6b9e]">
                  Requested {getVerificationTierLabel(request.requested_tier)}
                </p>
                <p className="mt-1 text-xs font-medium text-[#7288b8]">
                  Created {formatDate(request.created_at)}
                </p>
              </div>

              <div className="w-full sm:w-56">
                <SelectField
                  disabled={busyId === request.id}
                  label="Review status"
                  name={`verification-status-${request.id}`}
                  onChange={(event) =>
                    void updateRequestStatus(
                      request,
                      event.target.value as VerificationRequestStatus,
                    )
                  }
                  options={requestStatusOptions}
                  value={request.status}
                />
              </div>
            </div>

            {request.company ? (
              <p className="mt-4 text-sm text-[#4d6b9e]">
                Company:{" "}
                <span className="font-bold text-[#061b4f]">
                  {request.company.name}
                </span>
              </p>
            ) : null}
            {request.notes ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#203b70]">
                {request.notes}
              </p>
            ) : null}
          </article>
        ))}
      </section>

      <aside className="tx-card h-max p-5">
        <h2 className="text-lg font-extrabold text-[#061b4f]">
          Create test request
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
          This gives us a safe way to test approval before we add public
          verification forms.
        </p>

        <form className="mt-5 space-y-4" onSubmit={createStarterRequest}>
          <SelectField
            defaultValue="travel_professional_verified"
            label="Requested tier"
            name="requested_tier"
            options={verificationTierOptions.filter(
              (option) => option.value !== "unverified",
            )}
          />
          <TextareaField
            label="Notes"
            name="notes"
            placeholder="Example: Owner test request for Phase 14."
          />
          <Button className="tx-action w-full" type="submit">
            Create request
          </Button>
        </form>
      </aside>
    </div>
  );
}
