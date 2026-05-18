import Link from "next/link";
import { Building2, Newspaper, Star } from "lucide-react";

import {
  formatArticleDate,
  getArticleTypeLabel,
} from "@/config/news";
import { cn } from "@/lib/utils";
import type { ArticleWithMeta } from "@/types/database";

type ArticleCardProps = {
  article: ArticleWithMeta;
  compact?: boolean;
};

export function ArticleCard({ article, compact = false }: ArticleCardProps) {
  return (
    <article
      className={cn(
        "rounded-md border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        article.is_featured ? "border-[#0f766e]" : "border-slate-200",
        compact ? "p-4" : "p-5",
      )}
    >
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-[#e0f2f1] px-2 py-1 text-xs font-semibold text-[#0f766e]">
          <Newspaper className="size-3" aria-hidden="true" />
          {getArticleTypeLabel(article.article_type)}
        </span>
        {article.category ? (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
            {article.category.name}
          </span>
        ) : null}
        {article.is_featured ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
            <Star className="size-3" aria-hidden="true" />
            Featured
          </span>
        ) : null}
      </div>

      <Link href={`/news/${article.slug}`}>
        <h2
          className={cn(
            "mt-3 font-semibold tracking-normal text-slate-950",
            compact ? "text-lg" : "text-xl",
          )}
        >
          {article.title}
        </h2>
      </Link>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {article.excerpt ??
          "No excerpt has been added yet. Open the article to read the full update."}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{formatArticleDate(article.published_at)}</span>
        <span>-</span>
        <span>{article.author?.full_name ?? "Travel Xchange member"}</span>
        {article.company ? (
          <>
            <span>-</span>
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3" aria-hidden="true" />
              {article.company.name}
            </span>
          </>
        ) : null}
      </div>

      {article.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {article.tags.slice(0, compact ? 3 : 5).map((tag) => (
            <span
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
