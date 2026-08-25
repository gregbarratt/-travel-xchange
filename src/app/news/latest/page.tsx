import type { Metadata } from "next";

import { LatestNewsPage } from "@/components/news/latest-news-page";

export const metadata: Metadata = {
  title: "Latest trade news",
  description:
    "Travel trade news from verified industry publishers, filtered to the topics you follow.",
};

export default function NewsLatestPage() {
  return <LatestNewsPage />;
}
