"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bookmark, BriefcaseBusiness, MapPin, Plus, Star } from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  getEmploymentTypeLabel,
  getJobCategoryLabel,
  jobCategoryOptions,
} from "@/config/jobs";
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
  JobCategory,
  JobWithCompany,
  Profile,
} from "@/types/database";

type CategoryFilter = JobCategory | "all";

const phase6SetupMessage =
  "The Phase 6 jobs tables are not installed yet. Run supabase/phase-6-jobs.sql in Supabase, then refresh this page.";

function isMissingJobsTable(error: { code?: string; message?: string }) {
  return isMissingTableError(error, ["jobs", "job_applications", "job_bookmarks"]);
}

function formatSalary(job: JobWithCompany) {
  if (job.salary_label) {
    return job.salary_label;
  }

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

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function isExpired(job: Job) {
  if (!job.expiry_date) {
    return false;
  }

  const today = new Date().toISOString().slice(0, 10);
  return job.expiry_date < today;
}

export function JobsBoard() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobWithCompany[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(configured);
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

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    setUserId(userData.user.id);

    const [{ data: profileData }, { data: jobRows, error: jobsError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase
          .from("jobs")
          .select("*")
          .in("status", ["published", "active"])
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

    setViewerProfile(profileData);

    if (jobsError) {
      setError(isMissingJobsTable(jobsError) ? phase6SetupMessage : jobsError.message);
      setJobs([]);
      setIsLoading(false);
      return;
    }

    const typedJobs = ((jobRows ?? []) as Job[]).filter((job) => !isExpired(job));
    const jobIds = typedJobs.map((job) => job.id);
    const companyIds = Array.from(
      new Set(typedJobs.map((job) => job.company_id).filter(Boolean) as string[]),
    );
    const companyMap = new Map<string, Pick<Company, "id" | "name" | "company_type">>();

    if (companyIds.length > 0) {
      const { data: companyRows } = await supabase
        .from("companies")
        .select("id, name, company_type")
        .in("id", companyIds);

      for (const company of (companyRows ?? []) as Pick<
        Company,
        "id" | "name" | "company_type"
      >[]) {
        companyMap.set(company.id, company);
      }
    }

    let bookmarks: Pick<JobBookmark, "job_id">[] = [];
    let applications: Pick<JobApplication, "job_id">[] = [];

    if (jobIds.length > 0) {
      const [bookmarkResult, applicationResult] = await Promise.all([
        supabase
          .from("job_bookmarks")
          .select("job_id")
          .eq("user_id", userData.user.id)
          .in("job_id", jobIds),
        supabase
          .from("job_applications")
          .select("job_id")
          .eq("user_id", userData.user.id)
          .in("job_id", jobIds),
      ]);

      if (bookmarkResult.error || applicationResult.error) {
        const issue = bookmarkResult.error ?? applicationResult.error;
        setError(issue && isMissingJobsTable(issue) ? phase6SetupMessage : issue?.message ?? null);
        setJobs([]);
        setIsLoading(false);
        return;
      }

      bookmarks = (bookmarkResult.data ?? []) as Pick<JobBookmark, "job_id">[];
      applications = (applicationResult.data ?? []) as Pick<
        JobApplication,
        "job_id"
      >[];
    }

    const bookmarkedIds = new Set(bookmarks.map((bookmark) => bookmark.job_id));
    const applicationIds = new Set(
      applications.map((application) => application.job_id),
    );

    setJobs(
      typedJobs.map((job) => ({
        ...job,
        company: job.company_id ? companyMap.get(job.company_id) ?? null : null,
        has_registered_interest: applicationIds.has(job.id),
        is_bookmarked_by_current_user: bookmarkedIds.has(job.id),
      })),
    );
    setError(null);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadJobs();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadJobs]);

  async function handleBookmarkToggle(job: JobWithCompany) {
    if (!supabase || !userId) {
      return;
    }

    setBusyJobId(job.id);

    if (job.is_bookmarked_by_current_user) {
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

    setBusyJobId(null);
    await loadJobs();
  }

  const filteredJobs = jobs.filter((job) => {
    const categoryMatches =
      activeCategory === "all" || job.category === activeCategory;
    const locationMatches =
      !locationFilter.trim() ||
      job.location.toLowerCase().includes(locationFilter.trim().toLowerCase());
    const remoteMatches = !remoteOnly || job.is_remote;

    return categoryMatches && locationMatches && remoteMatches;
  });
  const featuredJobs = jobs.filter((job) => job.is_featured).slice(0, 3);

  return (
    <MemberPageShell
      activeLabel="Jobs"
      actions={
        <Link
          className={cn(
            buttonVariants({ size: "lg" }),
            "hidden bg-[#0f766e] text-white hover:bg-[#115e59] sm:inline-flex",
          )}
          href="/jobs/post"
        >
          <Plus className="size-4" aria-hidden="true" />
          Post a job
        </Link>
      }
      eyebrow="Jobs"
      title="Travel industry jobs"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so jobs cannot load.
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Find or advertise travel trade roles
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Browse travel sales, cruise, operations, business development,
              marketing, training, and travel technology jobs. Paid featured
              placements are marked as placeholders for the MVP.
            </p>
          </div>
          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-[#0f766e] text-white hover:bg-[#115e59] sm:hidden",
            )}
            href="/jobs/post"
          >
            <Plus className="size-4" aria-hidden="true" />
            Post a job
          </Link>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-end">
              <label className="block">
                <span className="text-sm font-medium text-slate-800">
                  Location
                </span>
                <input
                  className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15"
                  onChange={(event) => setLocationFilter(event.target.value)}
                  placeholder="Manchester, Remote, London..."
                  value={locationFilter}
                />
              </label>
              <label className="flex h-10 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 lg:mt-7">
                <input
                  checked={remoteOnly}
                  className="size-4 accent-[#0f766e]"
                  onChange={(event) => setRemoteOnly(event.target.checked)}
                  type="checkbox"
                />
                Remote only
              </label>
              <Button
                className="h-10 bg-[#082f49] px-4 text-white hover:bg-[#0c4a6e]"
                onClick={() => {
                  setActiveCategory("all");
                  setLocationFilter("");
                  setRemoteOnly(false);
                }}
                type="button"
              >
                Clear filters
              </Button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {jobCategoryOptions.map((category) => (
              <button
                className={cn(
                  "min-w-max rounded-md border px-3 py-2 text-sm font-medium transition",
                  activeCategory === category.value
                    ? "border-[#0f766e] bg-[#e0f2f1] text-[#0f766e]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
                key={category.value}
                onClick={() => setActiveCategory(category.value)}
                type="button"
              >
                {category.label}
              </button>
            ))}
          </div>

          {error ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading jobs...
            </div>
          ) : null}

          {!isLoading && filteredJobs.length === 0 && !error ? (
            <div className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
              <BriefcaseBusiness
                className="mx-auto size-8 text-[#0f766e]"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">
                No jobs match this view
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Try clearing the filters or post the first role for this area.
              </p>
            </div>
          ) : null}

          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <article
                className={cn(
                  "rounded-md border bg-white p-5 shadow-sm",
                  job.is_featured ? "border-[#0f766e]" : "border-slate-200",
                )}
                key={job.id}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
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
                      {job.work_style ? (
                        <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
                          {job.work_style}
                        </span>
                      ) : null}
                      {job.application_type === "external" ? (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          External apply
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-xl font-semibold tracking-normal text-slate-950">
                      {job.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {job.company?.name ??
                        job.recruiter_name ??
                        "Recruiter/company not linked"}{" "}
                      -{" "}
                      {job.job_type_label ??
                        getEmploymentTypeLabel(job.employment_type)}
                    </p>
                  </div>
                  <Button
                    className={cn(
                      "h-10 px-4",
                      job.is_bookmarked_by_current_user
                        ? "bg-[#082f49] hover:bg-[#0c4a6e]"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                    )}
                    disabled={busyJobId === job.id}
                    onClick={() => handleBookmarkToggle(job)}
                    type="button"
                  >
                    <Bookmark className="size-4" aria-hidden="true" />
                    {job.is_bookmarked_by_current_user ? "Saved" : "Save"}
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Location
                    </p>
                    <p className="mt-1 font-medium text-slate-950">
                      {job.location}
                      {job.is_remote ? " / Remote" : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Salary
                    </p>
                    <p className="mt-1 font-medium text-slate-950">
                      {formatSalary(job)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Expires
                    </p>
                    <p className="mt-1 font-medium text-slate-950">
                      {formatDate(job.expiry_date) ?? "No expiry set"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-700">
                  {job.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "bg-[#0f766e] text-white hover:bg-[#115e59]",
                    )}
                    href={`/jobs/${job.id}`}
                  >
                    View job
                  </Link>
                  {job.has_registered_interest ? (
                    <span className="inline-flex h-10 items-center rounded-md bg-emerald-50 px-3 text-sm font-semibold text-emerald-700">
                      Interest registered
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Featured jobs
            </h2>
            {featuredJobs.length > 0 ? (
              <div className="mt-4 space-y-3">
                {featuredJobs.map((job) => (
                  <Link
                    className="block rounded-md border border-slate-100 p-3 hover:bg-slate-50"
                    href={`/jobs/${job.id}`}
                    key={job.id}
                  >
                    <p className="font-semibold text-slate-950">{job.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {job.company?.name ?? job.recruiter_name ?? job.location}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Featured job listings will appear here once a recruiter chooses
                that placeholder package.
              </p>
            )}
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Employer packages
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>Basic job post: standard listing.</p>
              <p>Featured job: higher placement placeholder.</p>
              <p>Sponsored employer: recruiter revenue placeholder.</p>
              <p>Recruiter subscription: recurring package placeholder.</p>
            </div>
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin className="size-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                Hiring signal
              </h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Location, remote, and category filters are live now. Applications,
              paid checkout, and recruiter plans expand in later phases.
            </p>
          </article>
        </aside>
      </div>
    </MemberPageShell>
  );
}
