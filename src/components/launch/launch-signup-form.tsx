"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { isMissingTableError } from "@/lib/supabase/errors";
import type { LaunchSignupRoleInterest } from "@/types/database";

const roleInterestOptions: Array<{
  label: string;
  value: LaunchSignupRoleInterest;
}> = [
  { label: "Travel agent / homeworker", value: "travel_professional" },
  { label: "Supplier / tour operator", value: "supplier" },
  { label: "Recruiter", value: "recruiter" },
  { label: "Trainer / educator", value: "trainer" },
  { label: "Travel technology provider", value: "travel_technology" },
  { label: "Advertiser / partner", value: "advertiser" },
  { label: "Student / new entrant", value: "student" },
  { label: "Other travel industry role", value: "other" },
];

function getFriendlySignupError(error: { code?: string; message?: string }) {
  if (error.code === "23505") {
    return "You are already on the launch list. We will keep you updated.";
  }

  if (isMissingTableError(error, ["launch_signups"])) {
    return "The launch signup table is not installed yet. Run supabase/phase-21-launch-signups.sql in Supabase, then try again.";
  }

  return error.message ?? "Something went wrong. Please try again.";
}

export function LaunchSignupForm() {
  const configured = isSupabaseConfigured();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [roleInterest, setRoleInterest] =
    useState<LaunchSignupRoleInterest>("travel_professional");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage(null);
    setErrorMessage(null);

    if (website.trim()) {
      return;
    }

    if (!supabase) {
      setErrorMessage(
        "Supabase is not connected yet, so we cannot save launch signups.",
      );
      return;
    }

    if (!email.trim()) {
      setErrorMessage("Please add your email address.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("launch_signups").insert({
      company_name: companyName.trim() || null,
      email: email.trim().toLowerCase(),
      full_name: fullName.trim() || null,
      message: message.trim() || null,
      role_interest: roleInterest,
      source_page: "coming_soon_homepage",
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(getFriendlySignupError(error));
      return;
    }

    setFullName("");
    setEmail("");
    setCompanyName("");
    setRoleInterest("travel_professional");
    setMessage("");
    setSuccessMessage(
      "You are on the Travel Xchange launch list. We will email you before public access opens.",
    );
  }

  return (
    <form
      className="mt-8 rounded-lg border border-[#d9e4f5] bg-white/92 p-5 shadow-[0_18px_50px_rgba(6,27,79,0.10)]"
      onSubmit={handleSubmit}
    >
      <div>
        <h2 className="text-xl font-black text-[#061b4f]">
          Follow for launch updates
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
          Join the early access list. This saves your interest only and does not
          create a live member account yet.
        </p>
      </div>

      <input
        aria-hidden="true"
        autoComplete="off"
        className="hidden"
        name="website"
        onChange={(event) => setWebsite(event.target.value)}
        tabIndex={-1}
        value={website}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <TextField
          label="Full name"
          name="full_name"
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Your full name"
          value={fullName}
        />
        <TextField
          label="Email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
        <TextField
          label="Company or agency"
          name="company_name"
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Your company name"
          value={companyName}
        />
        <SelectField
          label="I am a"
          name="role_interest"
          onChange={(event) =>
            setRoleInterest(event.target.value as LaunchSignupRoleInterest)
          }
          options={roleInterestOptions}
          value={roleInterest}
        />
      </div>

      <div className="mt-4">
        <TextareaField
          label="Anything you want us to know?"
          name="message"
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Tell us what you want from Travel Xchange."
          rows={4}
          value={message}
        />
      </div>

      {successMessage ? (
        <div className="mt-4 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          {errorMessage}
        </div>
      ) : null}

      <button
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#061b4f] px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_16px_34px_rgba(6,27,79,0.18)] transition hover:bg-[#082f6f] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Saving..." : "Join launch list"}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}
