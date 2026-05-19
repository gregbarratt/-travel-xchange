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
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type {
  ModerationReport,
  Profile,
  ReportContentType,
  ReportStatus,
} from "@/types/database";

type ReportWithPeople = ModerationReport & {
  reportedUser: Pick<Profile, "id" | "full_name" | "headline"> | null;
  reporter: Pick<Profile, "id" | "full_name" | "headline"> | null;
};

const reportStatusOptions: Array<{ label: string; value: ReportStatus }> = [
  { label: "Open", value: "open" },
  { label: "Reviewing", value: "reviewing" },
  { label: "Resolved", value: "resolved" },
  { label: "Dismissed", value: "dismissed" },
];

const reportTypeOptions: Array<{ label: string; value: ReportContentType }> = [
  { label: "Post", value: "post" },
  { label: "Comment", value: "comment" },
  { label: "User", value: "user" },
  { label: "Company", value: "company" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function AdminReportsPage() {
  return (
    <AdminPageShell
      activeHref="/admin/reports"
      description="Review reported posts, comments, users, and company pages. This is the safety queue for the platform."
      title="Moderation reports"
    >
      {({ userId }) => <AdminReportsContent userId={userId} />}
    </AdminPageShell>
  );
}

function AdminReportsContent({ userId }: { userId: string }) {
  const configured = isSupabaseConfigured();
  const [reports, setReports] = useState<ReportWithPeople[]>([]);
  const [profileOptions, setProfileOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
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

  const loadReports = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: reportData, error: reportError } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);

    if (reportError) {
      setError(
        isMissingTableError(reportError, ["reports"])
          ? phase14SetupMessage
          : reportError.message,
      );
      setIsLoading(false);
      return;
    }

    const reportRows = (reportData ?? []) as ModerationReport[];
    const profileIds = Array.from(
      new Set(
        reportRows
          .flatMap((report) => [report.reporter_id, report.reported_user_id])
          .filter(Boolean) as string[],
      ),
    );

    let profileMap = new Map<
      string,
      Pick<Profile, "id" | "full_name" | "headline">
    >();

    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, headline")
      .order("full_name", { ascending: true })
      .limit(80);

    const typedProfiles = (allProfiles ?? []) as Pick<
      Profile,
      "id" | "full_name" | "headline"
    >[];

    setProfileOptions(
      typedProfiles.map((profile) => ({
        label: profile.full_name ?? "Unnamed member",
        value: profile.id,
      })),
    );

    if (profileIds.length > 0) {
      profileMap = new Map(
        typedProfiles
          .filter((profile) => profileIds.includes(profile.id))
          .map((profile) => [profile.id, profile]),
      );
    }

    setReports(
      reportRows.map((report) => ({
        ...report,
        reportedUser: report.reported_user_id
          ? profileMap.get(report.reported_user_id) ?? null
          : null,
        reporter: profileMap.get(report.reporter_id) ?? null,
      })),
    );
    setError(null);
    setIsLoading(false);
  }, [supabase]);

  async function updateReportStatus(report: ModerationReport, status: ReportStatus) {
    if (!supabase || report.status === status) {
      return;
    }

    setBusyId(report.id);
    setError(null);

    const isClosed = status === "resolved" || status === "dismissed";
    const { error: updateError } = await supabase
      .from("reports")
      .update({
        resolved_at: isClosed ? new Date().toISOString() : null,
        resolved_by: isClosed ? userId : null,
        status,
      })
      .eq("id", report.id);

    if (updateError) {
      setError(updateError.message);
      setBusyId(null);
      return;
    }

    await Promise.all([
      supabase.from("moderation_actions").insert({
        action: `report_${status}`,
        moderator_id: userId,
        target_id: report.content_id,
        target_type: report.content_type,
      }),
      supabase.from("audit_logs").insert({
        action: "report.status_updated",
        actor_id: userId,
        entity_id: report.id,
        entity_type: "report",
        summary: `Changed a ${report.content_type} report to ${status}.`,
      }),
    ]);

    setMessage("Report updated.");
    setBusyId(null);
    await loadReports();
  }

  async function createStarterReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const reason = String(formData.get("reason") ?? "").trim();
    const contentType = String(formData.get("content_type")) as ReportContentType;
    const reportedUserId = String(formData.get("reported_user_id") ?? "");
    const details = String(formData.get("details") ?? "").trim();

    if (!reason) {
      setError("Add a short reason before creating a report.");
      return;
    }

    const { error: insertError } = await supabase.from("reports").insert({
      content_type: contentType,
      details: details || null,
      reason,
      reported_user_id: reportedUserId || null,
      reporter_id: userId,
      status: "open",
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    event.currentTarget.reset();
    setMessage("Starter report created.");
    await loadReports();
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReports();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadReports]);

  if (isLoading) {
    return <div className="tx-card p-6 text-sm text-[#4d6b9e]">Loading reports...</div>;
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

        {reports.length === 0 && !error ? (
          <AdminEmptyState title="No reports yet">
            Use the starter form to create a test report, then change its
            status to check the moderation queue.
          </AdminEmptyState>
        ) : null}

        {reports.map((report) => (
          <article className="tx-card p-5" key={report.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-extrabold capitalize text-[#061b4f]">
                    {report.content_type} report
                  </h2>
                  <AdminStatusBadge tone={getStatusTone(report.status)}>
                    {report.status}
                  </AdminStatusBadge>
                </div>
                <p className="mt-1 text-xs font-medium text-[#7288b8]">
                  Created {formatDate(report.created_at)}
                </p>
              </div>

              <div className="w-full sm:w-52">
                <SelectField
                  disabled={busyId === report.id}
                  label="Queue status"
                  name={`report-status-${report.id}`}
                  onChange={(event) =>
                    void updateReportStatus(
                      report,
                      event.target.value as ReportStatus,
                    )
                  }
                  options={reportStatusOptions}
                  value={report.status}
                />
              </div>
            </div>

            <p className="mt-4 text-sm font-bold text-[#061b4f]">
              {report.reason}
            </p>
            {report.details ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4d6b9e]">
                {report.details}
              </p>
            ) : null}
            <div className="mt-4 grid gap-2 text-sm text-[#4d6b9e] sm:grid-cols-2">
              <p>
                Reporter:{" "}
                <span className="font-bold text-[#061b4f]">
                  {report.reporter?.full_name ?? "Unknown"}
                </span>
              </p>
              <p>
                Reported member:{" "}
                <span className="font-bold text-[#061b4f]">
                  {report.reportedUser?.full_name ?? "Not linked"}
                </span>
              </p>
            </div>
          </article>
        ))}
      </section>

      <aside className="tx-card h-max p-5">
        <h2 className="text-lg font-extrabold text-[#061b4f]">
          Create test report
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
          This lets you test the queue before we add member-facing report buttons
          across every page.
        </p>

        <form className="mt-5 space-y-4" onSubmit={createStarterReport}>
          <SelectField
            label="Report type"
            name="content_type"
            options={reportTypeOptions}
            defaultValue="post"
          />
          <SelectField
            label="Reported member"
            name="reported_user_id"
            options={[{ label: "No member selected", value: "" }, ...profileOptions]}
            defaultValue=""
          />
          <TextareaField
            label="Reason"
            name="reason"
            placeholder="Example: Test report for Phase 14"
            required
          />
          <TextareaField
            label="Extra notes"
            name="details"
            placeholder="Optional detail for the moderation team."
          />
          <Button className="tx-action w-full" type="submit">
            Create report
          </Button>
        </form>
      </aside>
    </div>
  );
}
