import type { ArticleType } from "@/types/database";

export const articleTypeOptions: Array<{
  description: string;
  label: string;
  value: ArticleType | "all";
}> = [
  {
    description: "All published trade stories.",
    label: "All news",
    value: "all",
  },
  {
    description: "Editorial news for the travel trade.",
    label: "News",
    value: "news",
  },
  {
    description: "Trade-facing supplier announcements.",
    label: "Supplier update",
    value: "supplier_update",
  },
  {
    description: "Supplier press releases and formal updates.",
    label: "Press release",
    value: "press_release",
  },
  {
    description: "Highlighted editorial story.",
    label: "Featured",
    value: "featured",
  },
];

export function getArticleTypeLabel(type: string) {
  return (
    articleTypeOptions.find((option) => option.value === type)?.label ??
    type.replaceAll("_", " ")
  );
}

export function slugifyArticleTitle(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "article"}-${Date.now()}`;
}

export function splitArticleTags(value: string) {
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.slice(0, 40));

  return Array.from(new Set(tags)).slice(0, 8);
}

export function formatArticleDate(value: string | null) {
  if (!value) {
    return "Not published yet";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
