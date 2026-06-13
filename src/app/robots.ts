import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();

  return {
    rules: [
      {
        allow: [
          "/",
          "/login",
          "/register",
          "/update-password",
          "/legal",
        ],
        disallow: [
          "/account",
          "/admin",
          "/api",
          "/billing",
          "/dashboard",
          "/events",
          "/groups",
          "/jobs",
          "/messages",
          "/news",
          "/notifications",
          "/onboarding",
          "/pricing",
          "/profile",
          "/profile/edit",
          "/support",
          "/suppliers",
          "/training",
          "/workspace",
        ],
        userAgent: "*",
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
