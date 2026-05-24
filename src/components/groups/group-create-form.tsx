"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lightbulb, Plus, UsersRound } from "lucide-react";
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
            "hidden border-[#b8cae8] bg-white text-[#061b4f] hover:bg-[#f4f8ff] sm:inline-flex",
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so groups cannot save.
        </div>
      ) : null}

      {isLoading ? (
        <div className="tx-card p-6 text-sm text-[#4d6b9e]">
          Loading group form...
        </div>
      ) : null}

      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form className="tx-card space-y-5 p-5 sm:p-6" onSubmit={handleSubmit}>
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase text-[#063b86]">
              <UsersRound className="size-4" aria-hidden="true" />
              New community
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-[#061b4f]">
              Create a focused travel trade group
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
              Keep the name specific, describe who it is for, and choose the
              right category so members can find it quickly.
            </p>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
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

          <div className="flex flex-col gap-3 border-t border-[#d9e4f5] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "justify-center border-[#b8cae8] bg-white text-[#061b4f] hover:bg-[#f4f8ff] sm:hidden",
              )}
              href="/groups"
            >
              Back to groups
            </Link>
            <Button
              className="tx-action h-11 px-5"
              disabled={isSaving}
              type="submit"
            >
              <Plus className="size-4" aria-hidden="true" />
              {isSaving ? "Creating" : "Create group"}
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="tx-card-soft p-5">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4 text-[#ff7a2f]" aria-hidden="true" />
              <h2 className="text-base font-extrabold text-[#061b4f]">
                Good group ideas
              </h2>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[#4d6b9e]">
              <p>Cruise Sellers</p>
              <p>Luxury Travel</p>
              <p>Disney Specialists</p>
              <p>Marketing for Travel Agents</p>
            </div>
          </section>

          <section className="tx-card-soft p-5">
            <h2 className="text-base font-extrabold text-[#061b4f]">
              Simple rule
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#4d6b9e]">
              A useful group should make it obvious who should join and what
              they should talk about.
            </p>
          </section>
        </aside>
      </div>
    </MemberPageShell>
  );
}
