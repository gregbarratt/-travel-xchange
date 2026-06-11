"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError(
        "Supabase is not connected yet. Add your Supabase keys, then try again.",
      );
      return;
    }

    setIsSubmitting(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: getPasswordResetRedirectUrl(),
      },
    );

    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage(
      "Password reset email sent. Please check your inbox and junk folder.",
    );
  }

  return (
    <form
      className="mt-6 rounded-lg border border-slate-200 bg-[#f8fafc] p-4"
      id="forgot-password"
      onSubmit={handleSubmit}
    >
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#061b4f]">
        Forgotten password
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Enter your email address and Travel Xchange will send a secure reset
        link.
      </p>

      <div className="mt-4 space-y-4">
        <TextField
          autoComplete="email"
          label="Email address"
          name="reset-email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
            {message}
          </div>
        ) : null}

        <Button
          className="h-11 w-full bg-[#061b4f] text-white hover:bg-[#063b86]"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Mail className="size-4" aria-hidden="true" />
          )}
          Send reset email
        </Button>
      </div>
    </form>
  );
}

function getPasswordResetRedirectUrl() {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/update-password`;
  }

  const configuredAppUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const fallbackAppUrl = configuredAppUrl;
  const appUrl = (configuredAppUrl || fallbackAppUrl).replace(/\/$/, "");

  return `${appUrl}/update-password`;
}
