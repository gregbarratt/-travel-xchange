"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  AdminEmptyState,
  AdminStatusBadge,
  getStatusTone,
} from "@/components/admin/admin-ui";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { SelectField } from "@/components/ui/field";
import { getJobCategoryLabel, getJobPackageLabel } from "@/config/jobs";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { Company, Job } from "@/types/database";

type JobStatus = Job["status"];

type AdminJob = Job & {
  company: Pick<Company, "id" | "name" | "company_type"> | null;
};

const jobStatusOptions: Array<{ label: string; value: JobStatus }> = [
  { label: "Published", value: "published" },
  { label: "Active", value: "active" },
  { label: "Closed", value: "closed" },
  { label: "Hidden", value: "hidden" },
  { label: "Deleted", value: "deleted" },
  { label: "Draft", value: "draft" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminJobsPage() {
  return (
    <AdminPageShell
      activeHref="/admin/jobs"
      description="Review job listings, featured job placeholders, and recruiter content before the jobs board becomes a paid channel."
      title="Jobs admin"
    >
      {({ userId }) => <AdminJobsContent userId={userId} />}
    </AdminPageShell>
  );
}

function AdminJobsContent({ userId }: { userId: string }) {
  const configured = isSupabaseConfigured();
  const [jobs, setJobs] = useState<AdminJob[]>([]);
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

  const loadJobs = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);

    if (jobError) {
      setError(jobError.message);
      setIsLoading(false);
      return;
    }

    const jobRows = (jobData ?? []) as Job[];
    const companyIds = Array.from(
      new Set(jobRows.map((job) => job.company_id).filter(Boolean) as string[]),
    );
    let companyMap = new Map<string, Pick<Company, "id" | "name" | "company_type">>();

    if (companyIds.length > 0) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("id, name, company_type")
        .in("id", companyIds);

      companyMap = new Map(
        ((companyData ?? []) as Pick<
          Company,
          "id" | "name" | "company_type"
        >[]).map((company) => [company.id, company]),
      );
    }

    setJobs(
      jobRows.map((job) => ({
        ...job,
        company: job.company_id ? companyMap.get(job.company_id) ?? null : null,
      })),
    );
    setError(null);
    setIsLoading(false);
  }, [supabase]);

  async function updateJobStatus(job: AdminJob, status: JobStatus) {
    if (!supabase || job.status === status) {
      return;
    }

    setBusyId(job.id);
    setError(null);

    const { error: updateError } = await supabase
      .from("jobs")
      .update({ status })
      .eq("id", job.id);

    if (updateError) {
      setError(updateError.message);
      setBusyId(null);
      return;
    }

    await supabase.from("audit_logs").insert({
      action: "job.status_updated",
      actor_id: userId,
      entity_id: job.id,
      entity_type: "job",
      summary: `Changed job listing to ${status}.`,
    });

    setMessage("Job updated.");
    setBusyId(null);
    await loadJobs();
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadJobs();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadJobs]);

  if (isLoading) {
    return <div className="tx-card p-6 text-sm text-[#4d6b9e]">Loading jobs...</div>;
  }

  if (jobs.length === 0 && !error) {
    return (
      <AdminEmptyState title="No jobs yet">
        Job listings will appear here after recruiters or companies post roles.
      </AdminEmptyState>
    );
  }

  return (
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

      {jobs.map((job) => (
        <article className="tx-card p-5" key={job.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className="font-extrabold text-[#061b4f] hover:text-[#f52968]"
                  href={`/jobs/${job.id}`}
                >
                  {job.title}
                </Link>
                <AdminStatusBadge tone={getStatusTone(job.status)}>
                  {job.status}
                </AdminStatusBadge>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
                {job.company?.name ?? job.recruiter_name ?? "No company"} -{" "}
                {getJobCategoryLabel(job.category)} -{" "}
                {getJobPackageLabel(job.package_type)}
              </p>
              <p className="mt-1 text-xs font-medium text-[#7288b8]">
                Posted {formatDate(job.posted_date ?? job.created_at)}
                {job.expiry_date ? ` - Expires ${formatDate(job.expiry_date)}` : ""}
                {job.application_type === "external" ? " - External apply" : ""}
              </p>
            </div>

            <div className="w-full sm:w-52">
              <SelectField
                disabled={busyId === job.id}
                label="Listing status"
                name={`job-status-${job.id}`}
                onChange={(event) =>
                  void updateJobStatus(job, event.target.value as JobStatus)
                }
                options={jobStatusOptions}
                value={job.status}
              />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
