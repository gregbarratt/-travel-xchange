import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = getAppUrl();
  const now = new Date();
  const closedLaunchRoutes = ["/"];

  return closedLaunchRoutes.map((route) => ({
    changeFrequency: "weekly",
    lastModified: now,
    priority: 1,
    url: `${appUrl}${route}`,
  }));
}
