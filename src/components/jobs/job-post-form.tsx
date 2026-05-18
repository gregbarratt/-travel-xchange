"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import {
  employmentTypeOptions,
  jobCategoryOptions,
  jobPackageOptions,
  slugifyJobTitle,
} from "@/config/jobs";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { normalizeWebsiteUrl } from "@/lib/urls";
import type {
  Company,
  JobCategory,
  JobEmploymentType,
  JobPackageType,
  Profile,
} from "@/types/database";

const phase6SetupMessage =
  "The Phase 6 jobs tables are not installed yet. Run supabase/phase-6-jobs.sql in Supabase, then refresh this page.";

function numberOrNull(value: FormDataEntryValue | null) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function JobPostForm() {
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
    const requirements = String(formData.get("requirements") ?? "").trim();
    const category = String(formData.get("category") ?? "travel_sales") as JobCategory;
    const employmentType = String(
      formData.get("employment_type") ?? "full_time",
    ) as JobEmploymentType;
    const location = String(formData.get("location") ?? "").trim() || "Remote";
    const packageType = String(formData.get("package_type") ?? "basic") as JobPackageType;
    const isRemote = formData.get("is_remote") === "on";
    const applicationUrl = normalizeWebsiteUrl(
      String(formData.get("application_url") ?? ""),
    );
    const contactEmail = String(formData.get("contact_email") ?? "").trim() || null;

    if (!title || !description) {
      setError("Please add a job title and description.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .insert({
        application_url: applicationUrl,
        category,
        company_id: company?.id ?? null,
        contact_email: contactEmail,
        created_by: userId,
        description,
        employment_type: employmentType,
        is_featured: packageType !== "basic",
        is_remote: isRemote,
        location,
        package_type: packageType,
        requirements: requirements || null,
        salary_currency: "GBP",
        salary_max: numberOrNull(formData.get("salary_max")),
        salary_min: numberOrNull(formData.get("salary_min")),
        slug: slugifyJobTitle(title),
        status: "published",
        title,
        visibility: "members",
      })
      .select("id")
      .single();

    if (jobError) {
      setError(
        isMissingTableError(jobError, ["jobs"])
          ? phase6SetupMessage
          : jobError.message,
      );
      setIsSaving(false);
      return;
    }

    router.push(`/jobs/${jobData.id}`);
  }

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
      eyebrow="Post a job"
      title="Create a travel trade job listing"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so jobs cannot save.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading job form...
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
          This listing will be attributed to{" "}
          <strong>{company?.name ?? viewerProfile?.full_name ?? "your account"}</strong>.
          You can connect or edit company details from your profile page.
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-950">
            Job details
          </h2>
          <TextField
            label="Job title"
            name="title"
            placeholder="Luxury Cruise Specialist"
            required
          />
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Category"
              name="category"
              options={jobCategoryOptions
                .filter((option) => option.value !== "all")
                .map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
            />
            <SelectField
              label="Employment type"
              name="employment_type"
              options={employmentTypeOptions}
            />
            <TextField
              label="Location"
              name="location"
              placeholder="Manchester, UK"
            />
            <label className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 md:mt-7">
              <input className="size-4 accent-[#0f766e]" name="is_remote" type="checkbox" />
              Remote or homeworking available
            </label>
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Salary and application
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Salary from"
              min={0}
              name="salary_min"
              placeholder="25000"
              type="number"
            />
            <TextField
              label="Salary to"
              min={0}
              name="salary_max"
              placeholder="40000"
              type="number"
            />
            <TextField
              hint="You can paste a job application link. Travel Xchange will add https:// if needed."
              label="Application URL"
              name="application_url"
              placeholder="www.example.com/careers"
              type="text"
            />
            <TextField
              label="Contact email"
              name="contact_email"
              placeholder="jobs@example.com"
              type="email"
            />
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Description
          </h2>
          <TextareaField
            label="Job description"
            name="description"
            placeholder="Describe the role, responsibilities, ideal candidate, and what makes this opportunity attractive."
            required
          />
          <TextareaField
            label="Requirements"
            name="requirements"
            placeholder="List required experience, systems knowledge, destinations, or sales skills."
          />
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Listing package placeholder
          </h2>
          <SelectField
            hint="Payment is not connected yet. This stores the selected package so Stripe can be added in Phase 13."
            label="Package"
            name="package_type"
            options={jobPackageOptions.map((option) => ({
              label: `${option.label} - ${option.description}`,
              value: option.value,
            }))}
          />
        </section>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "justify-center sm:hidden",
            )}
            href="/jobs"
          >
            Back to jobs
          </Link>
          <Button
            className="h-11 bg-[#0f766e] px-5 text-white hover:bg-[#115e59]"
            disabled={isSaving}
            type="submit"
          >
            <Plus className="size-4" aria-hidden="true" />
            {isSaving ? "Posting" : "Post job"}
          </Button>
        </div>
      </form>
    </MemberPageShell>
  );
}
