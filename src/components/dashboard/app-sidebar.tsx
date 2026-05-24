import Link from "next/link";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Compass,
  CreditCard,
  GraduationCap,
  HelpCircle,
  Home,
  MessageCircle,
  Newspaper,
  PlusCircle,
  Search,
  ShieldCheck,
  Sparkles,
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
};

type AppSidebarProps = {
  activeLabel?: string;
  profile: Profile | null;
};

const navSections = [
  {
    label: "Discover",
    items: ["Home", "Search", "Groups", "News"],
  },
  {
    label: "Trade tools",
    items: ["Jobs", "Events", "Training", "Suppliers", "Support"],
  },
  {
    label: "My workspace",
    items: ["Messages", "Notifications", "Profile", "Billing", "Admin"],
  },
];

const communityShortcuts = [
  "Cruise Sellers",
  "Luxury Travel",
  "Supplier Updates",
  "Homeworkers",
];

export function AppSidebar({
  activeLabel = "Home",
  profile,
}: AppSidebarProps) {
  const visibleItems = appNavigation.filter(
    (item) => !item.adminOnly || isAdminRole(profile?.role),
  );
  const visibleItemMap = new Map(visibleItems.map((item) => [item.label, item]));

  return (
    <aside className="tx-sidebar-bg lg:sticky lg:top-0 lg:h-screen">
      <div className="relative z-10 flex h-full flex-col gap-5 p-4">
        <Link className="flex items-center gap-3 rounded-lg px-2 py-2" href="/dashboard">
          <span className="tx-brand-x" aria-hidden="true" />
          <span>
            <span className="block text-2xl font-extrabold leading-none text-white">
              Travel
            </span>
            <span className="block text-sm font-semibold uppercase tracking-[0.24em] text-white/90">
              Xchange
            </span>
            <span className="mt-2 block text-xs font-semibold text-white/68">
              Community hub
            </span>
          </span>
        </Link>

        <div className="h-px bg-white/12" />

        <Link
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-extrabold text-[#061b4f] shadow-[0_14px_26px_rgba(2,17,48,0.18)] transition hover:bg-[#fff4f7]"
          href="#post-content"
        >
          <PlusCircle className="size-4 text-[#f52968]" aria-hidden="true" />
          Start a conversation
        </Link>

        <nav className="space-y-5">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-2 text-[11px] font-extrabold uppercase text-white/48">
                {section.label}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-col">
                {section.items
                  .map((label) => visibleItemMap.get(label))
                  .filter(Boolean)
                  .map((item) => {
                    if (!item) {
                      return null;
                    }

                    const Icon =
                      navIcons[item.label as keyof typeof navIcons] ?? Home;
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
                            : "border-transparent text-white/86 hover:border-white/14 hover:bg-white/10 hover:text-white",
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
              </div>
            </div>
          ))}
        </nav>

        <section className="hidden rounded-lg border border-white/12 bg-white/8 p-3 lg:block">
          <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase text-white/58">
            <Compass className="size-4" aria-hidden="true" />
            My communities
          </div>
          <div className="space-y-1">
            {communityShortcuts.map((community) => (
              <Link
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-white/82 transition hover:bg-white/10 hover:text-white"
                href="/groups"
                key={community}
              >
                <Sparkles className="size-3.5 text-[#ff9b45]" aria-hidden="true" />
                {community}
              </Link>
            ))}
          </div>
        </section>

        <div className="tx-sidebar-identity mt-auto hidden lg:block" aria-hidden="true" />
      </div>
    </aside>
  );
}
