"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { AdPlacementSlot } from "@/components/adverts/ad-placement";
import { buttonVariants } from "@/components/ui/button";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { FeedComposer } from "@/components/dashboard/feed-composer";
import { FeedPostCard } from "@/components/dashboard/feed-post-card";
import { RightSidebar } from "@/components/dashboard/right-sidebar";
import { feedTopics } from "@/config/navigation";
import { getRoleLabel } from "@/config/roles";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  Comment,
  FeedComment,
  FeedPost,
  FeedProfile,
  Post,
  PostLike,
  PostTopic,
  Profile,
} from "@/types/database";

type TopicFilter = "all" | PostTopic;

const databaseSetupMessage =
  "The Phase 3 database tables are not installed yet. Run supabase/phase-3-feed.sql in Supabase, then refresh this page.";

function isMissingFeedTableError(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    Boolean(error.message?.toLowerCase().includes("public.posts"))
  );
}

function mapById<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

function groupByPostId(items: FeedComment[]) {
  return items.reduce<Record<string, FeedComment[]>>((groups, item) => {
    groups[item.post_id] = groups[item.post_id] ?? [];
    groups[item.post_id].push(item);
    return groups;
  }, {});
}

function getUniqueValues(values: string[]) {
  return Array.from(new Set(values)).filter(Boolean);
}

export function DashboardPanel() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, FeedComment[]>
  >({});
  const [suggestions, setSuggestions] = useState<FeedProfile[]>([]);
  const [activeTopic, setActiveTopic] = useState<TopicFilter>("all");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(configured);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadSuggestions = useCallback(
    async (currentUserId: string) => {
      if (!supabase) {
        return;
      }

      const { data: followsData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId);

      const followedIds = new Set(
        (followsData ?? []).map((follow) => follow.following_id),
      );

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("id, full_name, headline, role, verification_tier")
        .neq("id", currentUserId)
        .limit(8);

      if (error) {
        setSuggestions([]);
        return;
      }

      setSuggestions(
        ((profileData ?? []) as FeedProfile[]).filter(
          (item) => !followedIds.has(item.id),
        ),
      );
    },
    [supabase],
  );

  const loadFeed = useCallback(
    async (currentUserId: string, topic: TopicFilter) => {
      if (!supabase) {
        return;
      }

      setIsFeedLoading(true);
      setFeedError(null);

      let postQuery = supabase
        .from("posts")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(30);

      if (topic !== "all") {
        postQuery = postQuery.eq("topic", topic);
      }

      const { data: postRows, error: postsError } = await postQuery;

      if (postsError) {
        setPosts([]);
        setCommentsByPost({});
        setFeedError(
          isMissingFeedTableError(postsError)
            ? databaseSetupMessage
            : postsError.message,
        );
        setIsFeedLoading(false);
        return;
      }

      const typedPosts = (postRows ?? []) as Post[];
      const postIds = typedPosts.map((post) => post.id);
      const authorIds = getUniqueValues(typedPosts.map((post) => post.created_by));

      if (postIds.length === 0) {
        setPosts([]);
        setCommentsByPost({});
        setIsFeedLoading(false);
        return;
      }

      const [
        { data: authorRows },
        { data: likeRows },
        { data: commentRows },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, headline, role, verification_tier")
          .in("id", authorIds),
        supabase
          .from("post_likes")
          .select("post_id, user_id")
          .in("post_id", postIds),
        supabase
          .from("comments")
          .select("*")
          .in("post_id", postIds)
          .eq("status", "published")
          .order("created_at", { ascending: true }),
      ]);

      const typedLikes = (likeRows ?? []) as Pick<
        PostLike,
        "post_id" | "user_id"
      >[];
      const typedComments = (commentRows ?? []) as Comment[];
      const commentAuthorIds = getUniqueValues(
        typedComments.map((comment) => comment.created_by),
      );
      const authorMap = mapById((authorRows ?? []) as FeedProfile[]);

      if (commentAuthorIds.length > 0) {
        const { data: commentAuthorRows } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", commentAuthorIds);

        for (const author of (commentAuthorRows ?? []) as Pick<
          Profile,
          "id" | "full_name"
        >[]) {
          const existingAuthor = authorMap.get(author.id);
          authorMap.set(author.id, {
            id: author.id,
            full_name: author.full_name,
            headline: existingAuthor?.headline ?? null,
            role: existingAuthor?.role ?? "registered_user",
            verification_tier: existingAuthor?.verification_tier ?? "unverified",
          });
        }
      }

      const feedComments: FeedComment[] = typedComments.map((comment) => ({
        ...comment,
        author: authorMap.get(comment.created_by) ?? null,
      }));

      const likeCounts = typedLikes.reduce<Record<string, number>>((counts, like) => {
        counts[like.post_id] = (counts[like.post_id] ?? 0) + 1;
        return counts;
      }, {});

      const commentCounts = typedComments.reduce<Record<string, number>>(
        (counts, comment) => {
          counts[comment.post_id] = (counts[comment.post_id] ?? 0) + 1;
          return counts;
        },
        {},
      );

      const likedPostIds = new Set(
        typedLikes
          .filter((like) => like.user_id === currentUserId)
          .map((like) => like.post_id),
      );

      setPosts(
        typedPosts.map((post) => ({
          ...post,
          author: authorMap.get(post.created_by) ?? null,
          comment_count: commentCounts[post.id] ?? 0,
          is_liked_by_current_user: likedPostIds.has(post.id),
          like_count: likeCounts[post.id] ?? 0,
        })),
      );
      setCommentsByPost(groupByPostId(feedComments));
      setIsFeedLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    async function loadDashboard() {
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
      setEmail(userData.user.email ?? null);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .maybeSingle();

      setProfile(profileData);
      setIsLoading(false);
      await Promise.all([
        loadFeed(userData.user.id, activeTopic),
        loadSuggestions(userData.user.id),
      ]);
    }

    void loadDashboard();
  }, [activeTopic, loadFeed, loadSuggestions, router, supabase]);

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !userId) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const content = String(formData.get("content") ?? "").trim();
    const topic = String(formData.get("topic") ?? "general") as PostTopic;

    if (!content) {
      setComposerError("Please write something before posting.");
      return;
    }

    setIsSubmittingPost(true);
    setComposerError(null);

    const { error } = await supabase.from("posts").insert({
      content,
      created_by: userId,
      status: "published",
      topic,
      visibility: "members",
    });

    setIsSubmittingPost(false);

    if (error) {
      setComposerError(
        isMissingFeedTableError(error) ? databaseSetupMessage : error.message,
      );
      return;
    }

    form.reset();
    await loadFeed(userId, activeTopic);
  }

  async function handleLikeToggle(post: FeedPost) {
    if (!supabase || !userId) {
      return;
    }

    setBusyActionId(`like-${post.id}`);

    if (post.is_liked_by_current_user) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", userId);
    } else {
      await supabase.from("post_likes").insert({
        post_id: post.id,
        user_id: userId,
      });
    }

    setBusyActionId(null);
    await loadFeed(userId, activeTopic);
  }

  async function handleCommentSubmit(
    event: FormEvent<HTMLFormElement>,
    postId: string,
  ) {
    event.preventDefault();

    if (!supabase || !userId) {
      return;
    }

    const content = commentDrafts[postId]?.trim();

    if (!content) {
      return;
    }

    setBusyActionId(`comment-${postId}`);
    await supabase.from("comments").insert({
      content,
      created_by: userId,
      post_id: postId,
      status: "published",
    });
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    setBusyActionId(null);
    await loadFeed(userId, activeTopic);
  }

  async function handleFollow(profileId: string) {
    if (!supabase || !userId) {
      return;
    }

    setIsFollowing(true);
    await supabase.from("follows").insert({
      follower_id: userId,
      following_id: profileId,
    });
    await loadSuggestions(userId);
    setIsFollowing(false);
  }

  const memberName = profile?.full_name ?? "Travel Xchange member";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[250px_minmax(0,1fr)]">
        <AppSidebar profile={profile} />

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-[#0f766e]">
                  Xchange Feed
                </p>
                <h1 className="truncate text-xl font-semibold tracking-normal text-slate-950">
                  Welcome, {memberName}
                </h1>
              </div>
              <div className="hidden min-w-64 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex">
                <Search className="size-4" aria-hidden="true" />
                Search arrives in Phase 15
              </div>
              <div className="flex items-center gap-2">
                {profile?.id ? (
                  <Link
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "hidden sm:inline-flex",
                    )}
                    href={`/profile/${profile.id}`}
                  >
                    Profile
                  </Link>
                ) : null}
                <Link
                  className="inline-flex size-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  href="/notifications"
                  title="Notifications"
                >
                  <Bell className="size-4" aria-hidden="true" />
                  <span className="sr-only">Notifications</span>
                </Link>
                <LogoutButton />
              </div>
            </div>
          </header>

          <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0 space-y-4">
              {!configured ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  Preview mode: Supabase is not connected yet. Add `.env.local`,
                  run the Phase 2 and Phase 3 SQL in Supabase, then restart the
                  app to test real feed data.
                </div>
              ) : null}

              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Email
                    </p>
                    <p className="mt-1 break-words text-sm font-medium text-slate-900">
                      {email ?? "Not signed in"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Role
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {profile?.role ? getRoleLabel(profile.role) : "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Onboarding
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {profile?.onboarding_completed ? "Complete" : "Not complete"}
                    </p>
                  </div>
                </div>
                {profile?.id ? (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <Link
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "bg-[#0f766e] text-white hover:bg-[#115e59]",
                      )}
                      href={`/profile/${profile.id}`}
                    >
                      View profile
                    </Link>
                    <Link
                      className={cn(
                        buttonVariants({ variant: "outline", size: "lg" }),
                        "bg-white",
                      )}
                      href="/profile/edit"
                    >
                      Edit profile
                    </Link>
                  </div>
                ) : null}
              </div>

              <FeedComposer
                error={composerError}
                isSubmitting={isSubmittingPost}
                onSubmit={handleCreatePost}
                profile={profile}
              />

              <AdPlacementSlot
                fallback="none"
                placementKey="feed_sponsored_post"
                variant="feed"
              />

              <div className="flex gap-2 overflow-x-auto pb-1">
                {feedTopics.map((topic) => (
                  <button
                    className={cn(
                      "min-w-max rounded-md border px-3 py-2 text-sm font-medium transition",
                      activeTopic === topic.value
                        ? "border-[#0f766e] bg-[#e0f2f1] text-[#0f766e]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                    key={topic.value}
                    onClick={() => setActiveTopic(topic.value as TopicFilter)}
                    type="button"
                  >
                    {topic.label}
                  </button>
                ))}
              </div>

              {feedError ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  {feedError}
                </div>
              ) : null}

              {isLoading || isFeedLoading ? (
                <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                  Loading the Xchange Feed...
                </div>
              ) : null}

              {!isFeedLoading && posts.length === 0 && !feedError ? (
                <div className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-950">
                    Start the first conversation
                  </h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    Post a supplier update, ask a trade question, or share a
                    useful note for other travel professionals.
                  </p>
                </div>
              ) : null}

              <div className="space-y-4">
                {posts.map((post) => (
                  <FeedPostCard
                    commentDraft={commentDrafts[post.id] ?? ""}
                    comments={commentsByPost[post.id] ?? []}
                    isBusy={busyActionId?.endsWith(post.id) ?? false}
                    key={post.id}
                    onCommentChange={(value) =>
                      setCommentDrafts((current) => ({
                        ...current,
                        [post.id]: value,
                      }))
                    }
                    onCommentSubmit={(event) =>
                      handleCommentSubmit(event, post.id)
                    }
                    onLikeToggle={() => handleLikeToggle(post)}
                    post={post}
                  />
                ))}
              </div>
            </section>

            <RightSidebar
              isFollowing={isFollowing}
              onFollow={handleFollow}
              suggestions={suggestions}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
