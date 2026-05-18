import type { Metadata } from "next";

import { ArticleDetailPage } from "@/components/news/article-detail-page";

export const metadata: Metadata = {
  title: "Article",
  description: "Travel Xchange news article.",
};

type ArticleRouteProps = {
  params: Promise<{ slug: string }>;
};

export default async function ArticleRoute({ params }: ArticleRouteProps) {
  const { slug } = await params;

  return <ArticleDetailPage articleSlug={slug} />;
}
