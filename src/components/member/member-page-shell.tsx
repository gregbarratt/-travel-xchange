"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Bell } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[250px_minmax(0,1fr)]">
        <AppSidebar activeLabel={activeLabel} profile={viewerProfile} />

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-[#0f766e]">
                  {eyebrow}
                </p>
                <h1 className="truncate text-xl font-semibold tracking-normal text-slate-950">
                  {title}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                {actions}
                <Link
                  className="hidden rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 sm:inline-flex"
                  href="/dashboard"
                >
                  Feed
                </Link>
                <Button
                  className="size-9 bg-transparent p-0 text-slate-600 hover:bg-slate-100"
                  title="Notifications placeholder"
                  type="button"
                  variant="ghost"
                >
                  <Bell className="size-4" aria-hidden="true" />
                  <span className="sr-only">Notifications placeholder</span>
                </Button>
                <LogoutButton />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
