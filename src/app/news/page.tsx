import type { Metadata } from "next";

import { NewsHome } from "@/components/news/news-home";

export const metadata: Metadata = {
  title: "News",
  description: "Travel Xchange travel trade news.",
};

export default function NewsPage() {
  return <NewsHome />;
}
