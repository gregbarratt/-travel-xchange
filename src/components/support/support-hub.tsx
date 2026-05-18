"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, HelpCircle, MessageSquare, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { QuestionCard } from "@/components/support/question-card";
import { buttonVariants } from "@/components/ui/button";
import { questionCategoryOptions } from "@/config/support";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  Answer,
  Profile,
  Question,
  QuestionCategory,
  QuestionVote,
  QuestionWithMeta,
} from "@/types/database";

type CategoryFilter = QuestionCategory | "all";
type StatusFilter = "all" | "open" | "resolved";

const phase10SetupMessage =
  "The Phase 10 support tables are not installed yet. Run supabase/phase-10-support.sql in Supabase, then refresh this page.";

function isMissingSupportTable(error: { code?: string; message?: string }) {
  return isMissingTableError(error, ["questions", "answers", "question_votes"]);
}

function buildQuestionRows(
  questions: Question[],
  answers: Pick<Answer, "question_id">[],
  votes: Pick<QuestionVote, "question_id" | "answer_id" | "vote_type">[],
  authors: Pick<Profile, "id" | "full_name" | "headline" | "role">[],
): QuestionWithMeta[] {
  const authorMap = new Map(authors.map((author) => [author.id, author]));
  const answerCountMap = answers.reduce<Map<string, number>>((map, answer) => {
    map.set(answer.question_id, (map.get(answer.question_id) ?? 0) + 1);
    return map;
  }, new Map());
  const questionVoteCountMap = votes.reduce<Map<string, number>>((map, vote) => {
    if (!vote.answer_id && vote.vote_type === "upvote") {
      map.set(vote.question_id, (map.get(vote.question_id) ?? 0) + 1);
    }

    return map;
  }, new Map());

  return questions.map((question) => ({
    ...question,
    answer_count: answerCountMap.get(question.id) ?? 0,
    author: authorMap.get(question.created_by) ?? null,
    vote_count: questionVoteCountMap.get(question.id) ?? 0,
  }));
}

export function SupportHub() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [questions, setQuestions] = useState<QuestionWithMeta[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadQuestions = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const [{ data: profileData }, { data: questionRows, error: questionsError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase
          .from("questions")
          .select("*")
          .in("status", ["published", "resolved"])
          .order("created_at", { ascending: false }),
      ]);

    setViewerProfile(profileData);

    if (questionsError) {
      setError(
        isMissingSupportTable(questionsError)
          ? phase10SetupMessage
          : questionsError.message,
      );
      setQuestions([]);
      setIsLoading(false);
      return;
    }

    const typedQuestions = (questionRows ?? []) as Question[];
    const questionIds = typedQuestions.map((question) => question.id);
    const authorIds = Array.from(
      new Set(typedQuestions.map((question) => question.created_by)),
    );

    let answerRows: Pick<Answer, "question_id">[] = [];
    let voteRows: Pick<QuestionVote, "question_id" | "answer_id" | "vote_type">[] = [];
    let authorRows: Pick<Profile, "id" | "full_name" | "headline" | "role">[] =
      [];

    if (questionIds.length > 0) {
      const [answerResult, voteResult] = await Promise.all([
        supabase
          .from("answers")
          .select("question_id")
          .eq("status", "published")
          .in("question_id", questionIds),
        supabase
          .from("question_votes")
          .select("question_id, answer_id, vote_type")
          .in("question_id", questionIds),
      ]);

      const issue = answerResult.error ?? voteResult.error;

      if (issue) {
        setError(
          isMissingSupportTable(issue) ? phase10SetupMessage : issue.message,
        );
        setQuestions([]);
        setIsLoading(false);
        return;
      }

      answerRows = (answerResult.data ?? []) as Pick<Answer, "question_id">[];
      voteRows = (voteResult.data ?? []) as Pick<
        QuestionVote,
        "question_id" | "answer_id" | "vote_type"
      >[];
    }

    if (authorIds.length > 0) {
      const { data: authorsData } = await supabase
        .from("profiles")
        .select("id, full_name, headline, role")
        .in("id", authorIds);

      authorRows = (authorsData ?? []) as Pick<
        Profile,
        "id" | "full_name" | "headline" | "role"
      >[];
    }

    setQuestions(buildQuestionRows(typedQuestions, answerRows, voteRows, authorRows));
    setError(null);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadQuestions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadQuestions]);

  const filteredQuestions = questions.filter((question) => {
    const categoryMatches =
      activeCategory === "all" || question.category === activeCategory;
    const statusMatches =
      activeStatus === "all" ||
      (activeStatus === "open" && question.status === "published") ||
      (activeStatus === "resolved" && question.status === "resolved");
    const searchMatches =
      !searchTerm.trim() ||
      [question.title, question.content, question.author?.full_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase());

    return categoryMatches && statusMatches && searchMatches;
  });
  const resolvedCount = questions.filter((question) => question.status === "resolved").length;
  const openCount = questions.filter((question) => question.status === "published").length;
  const latestQuestions = questions.slice(0, 5);

  return (
    <MemberPageShell
      activeLabel="Support"
      actions={
        <Link
          className={cn(
            buttonVariants({ size: "lg" }),
            "hidden bg-[#0f766e] text-white hover:bg-[#115e59] sm:inline-flex",
          )}
          href="/support/ask"
        >
          <Plus className="size-4" aria-hidden="true" />
          Ask question
        </Link>
      }
      eyebrow="Support"
      title="Support and Q&A"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so support questions cannot load.
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-[#0f766e]">
              Phase 10 support hub
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
              Ask practical travel trade questions and share answers
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Use this area for booking systems, suppliers, payments,
              compliance, marketing, cruise, long haul, complaints, and new
              starter help.
            </p>
          </div>
          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-[#0f766e] text-white hover:bg-[#115e59] sm:hidden",
            )}
            href="/support/ask"
          >
            <Plus className="size-4" aria-hidden="true" />
            Ask question
          </Link>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                Search questions
              </span>
              <span className="relative mt-2 block">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search supplier, payment, compliance..."
                  value={searchTerm}
                />
              </span>
            </label>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {questionCategoryOptions.map((option) => (
                <button
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition",
                    activeCategory === option.value
                      ? "border-[#0f766e] bg-[#e0f2f1] text-[#0f766e]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  key={option.value}
                  onClick={() => setActiveCategory(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: "All", value: "all" },
                { label: "Open", value: "open" },
                { label: "Best answer", value: "resolved" },
              ].map((option) => (
                <button
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition",
                    activeStatus === option.value
                      ? "border-[#082f49] bg-slate-100 text-[#082f49]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  key={option.value}
                  onClick={() => setActiveStatus(option.value as StatusFilter)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading support questions...
            </div>
          ) : null}

          {!isLoading && filteredQuestions.length === 0 && !error ? (
            <div className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
              <HelpCircle
                className="mx-auto size-8 text-[#0f766e]"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">
                No questions match this view
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Ask the first question or clear the filters to see all support
                topics.
              </p>
              <Link
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-5 bg-[#0f766e] text-white hover:bg-[#115e59]",
                )}
                href="/support/ask"
              >
                <Plus className="size-4" aria-hidden="true" />
                Ask question
              </Link>
            </div>
          ) : null}

          <div className="space-y-4">
            {filteredQuestions.map((question) => (
              <QuestionCard question={question} key={question.id} />
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                Support activity
              </h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Open
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {openCount}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Best answer
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {resolvedCount}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                Best answer workflow
              </h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Question owners can mark one answer as best. Moderation, reporting,
              and admin review are expanded in later phases.
            </p>
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Latest questions
            </h2>
            {latestQuestions.length > 0 ? (
              <div className="mt-4 space-y-3">
                {latestQuestions.map((question) => (
                  <Link
                    className="block rounded-md border border-slate-100 p-3 hover:bg-slate-50"
                    href={`/support/${question.id}`}
                    key={question.id}
                  >
                    <p className="font-semibold text-slate-950">
                      {question.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {question.answer_count} answer
                      {question.answer_count === 1 ? "" : "s"}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                New questions will appear here.
              </p>
            )}
          </article>
        </aside>
      </div>
    </MemberPageShell>
  );
}
