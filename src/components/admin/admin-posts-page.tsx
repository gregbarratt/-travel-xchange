"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AdminEmptyState,
  AdminStatusBadge,
  getStatusTone,
} from "@/components/admin/admin-ui";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { SelectField } from "@/components/ui/field";
import { feedTopics } from "@/config/navigation";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { FeedProfile, Post, PostTopic } from "@/types/database";

type PostStatus = Post["status"];

type AdminPost = Post & {
  author: FeedProfile | null;
};

const postStatusOptions: Array<{ label: string; value: PostStatus }> = [
  { label: "Published", value: "published" },
  { label: "Hidden", value: "hidden" },
  { label: "Deleted", value: "deleted" },
  { label: "Draft", value: "draft" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function getTopicLabel(value: PostTopic) {
  return feedTopics.find((topic) => topic.value === value)?.label ?? "General";
}

export function AdminPostsPage() {
  return (
    <AdminPageShell
      activeHref="/admin/posts"
      description="Review feed posts and hide, restore, or delete content when moderation is needed."
      title="Post moderation"
    >
      {({ userId }) => <AdminPostsContent userId={userId} />}
    </AdminPageShell>
  );
}

function AdminPostsContent({ userId }: { userId: string }) {
  const configured = isSupabaseConfigured();
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadPosts = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);

    if (postError) {
      setError(postError.message);
      setIsLoading(false);
      return;
    }

    const postRows = (postData ?? []) as Post[];
    const authorIds = Array.from(new Set(postRows.map((post) => post.created_by)));
    let authorMap = new Map<string, FeedProfile>();

    if (authorIds.length > 0) {
      const { data: authorData } = await supabase
        .from("profiles")
        .select("id, full_name, headline, role, verification_tier")
        .in("id", authorIds);

      authorMap = new Map(
        ((authorData ?? []) as FeedProfile[]).map((author) => [author.id, author]),
      );
    }

    setPosts(
      postRows.map((post) => ({
        ...post,
        author: authorMap.get(post.created_by) ?? null,
      })),
    );
    setError(null);
    setIsLoading(false);
  }, [supabase]);

  async function updatePostStatus(post: AdminPost, status: PostStatus) {
    if (!supabase || post.status === status) {
      return;
    }

    setBusyId(post.id);
    setError(null);

    const { error: updateError } = await supabase
      .from("posts")
      .update({ status })
      .eq("id", post.id);

    if (updateError) {
      setError(updateError.message);
      setBusyId(null);
      return;
    }

    await Promise.all([
      supabase.from("moderation_actions").insert({
        action: `post_${status}`,
        moderator_id: userId,
        notes: `Post changed to ${status}.`,
        target_id: post.id,
        target_type: "post",
      }),
      supabase.from("audit_logs").insert({
        action: "post.status_updated",
        actor_id: userId,
        entity_id: post.id,
        entity_type: "post",
        summary: `Changed a feed post to ${status}.`,
      }),
    ]);

    setMessage("Post status updated.");
    setBusyId(null);
    await loadPosts();
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPosts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPosts]);

  if (isLoading) {
    return <div className="tx-card p-6 text-sm text-[#4d6b9e]">Loading posts...</div>;
  }

  if (posts.length === 0 && !error) {
    return (
      <AdminEmptyState title="No posts yet">
        Feed posts will appear here after members start posting in the Xchange
        Feed.
      </AdminEmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      <section className="space-y-3">
        {posts.map((post) => (
          <article className="tx-card p-5" key={post.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-extrabold text-[#061b4f]">
                    {post.author?.full_name ?? "Unknown member"}
                  </h2>
                  <AdminStatusBadge tone={getStatusTone(post.status)}>
                    {post.status}
                  </AdminStatusBadge>
                  <span className="rounded bg-[#eef5ff] px-2 py-1 text-xs font-bold text-[#063b86]">
                    {getTopicLabel(post.topic)}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-[#7288b8]">
                  {formatDate(post.created_at)}
                </p>
                <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-[#203b70]">
                  {post.content}
                </p>
              </div>

              <div className="w-full sm:w-56">
                <SelectField
                  disabled={busyId === post.id}
                  label="Moderation status"
                  name={`post-status-${post.id}`}
                  onChange={(event) =>
                    void updatePostStatus(post, event.target.value as PostStatus)
                  }
                  options={postStatusOptions}
                  value={post.status}
                />
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
