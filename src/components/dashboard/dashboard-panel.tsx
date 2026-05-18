"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  MessageSquareText,
  Newspaper,
  Users,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { buttonVariants } from "@/components/ui/button";
import { getRoleLabel } from "@/config/roles";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

const dashboardModules = [
  {
    title: "Xchange Feed",
    description: "Main social feed arrives in Phase 3.",
    icon: MessageSquareText,
  },
  {
    title: "Profiles",
    description: "Public profile pages arrive in Phase 4.",
    icon: BadgeCheck,
  },
  {
    title: "Groups",
    description: "Community groups arrive in Phase 5.",
    icon: Users,
  },
  {
    title: "Jobs",
    description: "Revenue-ready jobs board arrives in Phase 6.",
    icon: BriefcaseBusiness,
  },
  {
    title: "News",
    description: "Trade news and supplier updates arrive in Phase 7.",
    icon: Newspaper,
  },
  {
    title: "Companies",
    description: "Company and supplier pages arrive in Phase 4.",
    icon: Building2,
  },
];

export function DashboardPanel() {
  const configured = isSupabaseConfigured();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(configured);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  useEffect(() => {
    async function loadDashboard() {
      if (!supabase) {
        return;
      }

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setIsLoading(false);
        return;
      }

      setEmail(userData.user.email ?? null);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .maybeSingle();

      setProfile(profileData);
      setIsLoading(false);
    }

    void loadDashboard();
  }, [supabase]);

  return (
    <div className="space-y-8">
      {!configured ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Preview mode: Supabase is not connected yet. Add `.env.local`, run the
          Phase 2 SQL in Supabase, then restart the app to test real login data.
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-semibold uppercase text-[#0f766e]">
              Member dashboard
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
              {profile?.full_name ? `Welcome, ${profile.full_name}` : "Welcome to Travel Xchange"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              This dashboard is the starting point for the logged-in product.
              Future phases will add the feed, profiles, groups, jobs, news,
              events, training, support, messaging, and admin tools.
            </p>
          </div>
          <LogoutButton />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-[#f8fafc] p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Email
            </p>
            <p className="mt-2 break-words text-sm font-medium text-slate-900">
              {email ?? "Not signed in"}
            </p>
          </div>
          <div className="rounded-lg bg-[#f8fafc] p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Role
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {profile?.role ? getRoleLabel(profile.role) : "Not selected"}
            </p>
          </div>
          <div className="rounded-lg bg-[#f8fafc] p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Onboarding
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {profile?.onboarding_completed ? "Complete" : "Not complete"}
            </p>
          </div>
        </div>

        {!profile?.onboarding_completed && !isLoading ? (
          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-6 bg-[#0f766e] hover:bg-[#115e59]",
            )}
            href="/onboarding"
          >
            Complete onboarding
          </Link>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dashboardModules.map((module) => (
          <article
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            key={module.title}
          >
            <module.icon className="size-6 text-[#0f766e]" aria-hidden="true" />
            <h2 className="mt-5 text-lg font-semibold text-slate-950">
              {module.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {module.description}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
