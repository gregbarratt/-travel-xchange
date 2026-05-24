"use client";

import { FormEvent, useMemo, useState } from "react";
import { Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supplierPageSections } from "@/lib/suppliers/access-control";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { SupplierPageSectionKey } from "@/types/database";

type SupplierContentSubmissionFormProps = {
  companyId: string;
};

type SubmissionResponse = {
  error?: string;
  message?: string;
};

export function SupplierContentSubmissionForm({
  companyId,
}: SupplierContentSubmissionFormProps) {
  const configured = isSupabaseConfigured();
  const [sectionKey, setSectionKey] = useState<SupplierPageSectionKey>("news");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setError("Supabase is not connected yet.");
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setError("Please log in before submitting supplier content.");
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/supplier-pages/${companyId}/submissions`, {
      body: JSON.stringify({
        content,
        sectionKey,
        title,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as
      SubmissionResponse;

    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "Your content could not be submitted.");
      return;
    }

    setTitle("");
    setContent("");
    setMessage(payload.message ?? "Supplier content sent for approval.");
  }

  if (!configured) {
    return null;
  }

  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-[#0f766e]" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-950">
          Suggest supplier content
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Send news, event ideas, or page updates to the supplier page admin for
        approval. It will stay hidden until reviewed.
      </p>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-semibold text-slate-950">
          Section
          <select
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15"
            onChange={(event) =>
              setSectionKey(event.target.value as SupplierPageSectionKey)
            }
            value={sectionKey}
          >
            {supplierPageSections.map((section) => (
              <option key={section.key} value={section.key}>
                {section.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-950">
          Title
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-950 outline-none focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: New cruise training idea"
            required
            value={title}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-950">
          Content
          <textarea
            className="min-h-28 rounded-md border border-slate-300 px-3 py-3 text-sm font-normal text-slate-950 outline-none focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15"
            onChange={(event) => setContent(event.target.value)}
            placeholder="Add the details the supplier team should review."
            required
            value={content}
          />
        </label>

        <Button
          className="w-fit bg-[#0f766e] text-white hover:bg-[#115e59]"
          disabled={isSubmitting}
          type="submit"
        >
          <Send className="size-4" aria-hidden="true" />
          Send for approval
        </Button>
      </form>
    </article>
  );
}
