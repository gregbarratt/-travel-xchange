import Link from "next/link";
import { CheckCircle2, HelpCircle, MessageSquare, ThumbsUp } from "lucide-react";

import {
  formatSupportDate,
  getQuestionCategoryLabel,
} from "@/config/support";
import type { QuestionWithMeta } from "@/types/database";

type QuestionCardProps = {
  question: QuestionWithMeta;
};

export function QuestionCard({ question }: QuestionCardProps) {
  const isResolved = question.status === "resolved";

  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-[#e0f2f1] px-2 py-1 text-xs font-semibold text-[#0f766e]">
          <HelpCircle className="size-3" aria-hidden="true" />
          {getQuestionCategoryLabel(question.category)}
        </span>
        {isResolved ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="size-3" aria-hidden="true" />
            Best answer
          </span>
        ) : (
          <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
            Open question
          </span>
        )}
      </div>

      <Link href={`/support/${question.id}`}>
        <h2 className="mt-3 text-xl font-semibold tracking-normal text-slate-950">
          {question.title}
        </h2>
      </Link>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700">
        {question.content}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>{question.author?.full_name ?? "Travel Xchange member"}</span>
        <span>-</span>
        <span>{formatSupportDate(question.created_at)}</span>
        <span>-</span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="size-3" aria-hidden="true" />
          {question.answer_count} answer{question.answer_count === 1 ? "" : "s"}
        </span>
        <span>-</span>
        <span className="inline-flex items-center gap-1">
          <ThumbsUp className="size-3" aria-hidden="true" />
          {question.vote_count}
        </span>
      </div>
    </article>
  );
}
