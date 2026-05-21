"use client";

import type { FormEvent } from "react";
import { MessageSquarePlus, SendHorizontal } from "lucide-react";

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
      className="tx-card p-5"
      onSubmit={onSubmit}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase text-[#063b86]">
            <MessageSquarePlus className="size-4" aria-hidden="true" />
            Start a conversation
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-[#061b4f]">
            Share with the Travel Xchange community
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold text-[#4d6b9e]">
          <span className="rounded-lg bg-[#eef5ff] px-3 py-1">Discussion</span>
          <span className="rounded-lg bg-[#fff0f5] px-3 py-1">Question</span>
          <span className="rounded-lg bg-[#fff7ed] px-3 py-1">Update</span>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="tx-navy-avatar flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white">
          {profile?.full_name?.slice(0, 2).toUpperCase() ?? "TX"}
        </div>
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="post-content">
            Write a post
          </label>
          <textarea
            className="min-h-32 w-full resize-y rounded-lg border border-[#b8cae8] bg-white/82 px-4 py-3 text-sm leading-6 text-[#061b4f] outline-none transition placeholder:text-[#7288b8] focus:border-[#063b86] focus:ring-3 focus:ring-[#063b86]/15"
            id="post-content"
            maxLength={2000}
            name="content"
            placeholder="Start a discussion, ask a question, or share a supplier update..."
            required
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-[#d9e4f5] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-extrabold uppercase text-[#6f86b5]" htmlFor="post-topic">
            Topic
          </label>
          <select
            className="h-10 rounded-lg border border-[#b8cae8] bg-white px-4 text-sm font-medium text-[#061b4f] outline-none focus:border-[#063b86] focus:ring-3 focus:ring-[#063b86]/15"
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
          className="tx-action h-11 px-5"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Posting" : "Post"}
          <SendHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
