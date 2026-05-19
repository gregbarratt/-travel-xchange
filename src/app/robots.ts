import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();

  return {
    rules: [
      {
        allow: [
          "/",
          "/about",
          "/pricing",
          "/contact",
          "/news",
          "/jobs",
          "/events",
          "/training",
          "/support",
          "/legal",
        ],
        disallow: [
          "/account",
          "/admin",
          "/api",
          "/billing",
          "/dashboard",
          "/messages",
          "/notifications",
          "/onboarding",
          "/profile/edit",
        ],
        userAgent: "*",
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
