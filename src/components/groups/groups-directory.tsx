"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { getGroupCategoryLabel, groupCategoryOptions } from "@/config/groups";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  Group,
  GroupCategory,
  GroupMember,
  GroupPost,
  GroupWithStats,
  Profile,
} from "@/types/database";

type CategoryFilter = GroupCategory | "all";

const phase5SetupMessage =
  "The Phase 5 group tables are not installed yet. Run supabase/phase-5-groups.sql in Supabase, then refresh this page.";

function isMissingGroupsTable(error: { code?: string; message?: string }) {
  return isMissingTableError(error, ["groups", "group_members", "group_posts"]);
}

function countByGroupId(rows: Array<{ group_id: string }>) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.group_id] = (counts[row.group_id] ?? 0) + 1;
    return counts;
  }, {});
}

export function GroupsDirectory() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupWithStats[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [isLoading, setIsLoading] = useState(configured);
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadGroups = useCallback(async () => {
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

    const [{ data: profileData }, { data: groupRows, error: groupsError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase
          .from("groups")
          .select("*")
          .eq("status", "active")
          .order("name", { ascending: true }),
      ]);

    setViewerProfile(profileData);

    if (groupsError) {
      setError(isMissingGroupsTable(groupsError) ? phase5SetupMessage : groupsError.message);
      setGroups([]);
      setIsLoading(false);
      return;
    }

    const typedGroups = (groupRows ?? []) as Group[];
    const groupIds = typedGroups.map((group) => group.id);

    if (groupIds.length === 0) {
      setGroups([]);
      setIsLoading(false);
      return;
    }

    const [membersResult, postsResult] = await Promise.all([
      supabase
        .from("group_members")
        .select("group_id, user_id, status")
        .in("group_id", groupIds),
      supabase
        .from("group_posts")
        .select("group_id, status")
        .in("group_id", groupIds),
    ]);

    if (membersResult.error || postsResult.error) {
      const issue = membersResult.error ?? postsResult.error;
      setError(issue && isMissingGroupsTable(issue) ? phase5SetupMessage : issue?.message ?? null);
      setGroups([]);
      setIsLoading(false);
      return;
    }

    const activeMembers = ((membersResult.data ?? []) as Pick<
      GroupMember,
      "group_id" | "status" | "user_id"
    >[]).filter((member) => member.status === "active");
    const publishedPosts = ((postsResult.data ?? []) as Pick<
      GroupPost,
      "group_id" | "status"
    >[]).filter((post) => post.status === "published");
    const memberCounts = countByGroupId(activeMembers);
    const postCounts = countByGroupId(publishedPosts);
    const joinedGroupIds = new Set(
      activeMembers
        .filter((member) => member.user_id === userData.user.id)
        .map((member) => member.group_id),
    );

    setGroups(
      typedGroups.map((group) => ({
        ...group,
        is_joined_by_current_user: joinedGroupIds.has(group.id),
        member_count: memberCounts[group.id] ?? 0,
        post_count: postCounts[group.id] ?? 0,
      })),
    );
    setError(null);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadGroups();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadGroups]);

  async function handleMembershipToggle(group: GroupWithStats) {
    if (!supabase || !userId) {
      return;
    }

    setBusyGroupId(group.id);

    if (group.is_joined_by_current_user) {
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

    setBusyGroupId(null);
    await loadGroups();
  }

  const filteredGroups =
    activeCategory === "all"
      ? groups
      : groups.filter((group) => group.category === activeCategory);

  return (
    <MemberPageShell
      activeLabel="Groups"
      actions={
        <Link
          className={cn(
            buttonVariants({ size: "lg" }),
            "hidden bg-[#0f766e] text-white hover:bg-[#115e59] sm:inline-flex",
          )}
          href="/groups/create"
        >
          <Plus className="size-4" aria-hidden="true" />
          Create group
        </Link>
      }
      eyebrow="Groups"
      title="Community groups"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so groups cannot load.
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Find your trade community
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Join focused spaces for cruise, luxury, compliance, supplier
              updates, homeworkers, marketing, and more.
            </p>
          </div>
          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-[#0f766e] text-white hover:bg-[#115e59] sm:hidden",
            )}
            href="/groups/create"
          >
            <Plus className="size-4" aria-hidden="true" />
            Create group
          </Link>
        </div>
      </section>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {groupCategoryOptions.map((category) => (
          <button
            className={cn(
              "min-w-max rounded-md border px-3 py-2 text-sm font-medium transition",
              activeCategory === category.value
                ? "border-[#0f766e] bg-[#e0f2f1] text-[#0f766e]"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
            key={category.value}
            onClick={() => setActiveCategory(category.value)}
            type="button"
          >
            {category.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading groups...
        </div>
      ) : null}

      {!isLoading && filteredGroups.length === 0 && !error ? (
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            No groups yet
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Create the first group for this category.
          </p>
        </div>
      ) : null}

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredGroups.map((group) => (
          <article
            className="flex flex-col rounded-md border border-slate-200 bg-white p-5 shadow-sm"
            key={group.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-md bg-[#e0f2f1] px-2 py-1 text-xs font-semibold text-[#0f766e]">
                  {getGroupCategoryLabel(group.category)}
                </span>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">
                  {group.name}
                </h2>
              </div>
              <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#082f49] text-white">
                <Users className="size-5" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
              {group.description}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Members
                </p>
                <p className="mt-1 font-semibold text-slate-950">
                  {group.member_count}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Posts
                </p>
                <p className="mt-1 font-semibold text-slate-950">
                  {group.post_count}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "justify-center bg-white",
                )}
                href={`/groups/${group.id}`}
              >
                Open
              </Link>
              <Button
                className={cn(
                  "h-10",
                  group.is_joined_by_current_user
                    ? "bg-[#082f49] hover:bg-[#0c4a6e]"
                    : "bg-[#0f766e] hover:bg-[#115e59]",
                )}
                disabled={busyGroupId === group.id}
                onClick={() => handleMembershipToggle(group)}
                type="button"
              >
                {group.is_joined_by_current_user ? "Joined" : "Join"}
              </Button>
            </div>
          </article>
        ))}
      </section>
    </MemberPageShell>
  );
}
