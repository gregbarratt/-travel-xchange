import type { Profile, TravelXchangeRole } from "../../types/database.ts";

/**
 * The navigation model behind the workspace shell.
 *
 * Kept free of React so the parts that are easy to get wrong - which
 * workspaces a role actually grants, and which rail area a URL belongs to -
 * are plain functions with tests around them.
 *
 * Structure follows the wireframe atlas: a rail of areas, each opening a
 * flyout that lists that area's pages with one line of explanation each.
 */

export type WorkspaceId = "professional" | "supplier" | "admin";

/** Icon key, resolved to a component by the shell. */
export type NavIconKey =
  | "home"
  | "news"
  | "community"
  | "jobs"
  | "learn"
  | "suppliers"
  | "pages"
  | "shield"
  | "settings";

export type NavSubItem = {
  label: string;
  href: string;
  /** One line saying what the page is for. Shown in the flyout. */
  description: string;
  /**
   * When a sub-item names a tab rather than a page of its own, the tab is
   * carried in the URL as `?tab=` and matched back on the label, so a deep
   * link opens the tab it names.
   */
  tab?: string;
};

export type NavArea = {
  id: string;
  label: string;
  icon: NavIconKey;
  /** Where a click on the rail goes. */
  href: string;
  items?: NavSubItem[];
};

export type Workspace = {
  id: WorkspaceId;
  label: string;
  /** Shown in the top bar so it is always clear which workspace is open. */
  contextLabel: string;
  /** Exactly one primary action per workspace, never two. */
  primaryAction: { label: string; href: string };
  areas: NavArea[];
};

const professionalWorkspace: Workspace = {
  areas: [
    {
      href: "/dashboard",
      icon: "home",
      id: "home",
      label: "Home",
    },
    {
      href: "/news/latest",
      icon: "news",
      id: "news",
      items: [
        {
          description: "Industry headlines, filtered to the topics you follow.",
          href: "/news/latest",
          label: "Latest news",
        },
        {
          description: "Stories published on Travel Xchange by members and suppliers.",
          href: "/news",
          label: "Travel Xchange articles",
        },
        {
          description: "Announcements, incentives and launches from suppliers.",
          href: "/supplier-updates",
          label: "Supplier updates",
        },
      ],
      label: "Trade news",
    },
    {
      href: "/groups",
      icon: "community",
      id: "community",
      items: [
        {
          description: "Communities for the sectors and destinations you sell.",
          href: "/groups",
          label: "Groups",
        },
        {
          description: "Ask the trade, and answer what you know.",
          href: "/support",
          label: "Questions",
        },
        {
          description: "Direct conversations with members and suppliers.",
          href: "/messages",
          label: "Messages",
        },
      ],
      label: "Community",
    },
    {
      href: "/jobs",
      icon: "jobs",
      id: "jobs",
      items: [
        {
          description: "Live travel industry vacancies from across the trade.",
          href: "/jobs",
          label: "Job board",
        },
        {
          description: "Advertise a role to Travel Xchange members.",
          href: "/jobs/post",
          label: "Post a job",
        },
      ],
      label: "Jobs",
    },
    {
      href: "/training",
      icon: "learn",
      id: "learn",
      items: [
        {
          description: "Courses, academies and destination specialist programmes.",
          href: "/training",
          label: "Training",
        },
        {
          description: "Webinars, roadshows, fam trips and industry events.",
          href: "/events",
          label: "Events",
        },
      ],
      label: "Learn",
    },
    {
      href: "/suppliers",
      icon: "suppliers",
      id: "suppliers",
      items: [
        {
          description: "Every supplier page on Travel Xchange.",
          href: "/suppliers",
          label: "Directory",
        },
        {
          description: "Supplier pages you administer or contribute to.",
          href: "/workspace/pages",
          label: "Managed pages",
        },
      ],
      label: "Suppliers",
    },
  ],
  contextLabel: "Professional workspace",
  id: "professional",
  label: "Professional",
  primaryAction: { href: "/dashboard#post-content", label: "Post" },
};

const supplierWorkspace: Workspace = {
  areas: [
    { href: "/dashboard", icon: "home", id: "home", label: "Home" },
    {
      href: "/workspace/pages",
      icon: "pages",
      id: "pages",
      items: [
        {
          description: "Supplier pages you administer.",
          href: "/workspace/pages",
          label: "Managed pages",
        },
        {
          description: "Announcements and offers you have published to the trade.",
          href: "/supplier-updates",
          label: "Supplier updates",
        },
      ],
      label: "Managed pages",
    },
    {
      href: "/events",
      icon: "learn",
      id: "learn",
      items: [
        {
          description: "Webinars, roadshows and fam trips you are running.",
          href: "/events",
          label: "Events",
        },
        {
          description: "Training you offer to agents.",
          href: "/training",
          label: "Training",
        },
      ],
      label: "Programme",
    },
    {
      href: "/messages",
      icon: "community",
      id: "community",
      items: [
        {
          description: "Direct conversations with agents.",
          href: "/messages",
          label: "Messages",
        },
        {
          description: "Questions from the trade you can answer.",
          href: "/support",
          label: "Questions",
        },
      ],
      label: "Community",
    },
  ],
  contextLabel: "Supplier workspace",
  id: "supplier",
  label: "Supplier",
  primaryAction: { href: "/news/create", label: "Publish" },
};

const adminWorkspace: Workspace = {
  areas: [
    { href: "/admin", icon: "shield", id: "admin-overview", label: "Overview" },
    {
      href: "/admin/users",
      icon: "community",
      id: "admin-people",
      items: [
        {
          description: "Members, roles and verification tiers.",
          href: "/admin/users",
          label: "Users",
        },
        {
          description: "Approve and manage agent access to supplier pages.",
          href: "/admin/supplier-access",
          label: "Supplier access",
        },
        {
          description: "Verification requests waiting on a decision.",
          href: "/admin/verification",
          label: "Verification",
        },
        {
          description: "People who registered interest before launch.",
          href: "/admin/launch-signups",
          label: "Launch signups",
        },
      ],
      label: "People",
    },
    {
      href: "/admin/posts",
      icon: "news",
      id: "admin-content",
      items: [
        {
          description: "Member posts, and anything reported on them.",
          href: "/admin/posts",
          label: "Posts",
        },
        {
          description: "Travel Xchange articles and supplier updates.",
          href: "/admin/articles",
          label: "Articles",
        },
        {
          description: "Publisher feeds, ingestion health and the news queue.",
          href: "/admin/news-sources",
          label: "News sources",
        },
        {
          description: "Reports raised by members.",
          href: "/admin/reports",
          label: "Reports",
        },
        {
          description: "Job listings across the board.",
          href: "/admin/jobs",
          label: "Jobs",
        },
        {
          description: "Advert campaigns, creatives and placements.",
          href: "/admin/adverts",
          label: "Adverts",
        },
      ],
      label: "Content",
    },
    {
      href: "/admin/analytics",
      icon: "settings",
      id: "admin-platform",
      items: [
        {
          description: "Platform metrics and engagement.",
          href: "/admin/analytics",
          label: "Analytics",
        },
        {
          description: "Launch readiness checks.",
          href: "/admin/production-readiness",
          label: "Production",
        },
        {
          description: "Deployment status and environment configuration.",
          href: "/admin/deployment",
          label: "Deployment",
        },
      ],
      label: "Platform",
    },
  ],
  contextLabel: "Platform administration",
  id: "admin",
  label: "Admin",
  primaryAction: { href: "/admin/reports", label: "Review queue" },
};

const adminRoles = new Set<TravelXchangeRole>(["moderator", "admin", "super_admin"]);
const supplierRoles = new Set<TravelXchangeRole>(["supplier"]);

export type WorkspaceGrantProfile = Pick<Profile, "role"> | null;

/**
 * The workspaces a profile actually grants.
 *
 * Read from the profile role that came from the database, never from a list
 * assembled in the browser. A workspace that is not returned here is not
 * offered in the switcher, and its routes remain protected server-side
 * regardless.
 */
export function getWorkspacesForProfile(profile: WorkspaceGrantProfile): Workspace[] {
  const workspaces: Workspace[] = [professionalWorkspace];
  const role = profile?.role;

  if (role && supplierRoles.has(role)) {
    workspaces.push(supplierWorkspace);
  }

  if (role && adminRoles.has(role)) {
    workspaces.push(adminWorkspace);
  }

  return workspaces;
}

/** The workspace a path belongs to, so a deep link opens the right one. */
export function resolveWorkspaceForPath(
  workspaces: Workspace[],
  pathname: string,
): Workspace {
  const admin = workspaces.find((workspace) => workspace.id === "admin");

  if (admin && pathname.startsWith("/admin")) {
    return admin;
  }

  return workspaces[0];
}

/** Full href for a sub-item, carrying its tab when it names one. */
export function subItemHref(item: NavSubItem) {
  if (!item.tab) {
    return item.href;
  }

  const separator = item.href.includes("?") ? "&" : "?";
  return `${item.href}${separator}tab=${encodeURIComponent(item.tab)}`;
}

function pathMatches(href: string, pathname: string) {
  const target = href.split("?")[0].split("#")[0];

  if (target === pathname) {
    return true;
  }

  // `/jobs` owns `/jobs/123`, but must not claim `/jobsomething`.
  return target !== "/" && pathname.startsWith(`${target}/`);
}

/**
 * Which sub-item the current URL is on.
 *
 * A sub-item that names a tab only matches when the tab matches too, so two
 * tabs of one page do not both light up.
 */
export function isSubItemActive(
  item: NavSubItem,
  pathname: string,
  activeTab?: string | null,
) {
  if (!pathMatches(item.href, pathname)) {
    return false;
  }

  if (!item.tab) {
    return !activeTab;
  }

  return item.tab.toLowerCase() === (activeTab ?? "").toLowerCase();
}

/**
 * Which rail area the current URL belongs to.
 *
 * The active state follows the page, not the last thing clicked. The most
 * specific match wins, so `/workspace/pages` lights up Suppliers rather than
 * whichever area happens to be listed first.
 */
export function resolveActiveAreaId(areas: NavArea[], pathname: string): string | null {
  let bestId: string | null = null;
  let bestLength = -1;

  for (const area of areas) {
    const candidates = [area.href, ...(area.items ?? []).map((item) => item.href)];

    for (const candidate of candidates) {
      const target = candidate.split("?")[0].split("#")[0];

      if (pathMatches(target, pathname) && target.length > bestLength) {
        bestId = area.id;
        bestLength = target.length;
      }
    }
  }

  return bestId;
}
