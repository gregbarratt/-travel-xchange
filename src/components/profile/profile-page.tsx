"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, MapPin, Pencil, UserPlus } from "lucide-react";
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
  Follow,
  Profile,
  ProfileExperience,
  ProfileSpecialism,
} from "@/types/database";

type ProfilePageProps = {
  profileId: string;
};

const phase4SetupMessage =
  "The Phase 4 profile tables are not installed yet. Run supabase/phase-4-profiles.sql in Supabase, then refresh this page.";

function initials(name: string | null) {
  return (name ?? "Travel Xchange")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ProfilePage({ profileId }: ProfilePageProps) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [experience, setExperience] = useState<ProfileExperience[]>([]);
  const [specialisms, setSpecialisms] = useState<ProfileSpecialism[]>([]);
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

  const loadProfile = useCallback(async () => {
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

    const [{ data: viewerData }, { data: profileData, error: profileError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase.from("profiles").select("*").eq("id", profileId).maybeSingle(),
      ]);

    setViewerProfile(viewerData);

    if (profileError) {
      setError(profileError.message);
      setIsLoading(false);
      return;
    }

    if (!profileData) {
      setError("That profile could not be found.");
      setIsLoading(false);
      return;
    }

    setProfile(profileData);

    const requests = [
      supabase
        .from("profile_experience")
        .select("*")
        .eq("profile_id", profileId)
        .order("display_order", { ascending: true })
        .order("start_date", { ascending: false }),
      supabase
        .from("profile_specialisms")
        .select("*")
        .eq("profile_id", profileId)
        .order("name", { ascending: true }),
      supabase
        .from("follows")
        .select("id")
        .eq("follower_id", userData.user.id)
        .eq("following_id", profileId)
        .maybeSingle(),
    ] as const;

    const [experienceResult, specialismsResult, followResult] =
      await Promise.all(requests);

    if (experienceResult.error || specialismsResult.error) {
      const missingTable = [experienceResult.error, specialismsResult.error].some(
        (tableError) =>
          tableError &&
          isMissingTableError(tableError, [
            "profile_experience",
            "profile_specialisms",
          ]),
      );

      setSetupMessage(
        missingTable
          ? phase4SetupMessage
          : experienceResult.error?.message ??
              specialismsResult.error?.message ??
              null,
      );
    } else {
      setExperience((experienceResult.data ?? []) as ProfileExperience[]);
      setSpecialisms((specialismsResult.data ?? []) as ProfileSpecialism[]);
    }

    setIsFollowing(Boolean(followResult.data));

    if (profileData.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profileData.company_id)
        .maybeSingle();

      setCompany(companyData);
    }

    setIsLoading(false);
  }, [profileId, router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProfile]);

  async function handleFollowToggle() {
    if (!supabase || !viewerId || !profile || viewerId === profile.id) {
      return;
    }

    setIsBusy(true);

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", viewerId)
        .eq("following_id", profile.id);
    } else {
      await supabase.from("follows").insert({
        follower_id: viewerId,
        following_id: profile.id,
      } satisfies Partial<Follow>);
    }

    setIsFollowing((current) => !current);
    setIsBusy(false);
  }

  const isOwnProfile = viewerId === profileId;
  const pageTitle = profile?.full_name ?? "Member profile";

  return (
    <MemberPageShell
      activeLabel="Profile"
      actions={
        isOwnProfile ? (
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
      eyebrow="Profile"
      title={pageTitle}
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so live profiles cannot load.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading profile...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
          {error}
        </div>
      ) : null}

      {profile ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-5">
            <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
              <div
                className="h-44 bg-[linear-gradient(120deg,#061b4f,#0f766e)] bg-cover bg-center"
                style={
                  profile.cover_image_url
                    ? { backgroundImage: `url(${profile.cover_image_url})` }
                    : undefined
                }
              />
              <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="-mt-14 flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-md border-4 border-white bg-[#e0f2f1] text-2xl font-semibold text-[#0f766e] shadow-sm">
                      {profile.avatar_url ? (
                        <img
                          alt=""
                          className="size-full object-cover"
                          src={profile.avatar_url}
                        />
                      ) : (
                        initials(profile.full_name)
                      )}
                    </div>
                    <div className="sm:pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
                          {profile.full_name ?? "Travel Xchange member"}
                        </h2>
                        <VerificationBadge tier={profile.verification_tier} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {profile.headline ?? getRoleLabel(profile.role)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!isOwnProfile ? (
                      <Button
                        className="h-10 bg-[#0f766e] px-4 text-white hover:bg-[#115e59]"
                        disabled={isBusy}
                        onClick={handleFollowToggle}
                        type="button"
                      >
                        <UserPlus className="size-4" aria-hidden="true" />
                        {isFollowing ? "Following" : "Connect"}
                      </Button>
                    ) : (
                      <Link
                        className={cn(
                          buttonVariants({ size: "lg" }),
                          "bg-[#0f766e] text-white hover:bg-[#115e59] sm:hidden",
                        )}
                        href="/profile/edit"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        Edit profile
                      </Link>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Role
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-950">
                      {getRoleLabel(profile.role)}
                    </p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Location
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-950">
                      {profile.location ?? "Not added yet"}
                    </p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Company
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-950">
                      {company?.name ?? "Not linked yet"}
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
              <h2 className="text-lg font-semibold text-slate-950">
                Experience
              </h2>
              {experience.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {experience.map((item) => {
                    const startDate = formatDate(item.start_date);
                    const endDate = item.is_current
                      ? "Present"
                      : formatDate(item.end_date);

                    return (
                      <div
                        className="border-l-2 border-[#0f766e] pl-4"
                        key={item.id}
                      >
                        <h3 className="font-semibold text-slate-950">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {item.company_name ?? "Travel industry"}
                        </p>
                        {startDate || endDate ? (
                          <p className="mt-1 text-xs font-medium uppercase text-slate-500">
                            {[startDate, endDate].filter(Boolean).join(" - ")}
                          </p>
                        ) : null}
                        {item.description ? (
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Experience will appear here once it is added.
                </p>
              )}
            </article>
          </section>

          <aside className="space-y-5">
            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Specialisms
              </h2>
              {specialisms.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {specialisms.map((specialism) => (
                    <span
                      className="rounded-md bg-[#e0f2f1] px-3 py-2 text-sm font-medium text-[#0f766e]"
                      key={specialism.id}
                    >
                      {specialism.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Add cruise, luxury, touring, destination, or system expertise
                  from the edit profile page.
                </p>
              )}
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-[#0f766e]" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950">
                  Company
                </h2>
              </div>
              {company ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="font-semibold text-slate-950">{company.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {getCompanyTypeLabel(company.company_type)}
                    </p>
                  </div>
                  {company.description ? (
                    <p className="text-sm leading-6 text-slate-700">
                      {company.description}
                    </p>
                  ) : null}
                  <Link
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "w-full justify-center",
                    )}
                    href={`/companies/${company.id}`}
                  >
                    View company page
                  </Link>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  No company is linked to this profile yet.
                </p>
              )}
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <MapPin className="size-5 text-[#0f766e]" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950">
                  Verification
                </h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Verification review and richer badges will expand in the admin
                phases. This badge is the current placeholder state.
              </p>
            </article>
          </aside>
        </div>
      ) : null}
    </MemberPageShell>
  );
}
