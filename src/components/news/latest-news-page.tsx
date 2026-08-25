"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Newspaper, RefreshCw, Rss, Settings2 } from "lucide-react";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { TradeNewsCard } from "@/components/news/trade-news-card";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { NewsPostWithMeta, NewsTopic, Profile } from "@/types/database";

/**
 * Latest News.
 *
 * The list is built on the server from what this member follows, so the page
 * only ever receives the stories that are relevant to them. Filtering by a
 * single topic is a deliberate override and asks the server again rather than
 * hiding rows in the browser.
 */

type FollowsPayload = {
  topics: Array<Pick<NewsTopic, "id" | "name" | "slug" | "description" | "topic_group">>;
  sources: Array<{ id: string; name: string; publisher: string; slug: string }>;
  followedTopicIds: string[];
  followedSourceIds: string[];
};

type FeedPayload = {
  posts: NewsPostWithMeta[];
  nextCursor: string | null;
  audience: { mode: "personalised" | "default" };
};

const setupMessage =
  "The Phase 31 news tables are not installed yet. Run supabase/phase-31-news-ingestion.sql in Supabase, then refresh this page.";

export function LatestNewsPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const supabase = useMemo(
    () => (configured ? createSupabaseBrowserClient() : null),
    [configured],
  );

  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<NewsPostWithMeta[]>([]);
  const [follows, setFollows] = useState<FollowsPayload | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [audienceMode, setAudienceMode] = useState<"personalised" | "default">("default");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(configured);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSavingFollow, setIsSavingFollow] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getAccessToken = useCallback(async () => {
    if (!supabase) {
      return null;
    }

    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [supabase]);

  const loadPage = useCallback(
    async (topicId: string | null, cursor: string | null) => {
      const token = await getAccessToken();

      if (!token) {
        router.replace("/login");
        return null;
      }

      const params = new URLSearchParams();

      if (topicId) {
        params.set("topicId", topicId);
      }

      if (cursor) {
        params.set("cursor", cursor);
      }

      const response = await fetch(`/api/news/feed?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json().catch(() => ({}))) as Partial<FeedPayload> & {
        error?: string;
      };

      if (!response.ok) {
        setError(
          payload.error?.includes("news_posts") ? setupMessage : payload.error ?? "The news feed could not be loaded.",
        );
        return null;
      }

      setError(null);
      return payload as FeedPayload;
    },
    [getAccessToken, router],
  );

  const loadEverything = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    setIsLoading(true);

    const [{ data: profileData }, token] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userData.user.id).maybeSingle(),
      getAccessToken(),
    ]);

    setViewerProfile(profileData);

    if (token) {
      const followsResponse = await fetch("/api/news/follows", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (followsResponse.ok) {
        setFollows((await followsResponse.json()) as FollowsPayload);
      }
    }

    const page = await loadPage(null, null);

    if (page) {
      setPosts(page.posts);
      setNextCursor(page.nextCursor);
      setAudienceMode(page.audience.mode);
    }

    setIsLoading(false);
  }, [getAccessToken, loadPage, router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEverything();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadEverything]);

  const selectTopic = useCallback(
    async (topicId: string | null) => {
      setActiveTopicId(topicId);
      setIsLoading(true);

      const page = await loadPage(topicId, null);

      if (page) {
        setPosts(page.posts);
        setNextCursor(page.nextCursor);
      }

      setIsLoading(false);
    },
    [loadPage],
  );

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    const page = await loadPage(activeTopicId, nextCursor);

    if (page) {
      setPosts((current) => [...current, ...page.posts]);
      setNextCursor(page.nextCursor);
    }

    setIsLoadingMore(false);
  }, [activeTopicId, isLoadingMore, loadPage, nextCursor]);

  const toggleTopicFollow = useCallback(
    async (topicId: string) => {
      const token = await getAccessToken();

      if (!token || !follows) {
        return;
      }

      const following = !follows.followedTopicIds.includes(topicId);
      setIsSavingFollow(topicId);

      const response = await fetch("/api/news/follows", {
        body: JSON.stringify({ following, topicId }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "PUT",
      });

      if (response.ok) {
        setFollows({
          ...follows,
          followedTopicIds: following
            ? [...follows.followedTopicIds, topicId]
            : follows.followedTopicIds.filter((id) => id !== topicId),
        });

        const page = await loadPage(activeTopicId, null);

        if (page) {
          setPosts(page.posts);
          setNextCursor(page.nextCursor);
          setAudienceMode(page.audience.mode);
        }
      }

      setIsSavingFollow(null);
    },
    [activeTopicId, follows, getAccessToken, loadPage],
  );

  const followedTopics = follows?.followedTopicIds ?? [];

  return (
    <MemberPageShell
      activeLabel="Trade news"
      actions={
        <button
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--tx-border)] bg-white/90 px-3 text-sm font-bold text-[var(--tx-text)] hover:bg-white"
          onClick={() => void loadEverything()}
          type="button"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Refresh
        </button>
      }
      eyebrow="Trade news"
      title="Latest news"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so trade news cannot load.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4">
          <div className="rounded-lg border border-[var(--tx-border)] bg-white p-4 shadow-[0_10px_22px_rgba(7,36,91,0.06)]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-bold transition",
                  activeTopicId === null
                    ? "border-[var(--tx-accent)] bg-[var(--tx-accent-soft)] text-[var(--tx-accent)]"
                    : "border-[var(--tx-border)] bg-white text-[var(--tx-text-muted)] hover:bg-[var(--tx-surface-hover)]",
                )}
                onClick={() => void selectTopic(null)}
                type="button"
              >
                {audienceMode === "personalised" ? "My topics" : "Recommended"}
              </button>
              {(follows?.topics ?? []).map((topic) => (
                <button
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-semibold transition",
                    activeTopicId === topic.id
                      ? "border-[var(--tx-accent)] bg-[var(--tx-accent-soft)] text-[var(--tx-accent)]"
                      : "border-[var(--tx-border)] bg-white text-[var(--tx-text-muted)] hover:bg-[var(--tx-surface-hover)]",
                  )}
                  key={topic.id}
                  onClick={() => void selectTopic(topic.id)}
                  type="button"
                >
                  {topic.name}
                </button>
              ))}
            </div>
            <p className="mt-3 border-t border-[var(--tx-border)] pt-3 text-xs font-semibold text-[var(--tx-text-subtle)]">
              {audienceMode === "personalised"
                ? "Your feed is built from the topics and publishers you follow."
                : "You have not chosen topics yet, so this is the balanced trade feed. Follow a few topics to tune it."}
            </p>
          </div>

          {error ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--tx-border)] bg-white p-6 text-sm font-semibold text-[var(--tx-text-muted)]">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading trade news...
            </div>
          ) : null}

          {!isLoading && posts.length === 0 && !error ? (
            <div className="rounded-lg border border-[var(--tx-border)] bg-white p-8 text-center shadow-[0_10px_22px_rgba(7,36,91,0.06)]">
              <Newspaper className="mx-auto size-8 text-[var(--tx-accent)]" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-extrabold text-[var(--tx-text)]">
                No trade news yet
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--tx-text-muted)]">
                Trade news arrives automatically once a platform admin has verified and
                enabled a publisher feed. Nothing is published from an unverified source.
              </p>
              <Link
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--tx-accent)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--tx-accent-hover)]"
                href="/news"
              >
                <Newspaper className="size-4" aria-hidden="true" />
                Browse Travel Xchange articles
              </Link>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {posts.map((post) => (
              <TradeNewsCard key={post.id} post={post} />
            ))}
          </div>

          {nextCursor ? (
            <button
              className="w-full rounded-lg border border-[var(--tx-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--tx-accent)] hover:bg-[var(--tx-surface-hover)] disabled:opacity-60"
              disabled={isLoadingMore}
              onClick={() => void loadMore()}
              type="button"
            >
              {isLoadingMore ? "Loading..." : "Load more stories"}
            </button>
          ) : null}
        </section>

        <aside className="space-y-5">
          <article className="rounded-lg border border-[var(--tx-border)] bg-white p-5 shadow-[0_10px_22px_rgba(7,36,91,0.06)]">
            <div className="flex items-center gap-2">
              <Settings2 className="size-5 text-[var(--tx-accent)]" aria-hidden="true" />
              <h2 className="text-lg font-extrabold text-[var(--tx-text)]">Follow topics</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--tx-text-muted)]">
              Choose what you sell. Your Latest News feed and the trade news in your
              home feed both follow these choices.
            </p>
            <ul className="mt-4 space-y-2">
              {(follows?.topics ?? []).map((topic) => {
                const isFollowing = followedTopics.includes(topic.id);

                return (
                  <li key={topic.id}>
                    <button
                      aria-pressed={isFollowing}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm font-semibold transition",
                        isFollowing
                          ? "border-[var(--tx-accent)] bg-[var(--tx-accent-soft)] text-[var(--tx-accent)]"
                          : "border-[var(--tx-border)] bg-white text-[var(--tx-text-muted)] hover:bg-[var(--tx-surface-hover)]",
                      )}
                      disabled={isSavingFollow === topic.id}
                      onClick={() => void toggleTopicFollow(topic.id)}
                      type="button"
                    >
                      <span>{topic.name}</span>
                      <span className="text-xs font-bold">
                        {isSavingFollow === topic.id
                          ? "Saving..."
                          : isFollowing
                            ? "Following"
                            : "Follow"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </article>

          <article className="rounded-lg border border-[var(--tx-border)] bg-white p-5 shadow-[0_10px_22px_rgba(7,36,91,0.06)]">
            <div className="flex items-center gap-2">
              <Rss className="size-5 text-[var(--tx-accent)]" aria-hidden="true" />
              <h2 className="text-lg font-extrabold text-[var(--tx-text)]">Where this comes from</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--tx-text-muted)]">
              Travel Xchange links to the publisher and never republishes their article.
              Each card carries the headline, a short extract, the source and a link to
              the original.
            </p>
            {(follows?.sources ?? []).length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {(follows?.sources ?? []).map((source) => (
                  <li className="text-sm font-semibold text-[var(--tx-text)]" key={source.id}>
                    {source.publisher}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[var(--tx-text-subtle)]">
                No publisher feeds are enabled yet.
              </p>
            )}
          </article>
        </aside>
      </div>
    </MemberPageShell>
  );
}
