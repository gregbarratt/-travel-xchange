"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  SendHorizontal,
  Star,
  ThumbsUp,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";
import {
  formatSupportDate,
  getQuestionCategoryLabel,
} from "@/config/support";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  Answer,
  AnswerWithMeta,
  Profile,
  Question,
  QuestionVote,
} from "@/types/database";

type QuestionDetailPageProps = {
  questionId: string;
};

const phase10SetupMessage =
  "The Phase 10 support tables are not installed yet. Run supabase/phase-10-support.sql in Supabase, then refresh this page.";

function isMissingSupportTable(error: { code?: string; message?: string }) {
  return isMissingTableError(error, ["questions", "answers", "question_votes"]);
}

function buildAnswerRows(
  answers: Answer[],
  votes: QuestionVote[],
  authors: Pick<Profile, "id" | "full_name" | "headline" | "role">[],
  currentUserId: string | null,
): AnswerWithMeta[] {
  const authorMap = new Map(authors.map((author) => [author.id, author]));
  const helpfulCountMap = votes.reduce<Map<string, number>>((map, vote) => {
    if (vote.answer_id && vote.vote_type === "helpful") {
      map.set(vote.answer_id, (map.get(vote.answer_id) ?? 0) + 1);
    }

    return map;
  }, new Map());
  const currentUserHelpfulVotes = new Set(
    votes
      .filter(
        (vote) =>
          currentUserId &&
          vote.user_id === currentUserId &&
          vote.answer_id &&
          vote.vote_type === "helpful",
      )
      .map((vote) => vote.answer_id as string),
  );

  return answers.map((answer) => ({
    ...answer,
    author: authorMap.get(answer.created_by) ?? null,
    helpful_count: helpfulCountMap.get(answer.id) ?? 0,
    is_voted_by_current_user: currentUserHelpfulVotes.has(answer.id),
  }));
}

export function QuestionDetailPage({ questionId }: QuestionDetailPageProps) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionAuthor, setQuestionAuthor] =
    useState<Pick<Profile, "id" | "full_name" | "headline" | "role"> | null>(
      null,
    );
  const [answers, setAnswers] = useState<AnswerWithMeta[]>([]);
  const [votes, setVotes] = useState<QuestionVote[]>([]);
  const [answerText, setAnswerText] = useState("");
  const [isLoading, setIsLoading] = useState(configured);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [busyAnswerId, setBusyAnswerId] = useState<string | null>(null);
  const [isVotingQuestion, setIsVotingQuestion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadQuestion = useCallback(async () => {
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

    const [{ data: profileData }, { data: questionData, error: questionError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase.from("questions").select("*").eq("id", questionId).maybeSingle(),
      ]);

    setViewerProfile(profileData);

    if (questionError) {
      setError(
        isMissingSupportTable(questionError)
          ? phase10SetupMessage
          : questionError.message,
      );
      setIsLoading(false);
      return;
    }

    if (!questionData) {
      setError("That support question could not be found.");
      setIsLoading(false);
      return;
    }

    const typedQuestion = questionData as Question;
    setQuestion(typedQuestion);

    const [answerResult, voteResult] = await Promise.all([
      supabase
        .from("answers")
        .select("*")
        .eq("question_id", questionId)
        .eq("status", "published")
        .order("is_best_answer", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase.from("question_votes").select("*").eq("question_id", questionId),
    ]);

    const issue = answerResult.error ?? voteResult.error;

    if (issue) {
      setError(
        isMissingSupportTable(issue) ? phase10SetupMessage : issue.message,
      );
      setIsLoading(false);
      return;
    }

    const answerRows = (answerResult.data ?? []) as Answer[];
    const voteRows = (voteResult.data ?? []) as QuestionVote[];
    const authorIds = Array.from(
      new Set([
        typedQuestion.created_by,
        ...answerRows.map((answer) => answer.created_by),
      ]),
    );

    let authorRows: Pick<Profile, "id" | "full_name" | "headline" | "role">[] =
      [];

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

    const authorMap = new Map(authorRows.map((author) => [author.id, author]));

    setQuestionAuthor(authorMap.get(typedQuestion.created_by) ?? null);
    setVotes(voteRows);
    setAnswers(buildAnswerRows(answerRows, voteRows, authorRows, userData.user.id));
    setError(null);
    setIsLoading(false);
  }, [questionId, router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadQuestion();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadQuestion]);

  async function handleQuestionVote() {
    if (!supabase || !userId || !question) {
      return;
    }

    const existingVote = votes.find(
      (vote) =>
        vote.user_id === userId &&
        !vote.answer_id &&
        vote.vote_type === "upvote",
    );

    setIsVotingQuestion(true);
    setActionError(null);

    const { error: voteError } = existingVote
      ? await supabase.from("question_votes").delete().eq("id", existingVote.id)
      : await supabase.from("question_votes").insert({
          answer_id: null,
          question_id: question.id,
          user_id: userId,
          vote_type: "upvote",
        });

    if (voteError) {
      setActionError(
        isMissingSupportTable(voteError) ? phase10SetupMessage : voteError.message,
      );
      setIsVotingQuestion(false);
      return;
    }

    setIsVotingQuestion(false);
    await loadQuestion();
  }

  async function handleHelpfulVote(answerId: string) {
    if (!supabase || !userId || !question) {
      return;
    }

    const existingVote = votes.find(
      (vote) =>
        vote.user_id === userId &&
        vote.answer_id === answerId &&
        vote.vote_type === "helpful",
    );

    setBusyAnswerId(answerId);
    setActionError(null);

    const { error: voteError } = existingVote
      ? await supabase.from("question_votes").delete().eq("id", existingVote.id)
      : await supabase.from("question_votes").insert({
          answer_id: answerId,
          question_id: question.id,
          user_id: userId,
          vote_type: "helpful",
        });

    if (voteError) {
      setActionError(
        isMissingSupportTable(voteError) ? phase10SetupMessage : voteError.message,
      );
      setBusyAnswerId(null);
      return;
    }

    setBusyAnswerId(null);
    await loadQuestion();
  }

  async function handleAnswerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !userId || !question) {
      return;
    }

    const content = answerText.trim();

    if (!content) {
      setActionError("Please write an answer before posting.");
      return;
    }

    setIsSavingAnswer(true);
    setActionError(null);

    const { error: answerError } = await supabase.from("answers").insert({
      content,
      created_by: userId,
      question_id: question.id,
      status: "published",
    });

    if (answerError) {
      setActionError(
        isMissingSupportTable(answerError)
          ? phase10SetupMessage
          : answerError.message,
      );
      setIsSavingAnswer(false);
      return;
    }

    setAnswerText("");
    setIsSavingAnswer(false);
    await loadQuestion();
  }

  async function handleMarkBestAnswer(answerId: string) {
    if (!supabase || !question || question.created_by !== userId) {
      return;
    }

    setBusyAnswerId(answerId);
    setActionError(null);

    const resetResult = await supabase
      .from("answers")
      .update({ is_best_answer: false })
      .eq("question_id", question.id);

    if (resetResult.error) {
      setActionError(
        isMissingSupportTable(resetResult.error)
          ? phase10SetupMessage
          : resetResult.error.message,
      );
      setBusyAnswerId(null);
      return;
    }

    const bestAnswerResult = await supabase
      .from("answers")
      .update({ is_best_answer: true })
      .eq("id", answerId);

    if (bestAnswerResult.error) {
      setActionError(bestAnswerResult.error.message);
      setBusyAnswerId(null);
      return;
    }

    const questionResult = await supabase
      .from("questions")
      .update({
        best_answer_id: answerId,
        status: "resolved",
      })
      .eq("id", question.id);

    if (questionResult.error) {
      setActionError(questionResult.error.message);
      setBusyAnswerId(null);
      return;
    }

    setBusyAnswerId(null);
    await loadQuestion();
  }

  const questionUpvoteCount = votes.filter(
    (vote) => !vote.answer_id && vote.vote_type === "upvote",
  ).length;
  const hasQuestionUpvote = votes.some(
    (vote) =>
      vote.user_id === userId && !vote.answer_id && vote.vote_type === "upvote",
  );
  const isQuestionOwner = Boolean(question && userId === question.created_by);
  const bestAnswer = answers.find((answer) => answer.is_best_answer);

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
      eyebrow="Support question"
      title={question?.title ?? "Support question"}
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so support questions cannot load.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading support question...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      {question ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <main className="space-y-5">
            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#e0f2f1] px-2 py-1 text-xs font-semibold text-[#0f766e]">
                  <HelpCircle className="size-3" aria-hidden="true" />
                  {getQuestionCategoryLabel(question.category)}
                </span>
                {question.status === "resolved" ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="size-3" aria-hidden="true" />
                    Best answer selected
                  </span>
                ) : (
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                    Open question
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-normal text-slate-950">
                {question.title}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Asked by {questionAuthor?.full_name ?? "Travel Xchange member"} on{" "}
                {formatSupportDate(question.created_at)}
              </p>
              <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-700">
                {question.content}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                <Button
                  className={cn(
                    "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    hasQuestionUpvote
                      ? "border-[#0f766e] bg-[#e0f2f1] text-[#0f766e]"
                      : "",
                  )}
                  disabled={isVotingQuestion}
                  onClick={handleQuestionVote}
                  type="button"
                  variant="outline"
                >
                  <ThumbsUp className="size-4" aria-hidden="true" />
                  {hasQuestionUpvote ? "Upvoted" : "Upvote"} ({questionUpvoteCount})
                </Button>
                <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                  <MessageSquare className="size-4" aria-hidden="true" />
                  {answers.length} answer{answers.length === 1 ? "" : "s"}
                </span>
              </div>
            </article>

            {actionError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                {actionError}
              </div>
            ) : null}

            <form
              className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
              onSubmit={handleAnswerSubmit}
            >
              <h2 className="text-lg font-semibold text-slate-950">
                Add an answer
              </h2>
              <TextareaField
                className="mt-3 min-h-36"
                hint="Keep it helpful, practical, and relevant to the travel trade."
                label="Your answer"
                name="answer"
                onChange={(event) => setAnswerText(event.target.value)}
                placeholder="Share the steps, supplier contact route, rule of thumb, or experience that would help."
                value={answerText}
              />
              <div className="mt-4 flex justify-end">
                <Button
                  className="bg-[#0f766e] text-white hover:bg-[#115e59]"
                  disabled={isSavingAnswer}
                  size="lg"
                  type="submit"
                >
                  <SendHorizontal className="size-4" aria-hidden="true" />
                  {isSavingAnswer ? "Posting..." : "Post answer"}
                </Button>
              </div>
            </form>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-950">
                  Answers
                </h2>
                {bestAnswer ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="size-3" aria-hidden="true" />
                    Best answer chosen
                  </span>
                ) : null}
              </div>

              {answers.length === 0 ? (
                <div className="rounded-md border border-slate-200 bg-white p-6 text-center text-sm leading-6 text-slate-600 shadow-sm">
                  No answers yet. Add the first practical reply.
                </div>
              ) : null}

              {answers.map((answer) => (
                <article
                  className={cn(
                    "rounded-md border bg-white p-5 shadow-sm",
                    answer.is_best_answer
                      ? "border-emerald-200 ring-2 ring-emerald-100"
                      : "border-slate-200",
                  )}
                  key={answer.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {answer.author?.full_name ?? "Travel Xchange member"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatSupportDate(answer.created_at)}
                      </p>
                    </div>
                    {answer.is_best_answer ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                        <Star className="size-3" aria-hidden="true" />
                        Best answer
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
                    {answer.content}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                    <Button
                      className={cn(
                        "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        answer.is_voted_by_current_user
                          ? "border-[#0f766e] bg-[#e0f2f1] text-[#0f766e]"
                          : "",
                      )}
                      disabled={busyAnswerId === answer.id}
                      onClick={() => handleHelpfulVote(answer.id)}
                      type="button"
                      variant="outline"
                    >
                      <ThumbsUp className="size-4" aria-hidden="true" />
                      Helpful ({answer.helpful_count})
                    </Button>

                    {isQuestionOwner && !answer.is_best_answer ? (
                      <Button
                        className="border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                        disabled={busyAnswerId === answer.id}
                        onClick={() => handleMarkBestAnswer(answer.id)}
                        type="button"
                        variant="outline"
                      >
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        Mark best answer
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))}
            </section>
          </main>

          <aside className="space-y-5">
            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Question status
              </h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>
                  <strong className="text-slate-950">Status:</strong>{" "}
                  {question.status === "resolved" ? "Best answer" : "Open"}
                </p>
                <p>
                  <strong className="text-slate-950">Category:</strong>{" "}
                  {getQuestionCategoryLabel(question.category)}
                </p>
                <p>
                  <strong className="text-slate-950">Answers:</strong>{" "}
                  {answers.length}
                </p>
              </div>
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-[#0f766e]" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950">
                  Best answer
                </h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                The person who asked the question can mark one answer as best.
                This turns the question into a resolved support thread.
              </p>
            </article>

            <Link
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full bg-[#0f766e] text-white hover:bg-[#115e59]",
              )}
              href="/support/ask"
            >
              <HelpCircle className="size-4" aria-hidden="true" />
              Ask another question
            </Link>
          </aside>
        </div>
      ) : null}
    </MemberPageShell>
  );
}
