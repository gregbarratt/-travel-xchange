"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import { companyTypeOptions } from "@/config/roles";

const registrationRoleOptions: Array<{
  label: string;
  value: string;
}> = [
  { label: "Select your role", value: "" },
  {
    label: "Travel agent / homeworker",
    value: "verified_travel_professional",
  },
  { label: "Supplier / tour operator", value: "supplier" },
  { label: "Recruiter", value: "recruiter" },
  { label: "Trainer / educator", value: "trainer" },
  { label: "Advertiser / partner", value: "advertiser" },
  { label: "Student / new entrant", value: "registered_user" },
];

const filteredCompanyTypeOptions = [
  { label: "Select business type", value: "" },
  ...companyTypeOptions.filter((option) => option.value !== ""),
];

export function RegistrationRequestForm() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [approvalRoute, setApprovalRoute] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setApprovalRoute(null);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const response = await fetch("/api/auth/register", {
      body: JSON.stringify({
        abtaNumber: String(formData.get("abta_number") ?? ""),
        agentNumber: String(formData.get("agent_number") ?? ""),
        approvalNote: String(formData.get("approval_note") ?? ""),
        atolTtaNumber: String(formData.get("atol_tta_number") ?? ""),
        companyName: String(formData.get("company_name") ?? ""),
        companyType: String(formData.get("company_type") ?? ""),
        email: String(formData.get("email") ?? ""),
        fullName: String(formData.get("full_name") ?? ""),
        iataNumber: String(formData.get("iata_number") ?? ""),
        location: String(formData.get("location") ?? ""),
        password: String(formData.get("password") ?? ""),
        role: String(formData.get("role") ?? "registered_user"),
        websiteUrl: String(formData.get("website_url") ?? ""),
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const payload = (await response.json().catch(() => null)) as
      | { approvalRoute?: string; error?: string; message?: string }
      | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload?.error ?? "Registration could not be completed.");
      return;
    }

    form.reset();
    setApprovalRoute(payload?.approvalRoute ?? null);
    setMessage(
      payload?.message ??
        "Your free account has been created and sent for approval.",
    );
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="rounded-lg border border-[#d9e4f5] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-[#061b4f]">
          Your account
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
          Create your free login first. We then use the trade details below to
          route your approval request. All fields are required.
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <TextField
            autoComplete="name"
            label="Full name"
            name="full_name"
            placeholder="Your full name"
            required
          />
          <SelectField
            label="I am registering as"
            name="role"
            options={registrationRoleOptions}
            required
          />
          <TextField
            autoComplete="email"
            label="Email address"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
          <TextField
            autoComplete="new-password"
            hint="Use at least 6 characters."
            label="Password"
            minLength={6}
            name="password"
            placeholder="Create a password"
            required
            type="password"
          />
          <TextField
            autoComplete="address-level2"
            label="Location"
            name="location"
            placeholder="Manchester, UK"
            required
          />
        </div>
      </div>

      <div className="rounded-lg border border-[#d9e4f5] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-[#061b4f]">
          Supplier, agency, or business
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
          If this business already exists on Travel Xchange, the request goes to
          that company admin. If not, Travel Xchange admin will review it.
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <TextField
            label="Business / supplier name"
            name="company_name"
            required
          />
          <SelectField
            label="Business type"
            name="company_type"
            options={filteredCompanyTypeOptions}
            required
          />
          <TextField
            autoComplete="url"
            hint="You can type www.example.com. We will save it as https://www.example.com."
            label="Website"
            name="website_url"
            placeholder="www.example.com"
            required
          />
        </div>
      </div>

      <div className="rounded-lg border border-[#d9e4f5] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-[#061b4f]">
          Travel trade identifiers
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
          Add any relevant numbers you use in the trade. These are optional,
          but they help admins verify who you are.
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <TextField
            label="Agent / agency number"
            name="agent_number"
            placeholder="Internal agency or homeworker number"
          />
          <TextField
            label="IATA number"
            name="iata_number"
            placeholder="IATA number, if applicable"
          />
          <TextField
            label="ABTA number"
            name="abta_number"
            placeholder="ABTA number, if applicable"
          />
          <TextField
            label="ATOL / TTA number"
            name="atol_tta_number"
            placeholder="ATOL, TTA, or other protection number"
          />
        </div>
      </div>

      <div className="rounded-lg border border-[#d9e4f5] bg-white p-5 shadow-sm">
        <TextareaField
          hint="For example: your role, branch, manager, or why you need supplier access."
          label="Anything the approver should know?"
          name="approval_note"
          placeholder="Add any details that will help your company admin or Travel Xchange admin approve your request."
          required
        />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">{message}</p>
              <p className="mt-1">
                {approvalRoute === "company_admin"
                  ? "Because your business matched an existing supplier/company page, the company admin will see your request."
                  : "Because your business was not already active, Travel Xchange admin will review the business and your profile."}
              </p>
              <Link
                className="mt-3 inline-flex font-extrabold text-[#0f766e] hover:text-[#115e59]"
                href="/login"
              >
                Go to login
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <Button
        className="h-12 w-full bg-gradient-to-r from-[#f52968] to-[#ff7a2f] text-base font-extrabold hover:opacity-95 md:w-auto"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        Create free account and request approval
        {!isSubmitting ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
      </Button>
    </form>
  );
}
