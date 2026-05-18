"use client";

import { FormEvent } from "react";
import Link from "next/link";
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
    <article className="tx-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="tx-navy-avatar flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white">
            {authorName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {post.author?.id ? (
                <Link
                  className="text-base font-extrabold text-[#061b4f] hover:text-[#f52968]"
                  href={`/profile/${post.author.id}`}
                >
                  {authorName}
                </Link>
              ) : (
                <h2 className="text-base font-extrabold text-[#061b4f]">
                  {authorName}
                </h2>
              )}
              {post.author?.verification_tier !== "unverified" ? (
                <span className="inline-flex items-center gap-1 rounded bg-[#eef5ff] px-2 py-0.5 text-xs font-bold text-[#063b86]">
                  <ShieldCheck className="size-3" aria-hidden="true" />
                  Verified
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-[#4d6b9e]">
              {post.author?.headline
                ? post.author.headline
                : post.author?.role
                  ? getRoleLabel(post.author.role)
                  : "Travel industry member"}{" "}
              - {formatDate(post.created_at)}
            </p>
          </div>
          <span className="rounded bg-[#eef5ff] px-3 py-1 text-xs font-bold text-[#063b86]">
            {getTopicLabel(post.topic)}
          </span>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#203b70]">
          {post.content}
        </p>
      </div>

      <div className="flex items-center justify-between border-y border-[#d9e4f5] px-5 py-2 text-xs font-medium text-[#4d6b9e]">
        <span>{post.like_count} likes</span>
        <span>{post.comment_count} comments</span>
      </div>

      <div className="grid grid-cols-2 gap-2 px-5 py-2">
        <Button
          className={cn(
            "h-10 bg-transparent text-[#061b4f] hover:bg-[#eef5ff]",
            post.is_liked_by_current_user && "text-[#f52968]",
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
          className="h-10 bg-transparent text-[#061b4f] hover:bg-[#eef5ff]"
          type="button"
          variant="ghost"
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          Comment
        </Button>
      </div>

      <div className="space-y-3 border-t border-[#d9e4f5] bg-[#f6f9ff]/80 p-5">
        {comments.length > 0 ? (
          <div className="space-y-2">
            {comments.slice(-3).map((comment) => (
              <div
                className="rounded-lg border border-[#d9e4f5] bg-white px-3 py-2 text-sm shadow-sm"
                key={comment.id}
              >
                <p className="font-bold text-[#061b4f]">
                  {comment.author?.full_name ?? "Member"}
                </p>
                <p className="mt-1 leading-5 text-[#203b70]">
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
            className="h-10 min-w-0 flex-1 rounded-lg border border-[#b8cae8] bg-white px-3 text-sm text-[#061b4f] outline-none placeholder:text-[#7288b8] focus:border-[#063b86] focus:ring-3 focus:ring-[#063b86]/15"
            id={`comment-${post.id}`}
            maxLength={1000}
            onChange={(event) => onCommentChange(event.target.value)}
            placeholder="Add a comment"
            value={commentDraft}
          />
          <Button
            className="tx-action size-10 p-0"
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
