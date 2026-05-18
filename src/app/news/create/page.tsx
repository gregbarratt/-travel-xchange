import type { Metadata } from "next";

import { ArticleCreateForm } from "@/components/news/article-create-form";

export const metadata: Metadata = {
  title: "Create Article",
  description: "Create a Travel Xchange news article.",
};

export default function CreateArticlePage() {
  return <ArticleCreateForm />;
}
