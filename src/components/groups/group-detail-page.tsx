"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageCircle, SendHorizontal, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { getGroupCategoryLabel } from "@/config/groups";
import { getRoleLabel } from "@/config/roles";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  Group,
  GroupMember,
  GroupPost,
  GroupPostWithAuthor,
  Profile,
} from "@/types/database";

type GroupDetailPageProps = {
  groupId: string;
};

const phase5SetupMessage =
  "The Phase 5 group tables are not installed yet. Run supabase/phase-5-groups.sql in Supabase, then refresh this page.";

function initials(name: string | null) {
  return (name ?? "Travel Xchange")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function isMissingGroupsTable(error: { code?: string; message?: string }) {
  return isMissingTableError(error, ["groups", "group_members", "group_posts"]);
}

export function GroupDetailPage({ groupId }: GroupDetailPageProps) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [membership, setMembership] = useState<GroupMember | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [posts, setPosts] = useState<GroupPostWithAuthor[]>([]);
  const [postDraft, setPostDraft] = useState("");
  const [isLoading, setIsLoading] = useState(configured);
  const [isJoining, setIsJoining] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadGroup = useCallback(async () => {
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

    const [{ data: profileData }, { data: groupData, error: groupError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
      ]);

    setViewerProfile(profileData);

    if (groupError) {
      setError(isMissingGroupsTable(groupError) ? phase5SetupMessage : groupError.message);
      setIsLoading(false);
      return;
    }

    if (!groupData) {
      setError("That group could not be found.");
      setIsLoading(false);
      return;
    }

    setGroup(groupData);

    const [membersResult, postsResult] = await Promise.all([
      supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .eq("status", "active"),
      supabase
        .from("group_posts")
        .select("*")
        .eq("group_id", groupId)
        .eq("status", "published")
        .order("created_at", { ascending: false }),
    ]);

    if (membersResult.error || postsResult.error) {
      const issue = membersResult.error ?? postsResult.error;
      setError(issue && isMissingGroupsTable(issue) ? phase5SetupMessage : issue?.message ?? null);
      setIsLoading(false);
      return;
    }

    const members = (membersResult.data ?? []) as GroupMember[];
    const groupPosts = (postsResult.data ?? []) as GroupPost[];
    const authorIds = Array.from(new Set(groupPosts.map((post) => post.created_by)));
    const authorMap = new Map<string, Pick<Profile, "id" | "full_name" | "headline" | "role">>();

    if (authorIds.length > 0) {
      const { data: authorRows } = await supabase
        .from("profiles")
        .select("id, full_name, headline, role")
        .in("id", authorIds);

      for (const author of (authorRows ?? []) as Pick<
        Profile,
        "id" | "full_name" | "headline" | "role"
      >[]) {
        authorMap.set(author.id, author);
      }
    }

    setMembership(
      members.find((member) => member.user_id === userData.user.id) ?? null,
    );
    setMemberCount(members.length);
    setPosts(
      groupPosts.map((post) => ({
        ...post,
        author: authorMap.get(post.created_by) ?? null,
      })),
    );
    setError(null);
    setIsLoading(false);
  }, [groupId, router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadGroup();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadGroup]);

  async function handleMembershipToggle() {
    if (!supabase || !userId || !group) {
      return;
    }

    setIsJoining(true);

    if (membership) {
      await supabase
        .from("group_members")
        .delete()
        .eq("group_id", group.id)
        .eq("user_id", userId);
    } else {
      await supabase.from("group_members").insert({
        group_id: group.id,
        role: "member",
        status: "active",
        user_id: userId,
      });
    }

    setIsJoining(false);
    await loadGroup();
  }

  async function handlePostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !userId || !group || !membership) {
      return;
    }

    const content = postDraft.trim();

    if (!content) {
      setPostError("Please write something before posting.");
      return;
    }

    setIsPosting(true);
    setPostError(null);

    const { error: groupPostError } = await supabase.from("group_posts").insert({
      content,
      created_by: userId,
      group_id: group.id,
      status: "published",
    });

    if (groupPostError) {
      setPostError(
        isMissingGroupsTable(groupPostError)
          ? phase5SetupMessage
          : groupPostError.message,
      );
      setIsPosting(false);
      return;
    }

    setPostDraft("");
    setIsPosting(false);
    await loadGroup();
  }

  const isMember = Boolean(membership);
  const groupTitle = group?.name ?? "Group";

  return (
    <MemberPageShell
      activeLabel="Groups"
      actions={
        <Link
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "hidden sm:inline-flex",
          )}
          href="/groups"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Groups
        </Link>
      }
      eyebrow="Group"
      title={groupTitle}
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so group discussions cannot load.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading group...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      {group ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-5">
            <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="h-32 bg-[linear-gradient(120deg,#082f49,#0f766e)]" />
              <div className="p-5 sm:p-6">
                <div className="-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex items-end gap-4">
                    <div className="flex size-24 items-center justify-center rounded-md border-4 border-white bg-[#e0f2f1] text-2xl font-semibold text-[#0f766e] shadow-sm">
                      {initials(group.name)}
                    </div>
                    <div className="pb-1">
                      <span className="rounded-md bg-[#e0f2f1] px-2 py-1 text-xs font-semibold text-[#0f766e]">
                        {getGroupCategoryLabel(group.category)}
                      </span>
                      <h2 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950">
                        {group.name}
                      </h2>
                    </div>
                  </div>
                  <Button
                    className={cn(
                      "h-10 px-4",
                      isMember
                        ? "bg-[#082f49] hover:bg-[#0c4a6e]"
                        : "bg-[#0f766e] hover:bg-[#115e59]",
                    )}
                    disabled={isJoining}
                    onClick={handleMembershipToggle}
                    type="button"
                  >
                    <Users className="size-4" aria-hidden="true" />
                    {isMember ? "Joined" : "Join group"}
                  </Button>
                </div>
                <p className="mt-6 text-sm leading-6 text-slate-700">
                  {group.description}
                </p>
              </div>
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Group discussion
              </h2>

              {isMember ? (
                <form className="mt-4 space-y-3" onSubmit={handlePostSubmit}>
                  <label className="sr-only" htmlFor="group-post">
                    Write a group post
                  </label>
                  <textarea
                    className="min-h-28 w-full resize-y rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0f766e] focus:ring-3 focus:ring-[#0f766e]/15"
                    id="group-post"
                    maxLength={2000}
                    onChange={(event) => setPostDraft(event.target.value)}
                    placeholder="Share an update with this group..."
                    value={postDraft}
                  />
                  {postError ? (
                    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                      {postError}
                    </p>
                  ) : null}
                  <Button
                    className="h-10 bg-[#0f766e] px-4 text-white hover:bg-[#115e59]"
                    disabled={isPosting}
                    type="submit"
                  >
                    <SendHorizontal className="size-4" aria-hidden="true" />
                    {isPosting ? "Posting" : "Post to group"}
                  </Button>
                </form>
              ) : (
                <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  Join this group to post in the discussion.
                </div>
              )}
            </article>

            <div className="space-y-4">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <article
                    className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
                    key={post.id}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e0f2f1] text-sm font-semibold text-[#0f766e]">
                        {initials(post.author?.full_name ?? null)}
                      </div>
                      <div className="min-w-0">
                        {post.author?.id ? (
                          <Link
                            className="font-semibold text-slate-950 hover:text-[#0f766e]"
                            href={`/profile/${post.author.id}`}
                          >
                            {post.author.full_name ?? "Travel Xchange member"}
                          </Link>
                        ) : (
                          <p className="font-semibold text-slate-950">
                            Travel Xchange member
                          </p>
                        )}
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {post.author?.headline ??
                            (post.author?.role
                              ? getRoleLabel(post.author.role)
                              : "Group member")}{" "}
                          · {formatDate(post.created_at)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                      {post.content}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <MessageCircle
                    className="mx-auto size-8 text-[#0f766e]"
                    aria-hidden="true"
                  />
                  <h2 className="mt-4 text-lg font-semibold text-slate-950">
                    No posts yet
                  </h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    Start the first discussion in this group.
                  </p>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Group details
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Members</span>
                  <span className="font-semibold text-slate-950">
                    {memberCount}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Posts</span>
                  <span className="font-semibold text-slate-950">
                    {posts.length}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Visibility</span>
                  <span className="font-semibold capitalize text-slate-950">
                    {group.visibility}
                  </span>
                </div>
              </div>
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Coming later
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>Group sponsor slots arrive in Phase 12.</p>
                <p>Moderation tools arrive in Phase 14.</p>
                <p>Group search arrives in Phase 15.</p>
              </div>
            </article>
          </aside>
        </div>
      ) : null}
    </MemberPageShell>
  );
}
