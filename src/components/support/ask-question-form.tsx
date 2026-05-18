"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, HelpCircle, SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import {
  questionCategoryOptions,
  slugifyQuestionTitle,
} from "@/config/support";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Profile, QuestionCategory } from "@/types/database";

const phase10SetupMessage =
  "The Phase 10 support tables are not installed yet. Run supabase/phase-10-support.sql in Supabase, then refresh this page.";

function isMissingSupportTable(error: { code?: string; message?: string }) {
  return isMissingTableError(error, ["questions", "answers", "question_votes"]);
}

const categoryOptions = questionCategoryOptions.filter(
  (option) => option.value !== "all",
);

export function AskQuestionForm() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
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

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const category = String(
      formData.get("category") ?? "new_starter_help",
    ) as QuestionCategory;

    if (!title || !content) {
      setError("Please add a question title and some detail.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const { data: questionData, error: questionError } = await supabase
      .from("questions")
      .insert({
        category,
        content,
        created_by: userId,
        slug: slugifyQuestionTitle(title),
        status: "published",
        title,
        visibility: "members",
      })
      .select("id")
      .single();

    if (questionError) {
      setError(
        isMissingSupportTable(questionError)
          ? phase10SetupMessage
          : questionError.code === "23505"
            ? "A question with this title already exists. Try changing the title slightly."
            : questionError.message,
      );
      setIsSaving(false);
      return;
    }

    router.push(`/support/${questionData.id}`);
  }

  return (
    <MemberPageShell
      activeLabel="Support"
      actions={
        <Link
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "hidden sm:inline-flex",
          )}
          href="/support"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Support
        </Link>
      }
      eyebrow="Ask question"
      title="Ask the Travel Xchange community"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so support questions cannot save.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading support form...
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
          Your question will be visible to logged-in Travel Xchange members. Admin
          moderation and reporting are added in later phases.
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="size-5 text-[#0f766e]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-950">
              Question details
            </h2>
          </div>

          <TextField
            label="Question title"
            name="title"
            placeholder="Which cruise line is best for first-time luxury customers?"
            required
          />

          <SelectField
            label="Category"
            name="category"
            options={categoryOptions}
            required
          />

          <TextareaField
            className="min-h-44"
            hint="Add enough detail so another travel professional can give a useful answer."
            label="Question detail"
            name="content"
            placeholder="Explain the situation, supplier, system, destination, customer type, or rule you need help with."
            required
          />
        </section>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
          <Link
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            href="/support"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to support
          </Link>
          <Button
            className="bg-[#0f766e] text-white hover:bg-[#115e59]"
            disabled={!configured || isLoading || isSaving}
            size="lg"
            type="submit"
          >
            <SendHorizontal className="size-4" aria-hidden="true" />
            {isSaving ? "Saving..." : "Publish question"}
          </Button>
        </div>
      </form>
    </MemberPageShell>
  );
}
