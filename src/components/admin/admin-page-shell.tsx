"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { adminNavigation, isAdminRole } from "@/config/admin";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

type AdminPageShellProps = {
  activeHref: string;
  children: (context: {
    userId: string;
    viewerProfile: Profile;
  }) => ReactNode;
  description: string;
  title: string;
};

export const phase14SetupMessage =
  "The Phase 14 admin tables are not installed yet. Run supabase/phase-14-admin.sql in Supabase, then refresh this page.";

export function AdminPageShell({
  activeHref,
  children,
  description,
  title,
}: AdminPageShellProps) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadAdmin = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    setUserId(userData.user.id);

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      setIsLoading(false);
      return;
    }

    setViewerProfile(profileData as Profile | null);
    setError(null);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAdmin();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAdmin]);

  return (
    <MemberPageShell
      activeLabel="Admin"
      eyebrow="Admin"
      title={title}
      viewerProfile={viewerProfile}
    >
      <div className="space-y-5">
        <section className="tx-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-[#063b86]" aria-hidden="true" />
                <p className="text-xs font-extrabold uppercase tracking-wide text-[#063b86]">
                  Owner controls
                </p>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d6b9e]">
                {description}
              </p>
            </div>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {adminNavigation.map((item) => (
              <Link
                aria-current={activeHref === item.href ? "page" : undefined}
                className={cn(
                  "min-w-max rounded-lg border px-3 py-2 text-sm font-bold transition",
                  activeHref === item.href
                    ? "border-[#f52968] bg-white text-[#f52968] shadow-sm"
                    : "border-[#d9e4f5] bg-white/70 text-[#061b4f] hover:border-[#b8cae8] hover:bg-[#eef5ff]",
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </section>

        {!configured ? (
          <div className="tx-card border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Supabase is not configured yet. Add your Supabase keys to
            .env.local, then restart the local app.
          </div>
        ) : null}

        {isLoading ? (
          <div className="tx-card p-6 text-sm text-[#4d6b9e]">
            Loading admin controls...
          </div>
        ) : null}

        {error ? (
          <div className="tx-card border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            {error}
          </div>
        ) : null}

        {!isLoading && viewerProfile && !isAdminRole(viewerProfile.role) ? (
          <div className="tx-card p-8 text-center">
            <h2 className="text-xl font-extrabold text-[#061b4f]">
              Admin access only
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#4d6b9e]">
              Your account is logged in, but it has not been marked as an admin
              or moderator yet. We will set your owner role in Supabase during
              the Phase 14 test.
            </p>
          </div>
        ) : null}

        {!isLoading && viewerProfile && userId && isAdminRole(viewerProfile.role)
          ? children({ userId, viewerProfile })
          : null}
      </div>
    </MemberPageShell>
  );
}
