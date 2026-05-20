"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import { companyTypeOptions, roleOptions } from "@/config/roles";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { TravelXchangeRole } from "@/types/database";

function normalizeWebsiteUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

export function OnboardingForm() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(configured);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  useEffect(() => {
    async function checkSession() {
      if (!supabase) {
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (window.location.hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname);
      }

      setIsCheckingSession(false);

      if (!data.session) {
        router.push("/login");
      }
    }

    void checkSession();
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const role = String(formData.get("role")) as TravelXchangeRole;
    const fullName = String(formData.get("full_name") ?? "");
    const headline = String(formData.get("headline") ?? "");
    const location = String(formData.get("location") ?? "");
    const companyName = String(formData.get("company_name") ?? "");
    const companyType = String(formData.get("company_type") ?? "");
    const websiteUrl = normalizeWebsiteUrl(
      String(formData.get("website_url") ?? ""),
    );
    const companyDescription = String(formData.get("company_description") ?? "");

    if (!supabase) {
      setError(
        "Supabase is not connected yet. Add your Supabase keys to .env.local before saving onboarding data.",
      );
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      router.push("/login");
      return;
    }

    setIsSubmitting(true);

    let companyId: string | null = null;

    if (companyName && companyType) {
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          created_by: userData.user.id,
          name: companyName,
          company_type: companyType,
          website_url: websiteUrl,
          description: companyDescription || null,
          status: "active",
        })
        .select("id")
        .single();

      if (companyError) {
        setIsSubmitting(false);
        setError(companyError.message);
        return;
      }

      companyId = company.id;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userData.user.id,
      full_name: fullName,
      headline,
      location,
      role,
      company_id: companyId,
      onboarding_completed: true,
    });

    if (profileError) {
      setIsSubmitting(false);
      setError(profileError.message);
      return;
    }

    const { error: roleError } = await supabase.from("user_roles").upsert(
      {
        user_id: userData.user.id,
        role,
      },
      { onConflict: "user_id,role" },
    );

    setIsSubmitting(false);

    if (roleError) {
      setError(roleError.message);
      return;
    }

    setMessage("Onboarding saved. Opening your dashboard.");
    router.push("/dashboard");
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      {!configured ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Preview mode: Supabase keys are not added yet, so this page shows the
          onboarding experience but cannot save data until `.env.local` is set.
        </div>
      ) : null}

      {isCheckingSession ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Checking your account session...
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          autoComplete="name"
          label="Full name"
          name="full_name"
          placeholder="Your full name"
          required
        />
        <SelectField
          label="Main role"
          name="role"
          options={roleOptions}
          required
        />
        <TextField
          label="Professional headline"
          name="headline"
          placeholder="Independent travel agent specialising in luxury cruise"
          required
        />
        <TextField
          autoComplete="address-level2"
          label="Location"
          name="location"
          placeholder="Manchester, UK"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-950">
          Company details
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Optional for individual members. Useful for suppliers, recruiters,
          trainers, advertisers, and agency owners.
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <TextField
            label="Company name"
            name="company_name"
            placeholder="Example Travel Ltd"
          />
          <SelectField
            label="Company type"
            name="company_type"
            options={companyTypeOptions}
          />
          <TextField
            autoComplete="url"
            hint="You can type www.example.com. Travel Xchange will save it as https://www.example.com."
            label="Website"
            name="website_url"
            placeholder="www.example.com"
            type="text"
          />
          <TextareaField
            label="Company description"
            name="company_description"
            placeholder="Briefly describe the company and who it supports."
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
          {message}
        </div>
      ) : null}

      <Button
        className="h-11 w-full bg-[#0f766e] hover:bg-[#115e59] sm:w-auto"
        disabled={isSubmitting || isCheckingSession}
        type="submit"
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        Save onboarding
        {!isSubmitting ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
      </Button>
    </form>
  );
}
