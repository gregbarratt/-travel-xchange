export type SharedRouteKey =
  | "home"
  | "feed"
  | "search"
  | "news"
  | "groups"
  | "jobs"
  | "events"
  | "training"
  | "suppliers"
  | "support"
  | "messages"
  | "notifications"
  | "profile"
  | "billing"
  | "admin";

export type SharedNavigationItem = {
  key: SharedRouteKey;
  label: string;
  webPath: string;
  mobilePath: string;
  requiresAuth: boolean;
  adminOnly?: boolean;
  showInMobileTabs?: boolean;
};

export const sharedNavigationItems: SharedNavigationItem[] = [
  {
    key: "home",
    label: "Home",
    webPath: "/dashboard",
    mobilePath: "/home",
    requiresAuth: true,
    showInMobileTabs: true,
  },
  {
    key: "feed",
    label: "Xchange Feed",
    webPath: "/dashboard",
    mobilePath: "/feed",
    requiresAuth: true,
    showInMobileTabs: true,
  },
  {
    key: "search",
    label: "Search",
    webPath: "/search",
    mobilePath: "/search",
    requiresAuth: true,
    showInMobileTabs: true,
  },
  {
    key: "news",
    label: "News",
    webPath: "/news",
    mobilePath: "/news",
    requiresAuth: false,
  },
  {
    key: "groups",
    label: "Groups",
    webPath: "/groups",
    mobilePath: "/groups",
    requiresAuth: true,
  },
  {
    key: "jobs",
    label: "Jobs",
    webPath: "/jobs",
    mobilePath: "/jobs",
    requiresAuth: false,
  },
  {
    key: "events",
    label: "Events",
    webPath: "/events",
    mobilePath: "/events",
    requiresAuth: false,
  },
  {
    key: "training",
    label: "Training",
    webPath: "/training",
    mobilePath: "/training",
    requiresAuth: true,
  },
  {
    key: "suppliers",
    label: "Suppliers",
    webPath: "/suppliers",
    mobilePath: "/suppliers",
    requiresAuth: true,
  },
  {
    key: "support",
    label: "Support",
    webPath: "/support",
    mobilePath: "/support",
    requiresAuth: true,
  },
  {
    key: "messages",
    label: "Messages",
    webPath: "/messages",
    mobilePath: "/messages",
    requiresAuth: true,
    showInMobileTabs: true,
  },
  {
    key: "notifications",
    label: "Notifications",
    webPath: "/notifications",
    mobilePath: "/notifications",
    requiresAuth: true,
  },
  {
    key: "profile",
    label: "Profile",
    webPath: "/profile/edit",
    mobilePath: "/profile",
    requiresAuth: true,
    showInMobileTabs: true,
  },
  {
    key: "billing",
    label: "Billing",
    webPath: "/billing",
    mobilePath: "/billing",
    requiresAuth: true,
  },
  {
    key: "admin",
    label: "Admin",
    webPath: "/admin",
    mobilePath: "/admin",
    requiresAuth: true,
    adminOnly: true,
  },
];

export const mobileTabNavigationItems = sharedNavigationItems.filter(
  (item) => item.showInMobileTabs,
);
