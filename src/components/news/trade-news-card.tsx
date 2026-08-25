"use client";

import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import type { NewsPostWithMeta } from "@/types/database";

/**
 * A card for a story that came from an outside publisher.
 *
 * It has to be obvious at a glance that this is not a Travel Xchange member
 * post: the publisher is named first, the link leaves the platform, and the
 * card carries a headline, a short extract and the topics it was filed under -
 * never the article itself.
 */

type TradeNewsCardProps = {
  post: NewsPostWithMeta;
  onOpen?: (post: NewsPostWithMeta) => void;
};

/** UK-format date, as used across the rest of the platform. */
function formatPublished(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const elapsedMs = Date.now() - date.getTime();
  const hours = Math.floor(elapsedMs / (60 * 60 * 1000));

  if (hours < 1) {
    const minutes = Math.max(1, Math.floor(elapsedMs / 60_000));
    return `${minutes} min ago`;
  }

  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TradeNewsCard({ post, onOpen }: TradeNewsCardProps) {
  const publisher = post.source?.publisher ?? post.publisher;
  const published = formatPublished(post.published_at);

  return (
    <article className="flex h-full flex-col rounded-lg border border-[#d6e2f5] bg-white p-4 shadow-[0_10px_22px_rgba(7,36,91,0.06)] transition hover:border-[#b8cae8]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#eef4ff] px-2 py-1 text-xs font-bold text-[#063b86]">
          <ExternalLink className="size-3" aria-hidden="true" />
          {publisher}
        </span>
        {published ? (
          <time className="text-xs font-semibold text-[#5b6b8a]" dateTime={post.published_at}>
            {published}
          </time>
        ) : null}
        {post.sensitivity !== "routine" ? (
          <span
            className={cn(
              "rounded-md px-2 py-1 text-xs font-bold",
              post.sensitivity === "high_risk"
                ? "bg-[#fdecec] text-[#a3261f]"
                : "bg-[#fff5e6] text-[#8a5200]",
            )}
          >
            {post.sensitivity === "high_risk" ? "Developing story" : "Check before advising"}
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-base font-extrabold leading-6 text-[#061b4f]">
        <a
          className="hover:underline"
          href={post.canonical_url}
          onClick={() => onOpen?.(post)}
          rel="noopener noreferrer nofollow"
          target="_blank"
        >
          {post.title}
        </a>
      </h3>

      {post.summary ? (
        <p className="mt-2 text-sm leading-6 text-[#3d4d6b]">{post.summary}</p>
      ) : (
        <p className="mt-2 text-sm leading-6 text-[#5b6b8a]">
          Open the original story on {publisher} for the full details.
        </p>
      )}

      {post.topics.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {post.topics.map((topic) => (
            <li
              className="rounded-md border border-[#d6e2f5] px-2 py-0.5 text-xs font-semibold text-[#3d4d6b]"
              key={topic.id}
            >
              {topic.name}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto pt-4">
        <a
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#063b86] hover:text-[#04275c]"
          href={post.canonical_url}
          onClick={() => onOpen?.(post)}
          rel="noopener noreferrer nofollow"
          target="_blank"
        >
          Read full story on {publisher}
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}
