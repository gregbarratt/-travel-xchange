"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Rss } from "lucide-react";

import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { NewsPostWithMeta } from "@/types/database";

/**
 * Compact trade news rail.
 *
 * Trade news belongs inside Travel Xchange rather than on a page of its own,
 * so this sits alongside the feed and the article pages. It uses the same
 * personalised endpoint as Latest News, so a member sees the same relevance
 * rules everywhere.
 */

type TradeNewsRailProps = {
  heading?: string;
  limit?: number;
};

export function TradeNewsRail({ heading = "Latest trade news", limit = 5 }: TradeNewsRailProps) {
  const configured = isSupabaseConfigured();
  const supabase = useMemo(
    () => (configured ? createSupabaseBrowserClient() : null),
    [configured],
  );
  const [posts, setPosts] = useState<NewsPostWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(configured);

  const load = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setIsLoading(false);
      return;
    }

    const response = await fetch(`/api/news/feed?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const payload = (await response.json()) as { posts?: NewsPostWithMeta[] };
      setPosts(payload.posts ?? []);
    }

    setIsLoading(false);
  }, [limit, supabase]);

  useEffect(() => {
    // Deferred so the first paint is not blocked by the fetch, and so the
    // effect body itself never calls setState synchronously.
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  return (
    <article className="rounded-lg border border-[#d6e2f5] bg-white p-5 shadow-[0_10px_22px_rgba(7,36,91,0.06)]">
      <div className="flex items-center gap-2">
        <Rss className="size-5 text-[#063b86]" aria-hidden="true" />
        <h2 className="text-lg font-extrabold text-[#061b4f]">{heading}</h2>
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm leading-6 text-[#5b6b8a]">Loading trade news...</p>
      ) : null}

      {!isLoading && posts.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-[#5b6b8a]">
          Trade news appears here once a platform admin has verified and enabled a
          publisher feed.
        </p>
      ) : null}

      {posts.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {posts.map((post) => (
            <li key={post.id}>
              <a
                className="block rounded-md border border-[#eef2f9] p-3 hover:bg-[#f8fbff]"
                href={post.canonical_url}
                rel="noopener noreferrer nofollow"
                target="_blank"
              >
                <p className="text-sm font-bold leading-5 text-[#061b4f]">{post.title}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#5b6b8a]">
                  {post.source?.publisher ?? post.publisher}
                  <ExternalLink className="size-3" aria-hidden="true" />
                </p>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <Link
        className="mt-4 inline-flex text-sm font-bold text-[#063b86] hover:text-[#04275c]"
        href="/news/latest"
      >
        View all trade news
      </Link>
    </article>
  );
}
