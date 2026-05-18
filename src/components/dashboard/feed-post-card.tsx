"use client";

import { FormEvent } from "react";
import { Heart, MessageCircle, ShieldCheck, SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { feedTopics } from "@/config/navigation";
import { getRoleLabel } from "@/config/roles";
import { cn } from "@/lib/utils";
import type { FeedComment, FeedPost } from "@/types/database";

type FeedPostCardProps = {
  comments: FeedComment[];
  commentDraft: string;
  isBusy: boolean;
  onCommentChange: (value: string) => void;
  onCommentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLikeToggle: () => void;
  post: FeedPost;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function getTopicLabel(value: string) {
  return feedTopics.find((topic) => topic.value === value)?.label ?? "General";
}

export function FeedPostCard({
  comments,
  commentDraft,
  isBusy,
  onCommentChange,
  onCommentSubmit,
  onLikeToggle,
  post,
}: FeedPostCardProps) {
  const authorName = post.author?.full_name ?? "Travel Xchange member";

  return (
    <article className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e0f2f1] text-sm font-semibold text-[#0f766e]">
            {authorName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-950">
                {authorName}
              </h2>
              {post.author?.verification_tier !== "unverified" ? (
                <span className="inline-flex items-center gap-1 rounded bg-[#ecfeff] px-2 py-0.5 text-xs font-semibold text-[#0e7490]">
                  <ShieldCheck className="size-3" aria-hidden="true" />
                  Verified
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {post.author?.headline
                ? post.author.headline
                : post.author?.role
                  ? getRoleLabel(post.author.role)
                  : "Travel industry member"}{" "}
              · {formatDate(post.created_at)}
            </p>
          </div>
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
            {getTopicLabel(post.topic)}
          </span>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-800">
          {post.content}
        </p>
      </div>

      <div className="flex items-center justify-between border-y border-slate-100 px-4 py-2 text-xs text-slate-500">
        <span>{post.like_count} likes</span>
        <span>{post.comment_count} comments</span>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 py-2">
        <Button
          className={cn(
            "h-9 bg-transparent text-slate-600 hover:bg-slate-100",
            post.is_liked_by_current_user && "text-[#0f766e]",
          )}
          disabled={isBusy}
          onClick={onLikeToggle}
          type="button"
          variant="ghost"
        >
          <Heart
            className={cn(
              "size-4",
              post.is_liked_by_current_user && "fill-current",
            )}
            aria-hidden="true"
          />
          {post.is_liked_by_current_user ? "Liked" : "Like"}
        </Button>
        <Button
          className="h-9 bg-transparent text-slate-600 hover:bg-slate-100"
          type="button"
          variant="ghost"
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          Comment
        </Button>
      </div>

      <div className="space-y-3 border-t border-slate-100 bg-slate-50/70 p-4">
        {comments.length > 0 ? (
          <div className="space-y-2">
            {comments.slice(-3).map((comment) => (
              <div
                className="rounded-md bg-white px-3 py-2 text-sm shadow-sm"
                key={comment.id}
              >
                <p className="font-semibold text-slate-950">
                  {comment.author?.full_name ?? "Member"}
                </p>
                <p className="mt-1 leading-5 text-slate-700">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <form className="flex gap-2" onSubmit={onCommentSubmit}>
          <label className="sr-only" htmlFor={`comment-${post.id}`}>
            Add a comment
          </label>
          <input
            className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15"
            id={`comment-${post.id}`}
            maxLength={1000}
            onChange={(event) => onCommentChange(event.target.value)}
            placeholder="Add a comment"
            value={commentDraft}
          />
          <Button
            className="size-10 bg-[#0f766e] p-0 text-white hover:bg-[#115e59]"
            disabled={isBusy || !commentDraft.trim()}
            type="submit"
            title="Post comment"
          >
            <SendHorizontal className="size-4" aria-hidden="true" />
            <span className="sr-only">Post comment</span>
          </Button>
        </form>
      </div>
    </article>
  );
}
