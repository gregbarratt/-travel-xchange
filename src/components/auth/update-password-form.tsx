"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const configured = isSupabaseConfigured();
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

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm-password") ?? "");

    if (password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Password updated. You can now log in with the new password.");
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <TextField
        autoComplete="new-password"
        hint="Use at least 6 characters."
        label="New password"
        minLength={6}
        name="password"
        placeholder="Enter your new password"
        required
        type="password"
      />
      <TextField
        autoComplete="new-password"
        label="Confirm new password"
        minLength={6}
        name="confirm-password"
        placeholder="Enter it again"
        required
        type="password"
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
          <CheckCircle2 className="mr-2 inline size-4" aria-hidden="true" />
          {message}
          <div className="mt-3">
            <Link
              className="font-semibold text-[#0f766e] hover:text-[#115e59]"
              href="/login"
            >
              Go to login
            </Link>
          </div>
        </div>
      ) : null}

      <Button
        className="h-11 w-full bg-[#0f766e] hover:bg-[#115e59]"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        Update password
      </Button>
    </form>
  );
}
