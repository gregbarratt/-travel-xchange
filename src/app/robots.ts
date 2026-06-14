import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();

  return {
    rules: [
      {
        allow: [
          "/$",
          "/legal/",
        ],
        disallow: "/",
        userAgent: "*",
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
