"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Bell,
  Building2,
  BriefcaseBusiness,
  ChevronDown,
  GraduationCap,
  Home,
  Menu,
  MessagesSquare,
  Newspaper,
  Settings2,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { GlobalSearchBox } from "@/components/search/global-search-box";
import { ContextLane, type LaneItem } from "@/components/tx/context-lane";
import {
  getWorkspacesForProfile,
  isSubItemActive,
  resolveActiveAreaId,
  resolveWorkspaceForPath,
  subItemHref,
  type NavArea,
  type NavIconKey,
  type Workspace,
} from "@/components/tx/workspace-nav";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

/**
 * The Travel Xchange workspace shell.
 *
 * One shell, every signed-in screen. Built to the wireframe atlas: a 64px
 * icon rail with the brand at the top and the member at the bottom, a flyout
 * that pins open on click and lists that area's pages with a line of
 * explanation each, a 60px slate top bar carrying search, the workspace
 * context, the switcher, notifications and exactly one primary action, and a
 * pane that caps at 1120px with an optional 296px context lane.
 *
 * Two rules the atlas is specific about, and which the tests pin down:
 *   - the active state follows the page, not the click;
 *   - hovering previews an area, clicking commits to it.
 */

const icons: Record<NavIconKey, typeof Home> = {
  community: MessagesSquare,
  home: Home,
  jobs: BriefcaseBusiness,
  learn: GraduationCap,
  news: Newspaper,
  pages: Building2,
  settings: Settings2,
  shield: ShieldCheck,
  suppliers: Store,
};

export type WorkspaceShellProps = {
  children: ReactNode;
  /** Small label above the page title. */
  eyebrow: string;
  title: string;
  /** Page-level controls, shown next to the primary action. */
  actions?: ReactNode;
  /** Context lane items. Feed-like pages only; capped at six. */
  lane?: LaneItem[];
  laneHeading?: string;
  profile: Profile | null;
};

function initialsFor(profile: Profile | null) {
  const name = profile?.full_name?.trim();

  if (!name) {
    return "TX";
  }

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function WorkspaceShell({
  actions,
  children,
  eyebrow,
  lane,
  laneHeading,
  profile,
  title,
}: WorkspaceShellProps) {
  const pathname = usePathname() ?? "/dashboard";
  const flyoutId = useId();

  const workspaces = useMemo(() => getWorkspacesForProfile(profile), [profile]);
  const workspace = useMemo(
    () => resolveWorkspaceForPath(workspaces, pathname),
    [pathname, workspaces],
  );

  // Pinned by a click; previewed by a hover. The preview never survives the
  // pointer leaving, and never becomes the active state.
  //
  // Every open menu records the path it was opened on, so navigating closes it
  // by simply no longer matching. That keeps the shell free of effects that
  // reset state, and a pinned flyout can never follow the member to the next
  // page.
  const [pinned, setPinned] = useState<{ areaId: string; path: string } | null>(null);
  const [previewAreaId, setPreviewAreaId] = useState<string | null>(null);
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const [switcherPath, setSwitcherPath] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const pinnedAreaId = pinned?.path === pathname ? pinned.areaId : null;
  const isDrawerOpen = drawerPath === pathname;
  const isSwitcherOpen = switcherPath === pathname;

  const railRef = useRef<HTMLDivElement | null>(null);
  const switcherRef = useRef<HTMLDivElement | null>(null);

  // Read from the URL rather than useSearchParams, which would force every
  // page using this shell out of static rendering.
  useEffect(() => {
    const read = () =>
      setActiveTab(new URLSearchParams(window.location.search).get("tab"));

    const timeoutId = window.setTimeout(read, 0);
    window.addEventListener("popstate", read);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("popstate", read);
    };
  }, [pathname]);

  const activeAreaId = useMemo(
    () => resolveActiveAreaId(workspace.areas, pathname),
    [pathname, workspace.areas],
  );

  const visibleAreaId = pinnedAreaId ?? previewAreaId;
  const visibleArea = workspace.areas.find((area) => area.id === visibleAreaId) ?? null;

  const closeMenus = useCallback(() => {
    setPinned(null);
    setPreviewAreaId(null);
    setSwitcherPath(null);
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (railRef.current?.contains(target) || switcherRef.current?.contains(target)) {
        return;
      }

      closeMenus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenus();
        setDrawerPath(null);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMenus]);

  const handleAreaClick = useCallback(
    (area: NavArea) => {
      if (!area.items || area.items.length === 0) {
        // An area with no sub-pages navigates only.
        setPinned(null);
        setPreviewAreaId(null);
        return;
      }

      // A click both pins the menu and navigates; a second click unpins.
      setPinned((current) =>
        current?.areaId === area.id && current.path === pathname
          ? null
          : { areaId: area.id, path: pathname },
      );
    },
    [pathname],
  );

  return (
    <div className="tx-dashboard-bg min-h-screen text-[var(--tx-text)]">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--tx-surface)] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:shadow-[var(--tx-shadow)]"
        href="#tx-main"
      >
        Skip to content
      </a>

      <div className="flex min-h-screen">
        {/* ---------------------------------------------------------------
            Rail. Desktop only; below lg the drawer in the top bar takes over
            rather than the rail being squeezed into a narrow column.
        --------------------------------------------------------------- */}
        <div
          className="relative z-30 hidden lg:block"
          onMouseLeave={() => setPreviewAreaId(null)}
          ref={railRef}
        >
          <nav
            aria-label="Workspace areas"
            className="tx-rail sticky top-0 flex h-screen flex-col items-center gap-1 py-3"
          >
            <Link
              aria-label="Travel Xchange home"
              className="mb-2 flex size-11 items-center justify-center rounded-[var(--tx-radius)] hover:bg-[var(--tx-shell-hover)]"
              href="/dashboard"
            >
              <span className="tx-brand-x" aria-hidden="true" />
            </Link>

            {workspace.areas.map((area) => {
              const Icon = icons[area.icon];
              const hasItems = Boolean(area.items?.length);

              return (
                <Link
                  aria-controls={hasItems ? flyoutId : undefined}
                  aria-current={activeAreaId === area.id ? "page" : undefined}
                  aria-expanded={hasItems ? pinnedAreaId === area.id : undefined}
                  className="tx-rail-button"
                  data-active={activeAreaId === area.id}
                  href={area.href}
                  key={area.id}
                  onClick={() => handleAreaClick(area)}
                  onFocus={() => setPreviewAreaId(hasItems ? area.id : null)}
                  onMouseEnter={() => setPreviewAreaId(hasItems ? area.id : null)}
                  title={area.label}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  <span className="sr-only">{area.label}</span>
                </Link>
              );
            })}

            <div className="mt-auto flex flex-col items-center gap-1">
              <Link
                aria-label="Your profile"
                className="tx-rail-button"
                href={profile?.id ? `/profile/${profile.id}` : "/profile/edit"}
                title="Your profile"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-[var(--tx-shell-raised)] text-xs font-bold text-[var(--tx-shell-text)]">
                  {initialsFor(profile)}
                </span>
              </Link>
            </div>
          </nav>

          {/* Flyout: the area's pages, each with a line saying what it is for. */}
          {visibleArea?.items?.length ? (
            <div
              aria-label={`${visibleArea.label} pages`}
              className="tx-flyout absolute left-[calc(var(--tx-rail-width)+8px)] top-3 z-40 w-80 p-2"
              id={flyoutId}
              onMouseEnter={() => setPreviewAreaId(visibleArea.id)}
            >
              <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-[var(--tx-text-subtle)]">
                {visibleArea.label}
              </p>
              <ul>
                {visibleArea.items.map((item) => {
                  const active = isSubItemActive(item, pathname, activeTab);

                  return (
                    <li key={`${item.href}-${item.label}`}>
                      <Link
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "block rounded-[var(--tx-radius-sm)] px-3 py-2 transition",
                          active
                            ? "bg-[var(--tx-accent-soft)]"
                            : "hover:bg-[var(--tx-surface-hover)]",
                        )}
                        href={subItemHref(item)}
                      >
                        <span
                          className={cn(
                            "block text-sm font-bold",
                            active ? "text-[var(--tx-accent)]" : "text-[var(--tx-text)]",
                          )}
                        >
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-[var(--tx-text-muted)]">
                          {item.description}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* -------------------------------------------------------------
              Top bar: 60px, the slate band. One primary action, never two.
          ------------------------------------------------------------- */}
          <header className="tx-shell-band sticky top-0 z-20 flex h-[var(--tx-topbar-height)] items-center gap-3 border-b border-[var(--tx-shell-border)] px-3 sm:px-5">
            <button
              aria-expanded={isDrawerOpen}
              aria-label="Open navigation"
              className="tx-rail-button lg:hidden"
              onClick={() => setDrawerPath((open) => (open === pathname ? null : pathname))}
              type="button"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>

            <div className="relative hidden shrink-0 sm:block" ref={switcherRef}>
              {workspaces.length > 1 ? (
                <>
                  <button
                    aria-expanded={isSwitcherOpen}
                    aria-label={`Workspace: ${workspace.label}. Switch workspace`}
                    className="flex h-9 items-center gap-1.5 rounded-[var(--tx-radius-sm)] px-2 text-sm font-bold text-[var(--tx-shell-text)] hover:bg-[var(--tx-shell-hover)]"
                    onClick={() => setSwitcherPath((open) => (open === pathname ? null : pathname))}
                    type="button"
                  >
                    <span className="max-w-[13rem] truncate">{workspace.contextLabel}</span>
                    <ChevronDown className="size-4" aria-hidden="true" />
                  </button>
                  {isSwitcherOpen ? (
                    <div className="tx-flyout absolute left-0 top-11 z-40 w-64 p-1.5">
                      <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-[var(--tx-text-subtle)]">
                        Your workspaces
                      </p>
                      {workspaces.map((entry: Workspace) => (
                        <Link
                          className={cn(
                            "block rounded-[var(--tx-radius-sm)] px-2 py-2 text-sm font-bold transition",
                            entry.id === workspace.id
                              ? "bg-[var(--tx-accent-soft)] text-[var(--tx-accent)]"
                              : "text-[var(--tx-text)] hover:bg-[var(--tx-surface-hover)]",
                          )}
                          href={entry.areas[0].href}
                          key={entry.id}
                        >
                          {entry.contextLabel}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <span className="hidden px-2 text-sm font-bold text-[var(--tx-shell-text)] sm:block">
                  {workspace.contextLabel}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 sm:max-w-lg">
              <GlobalSearchBox
                className="min-w-0"
                placeholder="Search Travel Xchange"
                size="compact"
              />
            </div>

            {actions}

            <Link
              className="hidden h-9 shrink-0 items-center gap-2 rounded-[var(--tx-radius-sm)] bg-[var(--tx-accent)] px-3 text-sm font-bold text-white hover:bg-[var(--tx-accent-hover)] sm:inline-flex"
              href={workspace.primaryAction.href}
            >
              {workspace.primaryAction.label}
            </Link>

            <Link
              aria-label="Notifications"
              className="tx-rail-button size-9 shrink-0"
              href="/notifications"
            >
              <Bell className="size-4" aria-hidden="true" />
            </Link>

            <LogoutButton />
          </header>

          {/* Mobile drawer. The rail's areas as a real list, not a squeeze. */}
          {isDrawerOpen ? (
            <div className="fixed inset-0 z-40 lg:hidden">
              <button
                aria-label="Close navigation"
                className="absolute inset-0 bg-[rgba(16,27,39,0.55)]"
                onClick={() => setDrawerPath(null)}
                type="button"
              />
              <nav
                aria-label="Workspace areas"
                className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col overflow-y-auto bg-[var(--tx-surface)] p-4 shadow-[var(--tx-shadow-lg)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--tx-text)]">
                    {workspace.contextLabel}
                  </span>
                  <button
                    aria-label="Close navigation"
                    className="rounded-[var(--tx-radius-sm)] p-2 hover:bg-[var(--tx-surface-hover)]"
                    onClick={() => setDrawerPath(null)}
                    type="button"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>

                {workspace.areas.map((area) => {
                  const Icon = icons[area.icon];

                  return (
                    <div className="mt-4" key={area.id}>
                      <Link
                        aria-current={activeAreaId === area.id ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 rounded-[var(--tx-radius-sm)] px-2 py-2 text-sm font-extrabold",
                          activeAreaId === area.id
                            ? "bg-[var(--tx-accent-soft)] text-[var(--tx-accent)]"
                            : "text-[var(--tx-text)]",
                        )}
                        href={area.href}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                        {area.label}
                      </Link>
                      {area.items?.length ? (
                        <ul className="mt-1 space-y-0.5 pl-8">
                          {area.items.map((item) => (
                            <li key={`${item.href}-${item.label}`}>
                              <Link
                                aria-current={
                                  isSubItemActive(item, pathname, activeTab) ? "page" : undefined
                                }
                                className="block rounded-[var(--tx-radius-sm)] px-2 py-1.5 text-sm font-semibold text-[var(--tx-text-muted)] hover:bg-[var(--tx-surface-hover)]"
                                href={subItemHref(item)}
                              >
                                {item.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}

                <Link
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-[var(--tx-radius-sm)] bg-[var(--tx-accent)] px-3 text-sm font-bold text-white"
                  href={workspace.primaryAction.href}
                >
                  {workspace.primaryAction.label}
                </Link>

                {workspaces.length > 1 ? (
                  <div className="mt-6 border-t border-[var(--tx-border)] pt-4">
                    <p className="px-2 text-xs font-bold uppercase tracking-wide text-[var(--tx-text-subtle)]">
                      Your workspaces
                    </p>
                    {workspaces.map((entry) => (
                      <Link
                        className={cn(
                          "mt-1 block rounded-[var(--tx-radius-sm)] px-2 py-2 text-sm font-bold",
                          entry.id === workspace.id
                            ? "bg-[var(--tx-accent-soft)] text-[var(--tx-accent)]"
                            : "text-[var(--tx-text)] hover:bg-[var(--tx-surface-hover)]",
                        )}
                        href={entry.areas[0].href}
                        key={entry.id}
                      >
                        {entry.contextLabel}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </nav>
            </div>
          ) : null}

          {/* -------------------------------------------------------------
              Pane. Caps at 1120px; the lane sits beside it on wide screens
              and below it on narrow ones.
          ------------------------------------------------------------- */}
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6" id="tx-main">
            <div className="mx-auto w-full max-w-[var(--tx-pane-max)]">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--tx-text-subtle)]">
                  {eyebrow}
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--tx-text)]">
                  {title}
                </h1>
              </div>

              {lane?.length ? (
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
                  <div className="min-w-0 flex-1">{children}</div>
                  <ContextLane heading={laneHeading} items={lane} />
                </div>
              ) : (
                children
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export { type LaneItem };
