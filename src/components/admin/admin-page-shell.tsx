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

    if (!profileData || !isAdminRole(profileData.role)) {
      router.replace("/dashboard");
      setViewerProfile(null);
      setUserId(null);
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

  if (!configured) {
    return (
      <AdminAccessStatus
        title="Setup needed"
        message="Supabase is not configured yet. Add your Supabase keys to .env.local, then restart the local app."
      />
    );
  }

  if (error) {
    return <AdminAccessStatus title="Access check failed" message={error} />;
  }

  if (isLoading || !viewerProfile || !userId) {
    return (
      <AdminAccessStatus
        title="Checking access"
        message="Checking whether this account can open this area."
      />
    );
  }

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

        {children({ userId, viewerProfile })}
      </div>
    </MemberPageShell>
  );
}

function AdminAccessStatus({
  message,
  title,
}: {
  message: string;
  title: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f9fd] px-5 text-[#061b4f]">
      <section className="w-full max-w-md rounded-xl border border-[#d9e4f5] bg-white p-6 text-center shadow-[0_18px_55px_rgba(6,27,79,0.1)]">
        <ShieldCheck className="mx-auto size-8 text-[#063b86]" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">{message}</p>
      </section>
    </main>
  );
}
