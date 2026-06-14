import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();

  return {
    rules: [
      {
        allow: [
          "/",
          "/forgot-password",
          "/login",
          "/register",
          "/update-password",
          "/legal",
        ],
        disallow: [
          "/account",
          "/about",
          "/admin",
          "/api",
          "/billing",
          "/companies",
          "/contact",
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
          "/search",
          "/supplier-updates",
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
