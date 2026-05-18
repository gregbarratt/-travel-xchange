import Link from "next/link";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  GraduationCap,
  HelpCircle,
  Home,
  MessageCircle,
  Newspaper,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";

import { appNavigation } from "@/config/navigation";
import type { Profile } from "@/types/database";

const navIcons = {
  Admin: ShieldCheck,
  Events: CalendarDays,
  Groups: Users,
  Home,
  Jobs: BriefcaseBusiness,
  Messages: MessageCircle,
  News: Newspaper,
  Notifications: Bell,
  Profile: User,
  Suppliers: Building2,
  Support: HelpCircle,
  Training: GraduationCap,
  "Xchange Feed": MessageCircle,
};

type AppSidebarProps = {
  profile: Profile | null;
};

function canSeeAdmin(profile: Profile | null) {
  return Boolean(
    profile?.role &&
      ["admin", "moderator", "super_admin"].includes(profile.role),
  );
}

export function AppSidebar({ profile }: AppSidebarProps) {
  const visibleItems = appNavigation.filter(
    (item) => !item.adminOnly || canSeeAdmin(profile),
  );

  return (
    <aside className="lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-slate-200 lg:bg-white">
      <div className="flex h-full flex-col gap-5 p-4">
        <Link className="flex items-center gap-3" href="/dashboard">
          <span className="flex size-10 items-center justify-center rounded-md bg-[#082f49] text-white">
            TX
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-950">
              Travel Xchange
            </span>
            <span className="block text-xs text-slate-500">
              Member platform
            </span>
          </span>
        </Link>

        <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {visibleItems.map((item) => {
            const Icon = navIcons[item.label as keyof typeof navIcons] ?? Home;
            const isLive = item.phase === "Live";
            const isActive = item.label === "Xchange Feed";

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex min-w-max items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-[#e0f2f1] text-[#0f766e]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                  !isLive ? "opacity-75" : "",
                ].join(" ")}
                href={item.href}
                key={item.label}
              >
                <span className="flex items-center gap-3">
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </span>
                {!isLive ? (
                  <span className="hidden rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 lg:inline">
                    {item.phase}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
