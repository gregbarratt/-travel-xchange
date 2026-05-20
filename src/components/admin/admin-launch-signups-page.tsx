"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MailPlus } from "lucide-react";

import {
  AdminEmptyState,
  AdminStatusBadge,
  getStatusTone,
} from "@/components/admin/admin-ui";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { SelectField } from "@/components/ui/field";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { isMissingTableError } from "@/lib/supabase/errors";
import type {
  LaunchSignup,
  LaunchSignupRoleInterest,
  LaunchSignupStatus,
} from "@/types/database";

const setupMessage =
  "The launch signup table is not installed yet. Run supabase/phase-21-launch-signups.sql in Supabase, then refresh this page.";

const statusOptions: Array<{ label: string; value: LaunchSignupStatus }> = [
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Invited", value: "invited" },
  { label: "Converted", value: "converted" },
  { label: "Archived", value: "archived" },
];

const roleInterestLabels: Record<LaunchSignupRoleInterest, string> = {
  advertiser: "Advertiser / partner",
  other: "Other travel industry role",
  recruiter: "Recruiter",
  student: "Student / new entrant",
  supplier: "Supplier / tour operator",
  trainer: "Trainer / educator",
  travel_professional: "Travel agent / homeworker",
  travel_technology: "Travel technology provider",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getSignupStatusTone(status: LaunchSignupStatus) {
  if (status === "new") {
    return "amber";
  }

  if (status === "converted") {
    return "green";
  }

  if (status === "archived") {
    return "slate";
  }

  return getStatusTone(status);
}

export function AdminLaunchSignupsPage() {
  return (
    <AdminPageShell
      activeHref="/admin/launch-signups"
      description="View people who joined the pre-launch list. These are not active accounts, so nobody receives platform access until you invite or convert them later."
      title="Launch signups"
    >
      {({ userId }) => <AdminLaunchSignupsContent userId={userId} />}
    </AdminPageShell>
  );
}

function AdminLaunchSignupsContent({ userId }: { userId: string }) {
  const configured = isSupabaseConfigured();
  const [signups, setSignups] = useState<LaunchSignup[]>([]);
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

  const counts = useMemo(() => {
    return statusOptions.map((option) => ({
      ...option,
      count: signups.filter((signup) => signup.status === option.value).length,
    }));
  }, [signups]);

  const loadSignups = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data, error: signupsError } = await supabase
      .from("launch_signups")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (signupsError) {
      setError(
        isMissingTableError(signupsError, ["launch_signups"])
          ? setupMessage
          : signupsError.message,
      );
      setIsLoading(false);
      return;
    }

    setSignups((data ?? []) as LaunchSignup[]);
    setError(null);
    setIsLoading(false);
  }, [supabase]);

  async function updateSignupStatus(
    signup: LaunchSignup,
    status: LaunchSignupStatus,
  ) {
    if (!supabase || signup.status === status) {
      return;
    }

    setBusyId(signup.id);
    setError(null);
    setMessage(null);

    const updates: Partial<LaunchSignup> = {
      status,
    };

    if (status === "invited" && !signup.invited_at) {
      updates.invited_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("launch_signups")
      .update(updates)
      .eq("id", signup.id);

    if (updateError) {
      setError(updateError.message);
      setBusyId(null);
      return;
    }

    await supabase.from("audit_logs").insert({
      action: "launch_signup.status_updated",
      actor_id: userId,
      entity_id: signup.id,
      entity_type: "launch_signup",
      summary: `Marked ${signup.email} as ${status}.`,
    });

    setMessage("Launch signup updated.");
    setBusyId(null);
    await loadSignups();
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSignups();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadSignups]);

  if (isLoading) {
    return (
      <div className="tx-card p-6 text-sm text-[#4d6b9e]">
        Loading launch signups...
      </div>
    );
  }

  if (signups.length === 0 && !error) {
    return (
      <AdminEmptyState title="No launch signups yet">
        People who join from the coming soon homepage will appear here before
        they become active members.
      </AdminEmptyState>
    );
  }

  return (
    <div className="space-y-4">
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

      <section className="grid gap-3 md:grid-cols-5">
        {counts.map((item) => (
          <div className="tx-card p-4" key={item.value}>
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#7288b8]">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-black text-[#061b4f]">
              {item.count}
            </p>
          </div>
        ))}
      </section>

      <section className="tx-card overflow-hidden">
        <div className="border-b border-[#d9e4f5] p-5">
          <div className="flex items-center gap-2">
            <MailPlus className="size-5 text-[#063b86]" aria-hidden="true" />
            <h2 className="text-lg font-extrabold text-[#061b4f]">
              Pre-launch interest list
            </h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-[#4d6b9e]">
            Use this as your launch queue. A signup here is only interest, not
            access to the platform.
          </p>
        </div>

        <div className="divide-y divide-[#d9e4f5]">
          {signups.map((signup) => (
            <div
              className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_220px_180px]"
              key={signup.id}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-extrabold text-[#061b4f]">
                    {signup.full_name || "Unnamed contact"}
                  </h3>
                  <AdminStatusBadge tone={getSignupStatusTone(signup.status)}>
                    {signup.status}
                  </AdminStatusBadge>
                </div>

                <a
                  className="mt-1 block text-sm font-bold text-[#063b86] underline-offset-2 hover:underline"
                  href={`mailto:${signup.email}`}
                >
                  {signup.email}
                </a>

                <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
                  {roleInterestLabels[signup.role_interest]}
                  {signup.company_name ? ` at ${signup.company_name}` : ""}
                </p>

                {signup.message ? (
                  <p className="mt-3 rounded-lg bg-[#f8fbff] p-3 text-sm leading-6 text-[#061b4f]">
                    {signup.message}
                  </p>
                ) : null}

                <p className="mt-2 text-xs font-medium text-[#7288b8]">
                  Joined {formatDate(signup.created_at)}
                </p>
              </div>

              <div className="text-sm leading-6 text-[#4d6b9e]">
                <p className="text-xs font-extrabold uppercase tracking-wide text-[#7288b8]">
                  Source
                </p>
                <p className="mt-2 font-semibold text-[#061b4f]">
                  {signup.source_page.replaceAll("_", " ")}
                </p>
                {signup.invited_at ? (
                  <p className="mt-2 text-xs">
                    Invited {formatDate(signup.invited_at)}
                  </p>
                ) : null}
              </div>

              <SelectField
                disabled={busyId === signup.id}
                label="Status"
                name={`status-${signup.id}`}
                onChange={(event) =>
                  void updateSignupStatus(
                    signup,
                    event.target.value as LaunchSignupStatus,
                  )
                }
                options={statusOptions}
                value={signup.status}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
