"use client";

import type { FormEvent } from "react";
import { SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { feedTopics } from "@/config/navigation";
import type { Profile } from "@/types/database";

type FeedComposerProps = {
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  profile: Profile | null;
};

export function FeedComposer({
  error,
  isSubmitting,
  onSubmit,
  profile,
}: FeedComposerProps) {
  return (
    <form
      className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={onSubmit}
    >
      <div className="flex gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#082f49] text-sm font-semibold text-white">
          {profile?.full_name?.slice(0, 2).toUpperCase() ?? "TX"}
        </div>
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="post-content">
            Write a post
          </label>
          <textarea
            className="min-h-28 w-full resize-y rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15"
            id="post-content"
            maxLength={2000}
            name="content"
            placeholder="Share an update, ask a question, or start a trade conversation..."
            required
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="post-topic">
            Topic
          </label>
          <select
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15"
            defaultValue="general"
            id="post-topic"
            name="topic"
          >
            {feedTopics
              .filter((topic) => topic.value !== "all")
              .map((topic) => (
                <option key={topic.value} value={topic.value}>
                  {topic.label}
                </option>
              ))}
          </select>
        </div>

        <Button
          className="h-10 bg-[#0f766e] px-4 text-white hover:bg-[#115e59]"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Posting" : "Post"}
          <SendHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error ? (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
