"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, MessageCircle, Plus, Sparkles, TrendingUp, Users } from "lucide-react";
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
            "tx-action hidden sm:inline-flex",
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so groups cannot load.
        </div>
      ) : null}

      <section className="tx-engage-hero overflow-hidden rounded-lg border border-[#b8cae8]/70 bg-white">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg bg-[#fff0f5] px-3 py-1 text-xs font-extrabold uppercase text-[#f52968]">
                <Users className="size-3.5" aria-hidden="true" />
                Communities
              </span>
              <span className="rounded-lg bg-[#eef5ff] px-3 py-1 text-xs font-bold text-[#063b86]">
                Travel trade spaces
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-[#061b4f]">
              Find the right room for every trade conversation.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d6b9e]">
              Join focused spaces for cruise, luxury, compliance, supplier
              updates, homeworkers, marketing, and more.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Cruise", "Luxury", "Supplier Updates", "Homeworkers"].map(
                (topic) => (
                  <span
                    className="rounded-lg border border-[#c8d8ef] bg-white/86 px-3 py-2 text-xs font-bold text-[#061b4f]"
                    key={topic}
                  >
                    {topic}
                  </span>
                ),
              )}
            </div>
          </div>
          <div className="rounded-lg border border-[#d9e4f5] bg-white/88 p-4 shadow-[0_14px_30px_rgba(7,36,91,0.08)]">
            <div className="flex items-center gap-3">
              <div className="tx-navy-avatar flex size-12 items-center justify-center rounded-lg text-white">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-[#061b4f]">
                  Build useful communities
                </p>
                <p className="text-xs font-semibold text-[#4d6b9e]">
                  Groups power niche discussion.
                </p>
              </div>
            </div>
            <Link
              className={cn(
                buttonVariants({ size: "lg" }),
                "tx-action mt-4 w-full",
              )}
              href="/groups/create"
            >
              <Plus className="size-4" aria-hidden="true" />
              Create group
            </Link>
          </div>
        </div>
      </section>

      <div className="tx-card-soft mt-5 flex items-center gap-3 overflow-x-auto p-2">
        <div className="hidden items-center gap-2 px-2 text-xs font-extrabold uppercase text-[#6f86b5] sm:flex">
          <TrendingUp className="size-4" aria-hidden="true" />
          Browse
        </div>
        {groupCategoryOptions.map((category) => (
          <button
            className={cn(
              "min-w-max rounded-lg border px-4 py-2 text-sm font-bold transition",
              activeCategory === category.value
                ? "border-[#ff3d61] bg-white text-[#f52968] shadow-[0_10px_22px_rgba(245,41,104,0.12)]"
                : "border-[#c8d8ef] bg-white/86 text-[#061b4f] hover:border-[#ff7a2f] hover:text-[#f52968]",
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
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="tx-card mt-5 p-6 text-sm text-[#4d6b9e]">
          Loading groups...
        </div>
      ) : null}

      {!isLoading && filteredGroups.length === 0 && !error ? (
        <div className="tx-card mt-5 p-8 text-center">
          <h2 className="text-lg font-extrabold text-[#061b4f]">
            No groups yet
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#4d6b9e]">
            Create the first group for this category.
          </p>
        </div>
      ) : null}

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredGroups.map((group) => (
          <article
            className="tx-card flex flex-col overflow-hidden p-5"
            key={group.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-lg bg-[#fff0f5] px-2 py-1 text-xs font-extrabold text-[#f52968]">
                  {getGroupCategoryLabel(group.category)}
                </span>
                <h2 className="mt-4 text-lg font-extrabold text-[#061b4f]">
                  {group.name}
                </h2>
              </div>
              <div className="tx-navy-avatar flex size-11 shrink-0 items-center justify-center rounded-lg text-white">
                <Users className="size-5" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-3 flex-1 text-sm leading-6 text-[#4d6b9e]">
              {group.description}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#d9e4f5] pt-4 text-sm">
              <div>
                <p className="text-xs font-extrabold uppercase text-[#6f86b5]">
                  Members
                </p>
                <p className="mt-1 font-extrabold text-[#061b4f]">
                  {group.member_count}
                </p>
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase text-[#6f86b5]">
                  Posts
                </p>
                <p className="mt-1 font-extrabold text-[#061b4f]">
                  {group.post_count}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "justify-center border-[#b8cae8] bg-white text-[#061b4f] hover:bg-[#f4f8ff]",
                )}
                href={`/groups/${group.id}`}
              >
                Open
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Button
                className={cn(
                  "h-10",
                  group.is_joined_by_current_user
                    ? "bg-[#061b4f] hover:bg-[#063b86]"
                    : "tx-action",
                )}
                disabled={busyGroupId === group.id}
                onClick={() => handleMembershipToggle(group)}
                type="button"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                {group.is_joined_by_current_user ? "Joined" : "Join"}
              </Button>
            </div>
          </article>
        ))}
      </section>
    </MemberPageShell>
  );
}
