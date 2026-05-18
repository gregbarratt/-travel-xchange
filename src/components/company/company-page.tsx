"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, ExternalLink, Pencil, Star, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { VerificationBadge } from "@/components/profile/verification-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getCompanyTypeLabel, getRoleLabel } from "@/config/roles";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  Company,
  CompanyFollower,
  Profile,
  VerificationTier,
} from "@/types/database";

type CompanyPageProps = {
  companyId: string;
  variant: "company" | "supplier";
};

const phase4SetupMessage =
  "The Phase 4 company follower table is not installed yet. Run supabase/phase-4-profiles.sql in Supabase, then refresh this page.";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function companyVerificationTier(company: Company): VerificationTier {
  return company.verification_tier;
}

export function CompanyPage({ companyId, variant }: CompanyPageProps) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [team, setTeam] = useState<Profile[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadCompany = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    setViewerId(userData.user.id);

    const [{ data: viewerData }, { data: companyData, error: companyError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
      ]);

    setViewerProfile(viewerData);

    if (companyError) {
      setError(companyError.message);
      setIsLoading(false);
      return;
    }

    if (!companyData) {
      setError("That company could not be found.");
      setIsLoading(false);
      return;
    }

    setCompany(companyData);

    const [teamResult, followersResult, currentFollowerResult] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("company_id", companyId)
          .limit(12),
        supabase
          .from("company_followers")
          .select("id", { count: "exact" })
          .eq("company_id", companyId),
        supabase
          .from("company_followers")
          .select("id")
          .eq("company_id", companyId)
          .eq("user_id", userData.user.id)
          .maybeSingle(),
      ]);

    if (followersResult.error || currentFollowerResult.error) {
      const missingTable = [followersResult.error, currentFollowerResult.error].some(
        (tableError) =>
          tableError &&
          isMissingTableError(tableError, ["company_followers"]),
      );

      setSetupMessage(
        missingTable
          ? phase4SetupMessage
          : followersResult.error?.message ??
              currentFollowerResult.error?.message ??
              null,
      );
    } else {
      setFollowerCount(followersResult.count ?? followersResult.data?.length ?? 0);
      setIsFollowing(Boolean(currentFollowerResult.data));
    }

    setTeam((teamResult.data ?? []) as Profile[]);
    setIsLoading(false);
  }, [companyId, router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCompany();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCompany]);

  async function handleFollowToggle() {
    if (!supabase || !viewerId || !company || viewerId === company.created_by) {
      return;
    }

    setIsBusy(true);

    if (isFollowing) {
      await supabase
        .from("company_followers")
        .delete()
        .eq("company_id", company.id)
        .eq("user_id", viewerId);
      setFollowerCount((current) => Math.max(0, current - 1));
    } else {
      await supabase.from("company_followers").insert({
        company_id: company.id,
        user_id: viewerId,
      } satisfies Partial<CompanyFollower>);
      setFollowerCount((current) => current + 1);
    }

    setIsFollowing((current) => !current);
    setIsBusy(false);
  }

  const isOwner = Boolean(company && viewerId === company.created_by);
  const title = company?.name ?? (variant === "supplier" ? "Supplier" : "Company");

  return (
    <MemberPageShell
      activeLabel={variant === "supplier" ? "Suppliers" : "Profile"}
      actions={
        isOwner ? (
          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "hidden bg-[#0f766e] text-white hover:bg-[#115e59] sm:inline-flex",
            )}
            href="/profile/edit"
          >
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </Link>
        ) : null
      }
      eyebrow={variant === "supplier" ? "Supplier profile" : "Company profile"}
      title={title}
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so company pages cannot load.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading company page...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
          {error}
        </div>
      ) : null}

      {company ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-5">
            <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="h-32 bg-[linear-gradient(120deg,#0f172a,#0f766e)]" />
              <div className="p-5 sm:p-6">
                <div className="-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex items-end gap-4">
                    <div className="flex size-24 items-center justify-center rounded-md border-4 border-white bg-[#e0f2f1] text-2xl font-semibold text-[#0f766e] shadow-sm">
                      {initials(company.name)}
                    </div>
                    <div className="pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
                          {company.name}
                        </h2>
                        <VerificationBadge tier={companyVerificationTier(company)} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {getCompanyTypeLabel(company.company_type)}
                      </p>
                    </div>
                  </div>

                  {isOwner ? (
                    <Link
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "bg-[#0f766e] text-white hover:bg-[#115e59] sm:hidden",
                      )}
                      href="/profile/edit"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      Edit
                    </Link>
                  ) : (
                    <Button
                      className="h-10 bg-[#0f766e] px-4 text-white hover:bg-[#115e59]"
                      disabled={isBusy}
                      onClick={handleFollowToggle}
                      type="button"
                    >
                      <Star className="size-4" aria-hidden="true" />
                      {isFollowing ? "Following" : "Follow"}
                    </Button>
                  )}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Type
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-950">
                      {getCompanyTypeLabel(company.company_type)}
                    </p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Followers
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-950">
                      {followerCount}
                    </p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Status
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-950">
                      {company.status}
                    </p>
                  </div>
                </div>
              </div>
            </article>

            {setupMessage ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                {setupMessage}
              </div>
            ) : null}

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-[#0f766e]" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950">
                  About
                </h2>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-700">
                {company.description ??
                  "This company page is ready for a richer supplier or agency description."}
              </p>
              {company.website_url ? (
                <a
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0f766e] hover:text-[#115e59]"
                  href={company.website_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Visit website
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              ) : null}
            </article>
          </section>

          <aside className="space-y-5">
            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-[#0f766e]" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950">
                  People
                </h2>
              </div>
              {team.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {team.map((member) => (
                    <Link
                      className="block rounded-md border border-slate-100 p-3 hover:bg-slate-50"
                      href={`/profile/${member.id}`}
                      key={member.id}
                    >
                      <p className="font-semibold text-slate-950">
                        {member.full_name ?? "Travel Xchange member"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {getRoleLabel(member.role)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Team members will appear when profiles link to this company.
                </p>
              )}
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Revenue placeholders
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>Supplier spotlight placements arrive in Phase 12.</p>
                <p>Supplier subscription plans arrive in Phase 13.</p>
                <p>Company analytics arrive in Phase 16.</p>
              </div>
            </article>
          </aside>
        </div>
      ) : null}
    </MemberPageShell>
  );
}
