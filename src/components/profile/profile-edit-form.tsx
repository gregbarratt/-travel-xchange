"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Save, User } from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import { companyTypeOptions, roleOptions } from "@/config/roles";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { normalizeWebsiteUrl } from "@/lib/urls";
import type {
  Profile,
  ProfileExperience,
  ProfileSpecialism,
  TravelXchangeRole,
} from "@/types/database";

const phase4SetupMessage =
  "The Phase 4 profile tables are not installed yet. Run supabase/phase-4-profiles.sql in Supabase, then refresh this page.";

function splitSpecialisms(value: string) {
  const seen = new Set<string>();

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

export function ProfileEditForm() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState<TravelXchangeRole>("registered_user");
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [specialismsText, setSpecialismsText] = useState("");
  const [experienceTitle, setExperienceTitle] = useState("");
  const [experienceCompany, setExperienceCompany] = useState("");
  const [experienceDescription, setExperienceDescription] = useState("");
  const [experienceStartDate, setExperienceStartDate] = useState("");
  const [experienceEndDate, setExperienceEndDate] = useState("");
  const [experienceCurrent, setExperienceCurrent] = useState(false);
  const [isLoading, setIsLoading] = useState(configured);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadProfile = useCallback(async () => {
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

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      setError(profileError?.message ?? "Your profile could not be loaded.");
      setIsLoading(false);
      return;
    }

    setProfile(profileData);
    setViewerProfile(profileData);
    setFullName(profileData.full_name ?? "");
    setHeadline(profileData.headline ?? "");
    setLocation(profileData.location ?? "");
    setRole(profileData.role);

    if (profileData.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profileData.company_id)
        .maybeSingle();

      if (companyData) {
        setCompanyName(companyData.name);
        setCompanyType(companyData.company_type);
        setWebsiteUrl(companyData.website_url ?? "");
        setCompanyDescription(companyData.description ?? "");
      }
    }

    const [experienceResult, specialismsResult] = await Promise.all([
      supabase
        .from("profile_experience")
        .select("*")
        .eq("profile_id", userData.user.id)
        .order("display_order", { ascending: true })
        .order("start_date", { ascending: false })
        .limit(1),
      supabase
        .from("profile_specialisms")
        .select("*")
        .eq("profile_id", userData.user.id)
        .order("name", { ascending: true }),
    ]);

    if (experienceResult.error || specialismsResult.error) {
      const missingTable = [experienceResult.error, specialismsResult.error].some(
        (tableError) =>
          tableError &&
          isMissingTableError(tableError, [
            "profile_experience",
            "profile_specialisms",
          ]),
      );

      setError(
        missingTable
          ? phase4SetupMessage
          : experienceResult.error?.message ??
              specialismsResult.error?.message ??
              null,
      );
    } else {
      const currentExperience =
        ((experienceResult.data ?? []) as ProfileExperience[])[0] ?? null;
      const specialisms = (specialismsResult.data ?? []) as ProfileSpecialism[];

      setExperienceTitle(currentExperience?.title ?? "");
      setExperienceCompany(currentExperience?.company_name ?? "");
      setExperienceDescription(currentExperience?.description ?? "");
      setExperienceStartDate(currentExperience?.start_date ?? "");
      setExperienceEndDate(currentExperience?.end_date ?? "");
      setExperienceCurrent(currentExperience?.is_current ?? false);
      setSpecialismsText(specialisms.map((item) => item.name).join(", "));
    }

    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProfile]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !profile || !userId) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    const normalizedWebsite = normalizeWebsiteUrl(websiteUrl);
    let companyId = profile.company_id;

    if (companyName.trim()) {
      const companyPayload = {
        company_type: companyType || "other",
        description: companyDescription.trim() || null,
        name: companyName.trim(),
        status: "active" as const,
        website_url: normalizedWebsite,
      };

      if (companyId) {
        const { error: companyError } = await supabase
          .from("companies")
          .update(companyPayload)
          .eq("id", companyId);

        if (companyError) {
          setError(companyError.message);
          setIsSaving(false);
          return;
        }
      } else {
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .insert({
            ...companyPayload,
            created_by: userId,
          })
          .select("id")
          .single();

        if (companyError) {
          setError(companyError.message);
          setIsSaving(false);
          return;
        }

        companyId = companyData.id;
      }
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        company_id: companyId,
        full_name: fullName.trim() || null,
        headline: headline.trim() || null,
        location: location.trim() || null,
        onboarding_completed: true,
        role,
      })
      .eq("id", userId);

    if (profileError) {
      setError(profileError.message);
      setIsSaving(false);
      return;
    }

    await supabase.from("user_roles").upsert(
      {
        role,
        user_id: userId,
      },
      { onConflict: "user_id,role" },
    );

    const specialisms = splitSpecialisms(specialismsText);
    const { error: deleteSpecialismsError } = await supabase
      .from("profile_specialisms")
      .delete()
      .eq("profile_id", userId);

    if (deleteSpecialismsError) {
      setError(
        isMissingTableError(deleteSpecialismsError, ["profile_specialisms"])
          ? phase4SetupMessage
          : deleteSpecialismsError.message,
      );
      setIsSaving(false);
      return;
    }

    if (specialisms.length > 0) {
      const { error: specialismsError } = await supabase
        .from("profile_specialisms")
        .insert(
          specialisms.map((name) => ({
            category: "travel",
            name,
            profile_id: userId,
          })),
        );

      if (specialismsError) {
        setError(specialismsError.message);
        setIsSaving(false);
        return;
      }
    }

    const { error: deleteExperienceError } = await supabase
      .from("profile_experience")
      .delete()
      .eq("profile_id", userId);

    if (deleteExperienceError) {
      setError(
        isMissingTableError(deleteExperienceError, ["profile_experience"])
          ? phase4SetupMessage
          : deleteExperienceError.message,
      );
      setIsSaving(false);
      return;
    }

    if (experienceTitle.trim()) {
      const { error: experienceError } = await supabase
        .from("profile_experience")
        .insert({
          company_name: experienceCompany.trim() || null,
          description: experienceDescription.trim() || null,
          display_order: 0,
          end_date: experienceCurrent ? null : experienceEndDate || null,
          is_current: experienceCurrent,
          profile_id: userId,
          start_date: experienceStartDate || null,
          title: experienceTitle.trim(),
        });

      if (experienceError) {
        setError(experienceError.message);
        setIsSaving(false);
        return;
      }
    }

    setMessage("Profile saved. You can now view the updated profile page.");
    setIsSaving(false);
    await loadProfile();
  }

  return (
    <MemberPageShell
      activeLabel="Profile"
      actions={
        userId ? (
          <Link
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "hidden sm:inline-flex",
            )}
            href={`/profile/${userId}`}
          >
            <User className="size-4" aria-hidden="true" />
            View profile
          </Link>
        ) : null
      }
      eyebrow="Edit profile"
      title="Update your Travel Xchange profile"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so profile edits cannot save.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading your profile...
        </div>
      ) : null}

      <form className="space-y-5" onSubmit={handleSave}>
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
            {message}
          </div>
        ) : null}

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Profile details
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <TextField
              label="Full name"
              name="full_name"
              onChange={(event) => setFullName(event.target.value)}
              required
              value={fullName}
            />
            <SelectField
              label="Main role"
              name="role"
              onChange={(event) => setRole(event.target.value as TravelXchangeRole)}
              options={roleOptions}
              value={role}
            />
            <TextField
              label="Professional headline"
              name="headline"
              onChange={(event) => setHeadline(event.target.value)}
              placeholder="Independent travel agent specialising in luxury cruise"
              value={headline}
            />
            <TextField
              label="Location"
              name="location"
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Manchester, UK"
              value={location}
            />
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Company details
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <TextField
              label="Company name"
              name="company_name"
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="One Travel Club"
              value={companyName}
            />
            <SelectField
              label="Company type"
              name="company_type"
              onChange={(event) => setCompanyType(event.target.value)}
              options={companyTypeOptions}
              value={companyType}
            />
            <TextField
              hint="You can type www.example.com. Travel Xchange will save it as https://www.example.com."
              label="Website"
              name="website_url"
              onChange={(event) => setWebsiteUrl(event.target.value)}
              placeholder="www.example.com"
              type="text"
              value={websiteUrl}
            />
            <TextareaField
              label="Company description"
              name="company_description"
              onChange={(event) => setCompanyDescription(event.target.value)}
              placeholder="Briefly describe what the company does and who it supports."
              value={companyDescription}
            />
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Specialisms
          </h2>
          <div className="mt-5">
            <TextareaField
              hint="Separate each one with a comma, for example: Cruise, Luxury Travel, Caribbean, Touring."
              label="Travel specialisms"
              name="specialisms"
              onChange={(event) => setSpecialismsText(event.target.value)}
              value={specialismsText}
            />
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Current or recent experience
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <TextField
              label="Role or title"
              name="experience_title"
              onChange={(event) => setExperienceTitle(event.target.value)}
              placeholder="Agency owner"
              value={experienceTitle}
            />
            <TextField
              label="Company"
              name="experience_company"
              onChange={(event) => setExperienceCompany(event.target.value)}
              placeholder="One Travel Club"
              value={experienceCompany}
            />
            <TextField
              label="Start date"
              name="experience_start_date"
              onChange={(event) => setExperienceStartDate(event.target.value)}
              type="date"
              value={experienceStartDate}
            />
            <TextField
              disabled={experienceCurrent}
              label="End date"
              name="experience_end_date"
              onChange={(event) => setExperienceEndDate(event.target.value)}
              type="date"
              value={experienceEndDate}
            />
            <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 md:col-span-2">
              <input
                checked={experienceCurrent}
                className="size-4 accent-[#0f766e]"
                onChange={(event) => setExperienceCurrent(event.target.checked)}
                type="checkbox"
              />
              I currently do this role
            </label>
            <TextareaField
              className="md:col-span-2"
              label="Experience description"
              name="experience_description"
              onChange={(event) => setExperienceDescription(event.target.value)}
              placeholder="Briefly describe responsibilities, sectors, destinations, or strengths."
              value={experienceDescription}
            />
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {userId ? (
            <Link
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "justify-center sm:hidden",
              )}
              href={`/profile/${userId}`}
            >
              View profile
            </Link>
          ) : null}
          <Button
            className="h-11 bg-[#0f766e] px-5 text-white hover:bg-[#115e59]"
            disabled={isSaving}
            type="submit"
          >
            <Save className="size-4" aria-hidden="true" />
            {isSaving ? "Saving" : "Save profile"}
          </Button>
        </div>
      </form>
    </MemberPageShell>
  );
}
