"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Building2,
  ExternalLink,
  Mail,
  SendHorizontal,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  getEmploymentTypeLabel,
  getJobCategoryLabel,
  getJobPackageLabel,
} from "@/config/jobs";
import { getCompanyTypeLabel } from "@/config/roles";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  Company,
  Job,
  JobApplication,
  JobBookmark,
  Profile,
} from "@/types/database";

type JobDetailPageProps = {
  jobId: string;
};

const phase6SetupMessage =
  "The Phase 6 jobs tables are not installed yet. Run supabase/phase-6-jobs.sql in Supabase, then refresh this page.";

function isMissingJobsTable(error: { code?: string; message?: string }) {
  return isMissingTableError(error, ["jobs", "job_applications", "job_bookmarks"]);
}

function formatSalary(job: Job) {
  if (!job.salary_min && !job.salary_max) {
    return "Salary not listed";
  }

  const formatter = new Intl.NumberFormat("en-GB", {
    currency: job.salary_currency,
    maximumFractionDigits: 0,
    style: "currency",
  });

  if (job.salary_min && job.salary_max) {
    return `${formatter.format(job.salary_min)} - ${formatter.format(job.salary_max)}`;
  }

  return job.salary_min
    ? `From ${formatter.format(job.salary_min)}`
    : `Up to ${formatter.format(job.salary_max ?? 0)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function JobDetailPage({ jobId }: JobDetailPageProps) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [bookmark, setBookmark] = useState<JobBookmark | null>(null);
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [coverNote, setCoverNote] = useState("");
  const [isLoading, setIsLoading] = useState(configured);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isRegisteringInterest, setIsRegisteringInterest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadJob = useCallback(async () => {
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

    const [{ data: profileData }, { data: jobData, error: jobError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase.from("jobs").select("*").eq("id", jobId).maybeSingle(),
      ]);

    setViewerProfile(profileData);

    if (jobError) {
      setError(isMissingJobsTable(jobError) ? phase6SetupMessage : jobError.message);
      setIsLoading(false);
      return;
    }

    if (!jobData) {
      setError("That job could not be found.");
      setIsLoading(false);
      return;
    }

    setJob(jobData);

    const [bookmarkResult, applicationResult] = await Promise.all([
      supabase
        .from("job_bookmarks")
        .select("*")
        .eq("job_id", jobId)
        .eq("user_id", userData.user.id)
        .maybeSingle(),
      supabase
        .from("job_applications")
        .select("*")
        .eq("job_id", jobId)
        .eq("user_id", userData.user.id)
        .maybeSingle(),
    ]);

    if (bookmarkResult.error || applicationResult.error) {
      const issue = bookmarkResult.error ?? applicationResult.error;
      setError(issue && isMissingJobsTable(issue) ? phase6SetupMessage : issue?.message ?? null);
      setIsLoading(false);
      return;
    }

    setBookmark(bookmarkResult.data as JobBookmark | null);
    setApplication(applicationResult.data as JobApplication | null);
    setCoverNote((applicationResult.data as JobApplication | null)?.cover_note ?? "");

    if (jobData.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", jobData.company_id)
        .maybeSingle();

      setCompany(companyData);
    }

    setError(null);
    setIsLoading(false);
  }, [jobId, router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadJob();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadJob]);

  async function handleBookmarkToggle() {
    if (!supabase || !userId || !job) {
      return;
    }

    setIsBookmarking(true);

    if (bookmark) {
      await supabase
        .from("job_bookmarks")
        .delete()
        .eq("job_id", job.id)
        .eq("user_id", userId);
    } else {
      await supabase.from("job_bookmarks").insert({
        job_id: job.id,
        user_id: userId,
      });
    }

    setIsBookmarking(false);
    await loadJob();
  }

  async function handleRegisterInterest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !userId || !job || application) {
      return;
    }

    setIsRegisteringInterest(true);
    setActionError(null);

    const { error: applicationError } = await supabase
      .from("job_applications")
      .insert({
        cover_note: coverNote.trim() || null,
        job_id: job.id,
        status: "interested",
        user_id: userId,
      });

    if (applicationError) {
      setActionError(
        isMissingJobsTable(applicationError)
          ? phase6SetupMessage
          : applicationError.message,
      );
      setIsRegisteringInterest(false);
      return;
    }

    setIsRegisteringInterest(false);
    await loadJob();
  }

  const isOwner = Boolean(job && userId === job.created_by);

  return (
    <MemberPageShell
      activeLabel="Jobs"
      actions={
        <Link
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "hidden sm:inline-flex",
          )}
          href="/jobs"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Jobs
        </Link>
      }
      eyebrow="Job detail"
      title={job?.title ?? "Job"}
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so jobs cannot load.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading job...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      {job ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-5">
            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-[#e0f2f1] px-2 py-1 text-xs font-semibold text-[#0f766e]">
                      {getJobCategoryLabel(job.category)}
                    </span>
                    {job.is_featured ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                        <Star className="size-3" aria-hidden="true" />
                        Featured
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">
                    {job.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {company?.name ?? "Recruiter/company not linked"} · Posted{" "}
                    {formatDate(job.created_at)}
                  </p>
                </div>
                <Button
                  className={cn(
                    "h-10 px-4",
                    bookmark
                      ? "bg-[#082f49] hover:bg-[#0c4a6e]"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                  )}
                  disabled={isBookmarking}
                  onClick={handleBookmarkToggle}
                  type="button"
                >
                  <Bookmark className="size-4" aria-hidden="true" />
                  {bookmark ? "Saved" : "Save"}
                </Button>
              </div>

              <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
                <div className="rounded-md bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Location
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-950">
                    {job.location}
                    {job.is_remote ? " / Remote" : ""}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Type
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-950">
                    {getEmploymentTypeLabel(job.employment_type)}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Salary
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-950">
                    {formatSalary(job)}
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Job description
              </h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {job.description}
              </p>
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Requirements
              </h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {job.requirements ??
                  "The employer has not added a specific requirements list yet."}
              </p>
            </article>
          </section>

          <aside className="space-y-5">
            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Register interest
              </h2>
              {isOwner ? (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  You posted this job. Applicant management arrives in later
                  recruiter and admin phases.
                </p>
              ) : application ? (
                <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                  You have registered interest in this job.
                </div>
              ) : (
                <form className="mt-4 space-y-3" onSubmit={handleRegisterInterest}>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-800">
                      Note to employer
                    </span>
                    <textarea
                      className="mt-2 min-h-28 w-full rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15"
                      onChange={(event) => setCoverNote(event.target.value)}
                      placeholder="Briefly say why you are interested."
                      value={coverNote}
                    />
                  </label>
                  {actionError ? (
                    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                      {actionError}
                    </p>
                  ) : null}
                  <Button
                    className="h-10 w-full bg-[#0f766e] text-white hover:bg-[#115e59]"
                    disabled={isRegisteringInterest}
                    type="submit"
                  >
                    <SendHorizontal className="size-4" aria-hidden="true" />
                    {isRegisteringInterest ? "Saving" : "Register interest"}
                  </Button>
                </form>
              )}
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-[#0f766e]" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950">
                  Employer
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
                  This job is attributed to the posting user until a company is
                  connected.
                </p>
              )}
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Application links
              </h2>
              <div className="mt-4 space-y-3">
                {job.application_url ? (
                  <a
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "w-full bg-[#082f49] text-white hover:bg-[#0c4a6e]",
                    )}
                    href={job.application_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Apply externally
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                ) : null}
                {job.contact_email ? (
                  <a
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "w-full bg-white",
                    )}
                    href={`mailto:${job.contact_email}`}
                  >
                    Email employer
                    <Mail className="size-4" aria-hidden="true" />
                  </a>
                ) : null}
                {!job.application_url && !job.contact_email ? (
                  <p className="text-sm leading-6 text-slate-600">
                    Use Register interest for this MVP listing.
                  </p>
                ) : null}
              </div>
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Listing package
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {getJobPackageLabel(job.package_type)}. Stripe payments and
                recruiter subscriptions arrive in Phase 13.
              </p>
            </article>
          </aside>
        </div>
      ) : null}
    </MemberPageShell>
  );
}
