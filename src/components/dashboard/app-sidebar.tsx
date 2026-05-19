import Link from "next/link";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CreditCard,
  GraduationCap,
  HelpCircle,
  Home,
  MessageCircle,
  Newspaper,
  Search,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";

import { isAdminRole } from "@/config/admin";
import { appNavigation } from "@/config/navigation";
import type { Profile } from "@/types/database";

const navIcons = {
  Admin: ShieldCheck,
  Billing: CreditCard,
  Events: CalendarDays,
  Groups: Users,
  Home,
  Jobs: BriefcaseBusiness,
  Messages: MessageCircle,
  News: Newspaper,
  Notifications: Bell,
  Profile: User,
  Search,
  Suppliers: Building2,
  Support: HelpCircle,
  Training: GraduationCap,
  "Xchange Feed": MessageCircle,
};

type AppSidebarProps = {
  activeLabel?: string;
  profile: Profile | null;
};

export function AppSidebar({
  activeLabel = "Xchange Feed",
  profile,
}: AppSidebarProps) {
  const visibleItems = appNavigation.filter(
    (item) => !item.adminOnly || isAdminRole(profile?.role),
  );

  return (
    <aside className="tx-sidebar-bg lg:sticky lg:top-0 lg:h-screen">
      <div className="relative z-10 flex h-full flex-col gap-5 p-5">
        <Link className="flex items-center gap-3" href="/dashboard">
          <span className="tx-brand-x" aria-hidden="true" />
          <span>
            <span className="block text-2xl font-extrabold leading-none tracking-normal text-white">
              Travel
            </span>
            <span className="block text-sm font-semibold uppercase tracking-[0.24em] text-white/90">
              Xchange
            </span>
            <span className="mt-5 block text-xs text-white/68">
              Member platform
            </span>
          </span>
        </Link>

        <div className="h-px bg-white/12" />

        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-col">
          {visibleItems.map((item) => {
            const Icon = navIcons[item.label as keyof typeof navIcons] ?? Home;
            const isLive = item.phase === "Live";
            const isActive = item.label === activeLabel;
            const href =
              item.label === "Profile" && profile?.id
                ? `/profile/${profile.id}`
                : item.label === "Suppliers" && profile?.company_id
                  ? `/suppliers/${profile.company_id}`
                  : item.href;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex min-w-max items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm font-semibold transition",
                  isActive
                    ? "border-[#ff6f38]/80 bg-[linear-gradient(110deg,rgba(245,41,104,0.78),rgba(255,122,47,0.82))] text-white shadow-[0_12px_28px_rgba(245,41,104,0.24)]"
                    : "border-transparent text-white/88 hover:border-white/12 hover:bg-white/10 hover:text-white",
                  !isLive ? "opacity-80" : "",
                ].join(" ")}
                href={href}
                key={item.label}
              >
                <span className="flex items-center gap-3">
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </span>
                {!isLive ? (
                  <span className="hidden rounded bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/58 lg:inline">
                    {item.phase}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="tx-sidebar-identity mt-auto hidden lg:block" aria-hidden="true" />
      </div>
    </aside>
  );
}
