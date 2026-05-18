"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import { groupCategoryOptions, slugifyGroupName } from "@/config/groups";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { GroupCategory, Profile } from "@/types/database";

const phase5SetupMessage =
  "The Phase 5 group tables are not installed yet. Run supabase/phase-5-groups.sql in Supabase, then refresh this page.";

export function GroupCreateForm() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(configured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadViewer = useCallback(async () => {
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

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();

    setViewerProfile(profileData);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadViewer();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadViewer]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !userId) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const category = String(formData.get("category") ?? "general") as GroupCategory;
    const visibility = String(formData.get("visibility") ?? "members") as
      | "public"
      | "members"
      | "private";

    if (!name || !description) {
      setError("Please add a group name and description.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .insert({
        category,
        created_by: userId,
        description,
        name,
        slug: slugifyGroupName(name),
        status: "active",
        visibility,
      })
      .select("id")
      .single();

    if (groupError) {
      setError(
        isMissingTableError(groupError, ["groups"])
          ? phase5SetupMessage
          : groupError.code === "23505"
            ? "A group with this name already exists. Try a slightly different name."
            : groupError.message,
      );
      setIsSaving(false);
      return;
    }

    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: groupData.id,
      role: "owner",
      status: "active",
      user_id: userId,
    });

    if (memberError) {
      setError(
        isMissingTableError(memberError, ["group_members"])
          ? phase5SetupMessage
          : memberError.message,
      );
      setIsSaving(false);
      return;
    }

    router.push(`/groups/${groupData.id}`);
  }

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
      eyebrow="Create group"
      title="Start a Travel Xchange community"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so groups cannot save.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading group form...
        </div>
      ) : null}

      <form
        className="mx-auto max-w-3xl space-y-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={handleSubmit}
      >
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {error}
          </div>
        ) : null}

        <TextField
          label="Group name"
          name="name"
          placeholder="Luxury Cruise Sellers"
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Category"
            name="category"
            options={groupCategoryOptions
              .filter((option) => option.value !== "all")
              .map((option) => ({
                label: option.label,
                value: option.value,
              }))}
          />
          <SelectField
            label="Visibility"
            name="visibility"
            options={[
              { label: "Members only", value: "members" },
              { label: "Public preview", value: "public" },
              { label: "Private", value: "private" },
            ]}
          />
        </div>

        <TextareaField
          hint="Explain who the group is for and what members should discuss."
          label="Description"
          name="description"
          placeholder="A focused group for agents selling luxury cruise holidays."
          required
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "justify-center sm:hidden",
            )}
            href="/groups"
          >
            Back to groups
          </Link>
          <Button
            className="h-11 bg-[#0f766e] px-5 text-white hover:bg-[#115e59]"
            disabled={isSaving}
            type="submit"
          >
            <Plus className="size-4" aria-hidden="true" />
            {isSaving ? "Creating" : "Create group"}
          </Button>
        </div>
      </form>
    </MemberPageShell>
  );
}
