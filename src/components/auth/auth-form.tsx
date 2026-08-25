"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "register";
  redirectPath?: string;
};

export function AuthForm({ mode, redirectPath = "/dashboard" }: AuthFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const configured = isSupabaseConfigured();

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
        "Supabase is not connected yet. Add your Supabase URL and anon key to .env.local, then restart the app.",
      );
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setIsSubmitting(true);

    if (mode === "register") {
      setIsSubmitting(false);
      setError(
        "Public registration is temporarily closed while Travel Xchange prepares private beta access.",
      );
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setIsSubmitting(false);
      setError(
        "Email or password not recognised. If your account has only just been created, please check that it has been approved.",
      );
      return;
    }

    if (!data.session) {
      setIsSubmitting(false);
      setError("Travel Xchange could not create a secure login session.");
      return;
    }

    const sessionResponse = await fetch("/api/auth/session", {
      body: JSON.stringify({
        accessToken: data.session.access_token,
        expiresIn: data.session.expires_in,
        refreshToken: data.session.refresh_token,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    setIsSubmitting(false);

    if (!sessionResponse.ok) {
      setError(
        "Your login details were accepted, but the secure platform session could not be saved. Please try again.",
      );
      return;
    }

    router.push(redirectPath);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {!configured ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase keys are not added yet. The form is ready, but real account
          creation starts after `.env.local` is configured.
        </div>
      ) : null}

      <TextField
        autoComplete="email"
        label="Email address"
        name="email"
        placeholder="you@example.com"
        required
        type="email"
      />
      <TextField
        autoComplete={mode === "register" ? "new-password" : "current-password"}
        hint={
          mode === "register"
            ? "Use at least 6 characters for Supabase test accounts."
            : undefined
        }
        label="Password"
        minLength={6}
        name="password"
        placeholder="Enter your password"
        required
        type="password"
      />

      {mode === "login" ? (
        <Link
          className="inline-flex text-sm font-semibold text-[var(--tx-accent)] hover:text-[var(--tx-accent-hover)]"
          href="/login#forgot-password"
        >
          Forgot password?
        </Link>
      ) : null}

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
        className="h-11 w-full bg-[var(--tx-accent)] hover:bg-[var(--tx-accent-hover)]"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        {mode === "register" ? "Create account" : "Log in"}
        {!isSubmitting ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
      </Button>
    </form>
  );
}
