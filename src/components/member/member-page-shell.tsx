"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, Compass, Home, UserRound } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { GlobalSearchBox } from "@/components/search/global-search-box";
import type { Profile } from "@/types/database";

type MemberPageShellProps = {
  actions?: ReactNode;
  activeLabel: string;
  children: ReactNode;
  eyebrow: string;
  title: string;
  viewerProfile: Profile | null;
};

export function MemberPageShell({
  actions,
  activeLabel,
  children,
  eyebrow,
  title,
  viewerProfile,
}: MemberPageShellProps) {
  return (
    <div className="tx-dashboard-bg min-h-screen text-[#061b4f]">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <AppSidebar activeLabel={activeLabel} profile={viewerProfile} />

        <div className="min-w-0">
          <header className="tx-topline sticky top-0 z-20 backdrop-blur">
            <div className="flex flex-col gap-4 px-5 py-4 sm:px-8 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase text-[#063b86]">
                  <Compass className="size-4" aria-hidden="true" />
                  {eyebrow}
                </p>
                <h1 className="mt-1 truncate text-2xl font-extrabold text-[#061b4f]">
                  {title}
                </h1>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center xl:max-w-3xl">
                <GlobalSearchBox
                  className="min-w-0 flex-1"
                  placeholder="Search TX communities, people, jobs..."
                  size="compact"
                />
                {actions}
                <Link
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#b8cae8] bg-white/90 px-3 text-sm font-bold text-[#061b4f] shadow-[0_10px_22px_rgba(7,36,91,0.08)] hover:bg-white"
                  href="/dashboard"
                >
                  <Home className="size-4" aria-hidden="true" />
                  Feed
                </Link>
                {viewerProfile?.id ? (
                  <Link
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#b8cae8] bg-white/90 px-3 text-sm font-bold text-[#061b4f] shadow-[0_10px_22px_rgba(7,36,91,0.08)] hover:bg-white"
                    href={`/profile/${viewerProfile.id}`}
                  >
                    <UserRound className="size-4" aria-hidden="true" />
                    Profile
                  </Link>
                ) : null}
                <Link
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-[#061b4f] hover:bg-white/80"
                  href="/notifications"
                  title="Notifications"
                >
                  <Bell className="size-4" aria-hidden="true" />
                  <span className="sr-only">Notifications</span>
                </Link>
                <LogoutButton />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1520px] px-5 py-6 sm:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
