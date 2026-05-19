import type { MetadataRoute } from "next";

import { legalRoutes } from "@/config/legal";
import { publicRoutes } from "@/config/navigation";
import { getAppUrl } from "@/lib/site-url";

const publicAppRoutes = [
  "/news",
  "/supplier-updates",
  "/groups",
  "/jobs",
  "/events",
  "/training",
  "/support",
  "/pricing",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = getAppUrl();
  const now = new Date();
  const routeSet = new Set([
    ...publicRoutes.map((route) => route.href),
    ...legalRoutes.map((route) => route.href),
    ...publicAppRoutes,
  ]);

  return Array.from(routeSet).map((route) => ({
    changeFrequency: route === "/" ? "weekly" : "monthly",
    lastModified: now,
    priority: route === "/" ? 1 : 0.7,
    url: `${appUrl}${route}`,
  }));
}
