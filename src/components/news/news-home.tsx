"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, Newspaper, Plus, Star, Tags } from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { ArticleCard } from "@/components/news/article-card";
import { buttonVariants } from "@/components/ui/button";
import {
  articleTypeOptions,
  formatArticleDate,
  getArticleTypeLabel,
} from "@/config/news";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  Article,
  ArticleCategory,
  ArticleTag,
  ArticleType,
  ArticleWithMeta,
  Company,
  Profile,
} from "@/types/database";

type TypeFilter = ArticleType | "all";

const phase7SetupMessage =
  "The Phase 7 news tables are not installed yet. Run supabase/phase-7-news.sql in Supabase, then refresh this page.";

function isMissingNewsTable(error: { code?: string; message?: string }) {
  return isMissingTableError(error, [
    "articles",
    "article_categories",
    "article_tags",
  ]);
}

function buildArticleRows(
  articles: Article[],
  categories: ArticleCategory[],
  tags: ArticleTag[],
  companies: Pick<Company, "id" | "name" | "company_type">[],
  authors: Pick<Profile, "id" | "full_name" | "headline" | "role">[],
): ArticleWithMeta[] {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const companyMap = new Map(companies.map((company) => [company.id, company]));
  const authorMap = new Map(authors.map((author) => [author.id, author]));
  const tagsByArticle = tags.reduce<Map<string, string[]>>((map, tag) => {
    const existing = map.get(tag.article_id) ?? [];
    existing.push(tag.name);
    map.set(tag.article_id, existing);
    return map;
  }, new Map());

  return articles.map((article) => ({
    ...article,
    author: authorMap.get(article.created_by) ?? null,
    category: article.category_id
      ? categoryMap.get(article.category_id) ?? null
      : null,
    company: article.company_id ? companyMap.get(article.company_id) ?? null : null,
    tags: tagsByArticle.get(article.id) ?? [],
  }));
}

export function NewsHome() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [articles, setArticles] = useState<ArticleWithMeta[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeType, setActiveType] = useState<TypeFilter>("all");
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadNews = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const [
      { data: profileData },
      { data: categoryRows, error: categoriesError },
      { data: articleRows, error: articlesError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .maybeSingle(),
      supabase
        .from("article_categories")
        .select("*")
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false }),
    ]);

    setViewerProfile(profileData);

    const issue = categoriesError ?? articlesError;

    if (issue) {
      setError(isMissingNewsTable(issue) ? phase7SetupMessage : issue.message);
      setArticles([]);
      setCategories([]);
      setIsLoading(false);
      return;
    }

    const typedArticles = (articleRows ?? []) as Article[];
    const typedCategories = (categoryRows ?? []) as ArticleCategory[];
    const articleIds = typedArticles.map((article) => article.id);
    const companyIds = Array.from(
      new Set(
        typedArticles
          .map((article) => article.company_id)
          .filter(Boolean) as string[],
      ),
    );
    const authorIds = Array.from(
      new Set(typedArticles.map((article) => article.created_by)),
    );

    let tagRows: ArticleTag[] = [];
    let companyRows: Pick<Company, "id" | "name" | "company_type">[] = [];
    let authorRows: Pick<Profile, "id" | "full_name" | "headline" | "role">[] =
      [];

    if (articleIds.length > 0) {
      const { data: tagsData, error: tagsError } = await supabase
        .from("article_tags")
        .select("*")
        .in("article_id", articleIds);

      if (tagsError) {
        setError(isMissingNewsTable(tagsError) ? phase7SetupMessage : tagsError.message);
        setArticles([]);
        setIsLoading(false);
        return;
      }

      tagRows = (tagsData ?? []) as ArticleTag[];
    }

    if (companyIds.length > 0) {
      const { data: companiesData } = await supabase
        .from("companies")
        .select("id, name, company_type")
        .in("id", companyIds);

      companyRows = (companiesData ?? []) as Pick<
        Company,
        "id" | "name" | "company_type"
      >[];
    }

    if (authorIds.length > 0) {
      const { data: authorsData } = await supabase
        .from("profiles")
        .select("id, full_name, headline, role")
        .in("id", authorIds);

      authorRows = (authorsData ?? []) as Pick<
        Profile,
        "id" | "full_name" | "headline" | "role"
      >[];
    }

    setCategories(typedCategories);
    setArticles(
      buildArticleRows(
        typedArticles,
        typedCategories,
        tagRows,
        companyRows,
        authorRows,
      ),
    );
    setError(null);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadNews();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadNews]);

  const filteredArticles = articles.filter((article) => {
    const categoryMatches =
      activeCategory === "all" || article.category_id === activeCategory;
    const typeMatches = activeType === "all" || article.article_type === activeType;

    return categoryMatches && typeMatches;
  });

  const featuredArticle =
    articles.find((article) => article.is_featured) ?? articles[0] ?? null;
  const supplierUpdates = articles
    .filter((article) =>
      ["supplier_update", "press_release"].includes(article.article_type),
    )
    .slice(0, 3);
  const trendingTags = Array.from(
    articles
      .flatMap((article) => article.tags)
      .reduce<Map<string, number>>((map, tag) => {
        map.set(tag, (map.get(tag) ?? 0) + 1);
        return map;
      }, new Map())
      .entries(),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <MemberPageShell
      activeLabel="News"
      actions={
        <Link
          className={cn(
            buttonVariants({ size: "lg" }),
            "hidden bg-[#0f766e] text-white hover:bg-[#115e59] sm:inline-flex",
          )}
          href="/news/create"
        >
          <Plus className="size-4" aria-hidden="true" />
          Create article
        </Link>
      }
      eyebrow="News"
      title="Travel trade media"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so news cannot load.
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-[#0f766e]">
              Phase 7 media area
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
              News, analysis, and supplier updates for the travel industry
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Publish early trade stories, supplier announcements, press
              releases, and category-led updates. This is the MVP version of
              the future Travel Xchange media and CMS area.
            </p>
          </div>
          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-[#0f766e] text-white hover:bg-[#115e59] sm:hidden",
            )}
            href="/news/create"
          >
            <Plus className="size-4" aria-hidden="true" />
            Create article
          </Link>
        </div>
      </section>

      {featuredArticle ? (
        <section className="mt-5 rounded-md border border-[#0f766e] bg-[#f0fdfa] p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#0f766e]">
                  <Star className="size-3" aria-hidden="true" />
                  Featured story
                </span>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                  {getArticleTypeLabel(featuredArticle.article_type)}
                </span>
              </div>
              <Link href={`/news/${featuredArticle.slug}`}>
                <h2 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">
                  {featuredArticle.title}
                </h2>
              </Link>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
                {featuredArticle.excerpt ??
                  "Open this article to read the full travel trade update."}
              </p>
            </div>
            <div className="rounded-md border border-[#99f6e4] bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Published
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {formatArticleDate(featuredArticle.published_at)}
              </p>
              <p className="mt-4 text-xs font-semibold uppercase text-slate-500">
                Source
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {featuredArticle.company?.name ??
                  featuredArticle.author?.full_name ??
                  "Travel Xchange"}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {articleTypeOptions.map((option) => (
                <button
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition",
                    activeType === option.value
                      ? "border-[#0f766e] bg-[#e0f2f1] text-[#0f766e]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  key={option.value}
                  onClick={() => setActiveType(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <button
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium transition",
                  activeCategory === "all"
                    ? "border-[#082f49] bg-slate-100 text-[#082f49]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
                onClick={() => setActiveCategory("all")}
                type="button"
              >
                All categories
              </button>
              {categories.map((category) => (
                <button
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition",
                    activeCategory === category.id
                      ? "border-[#082f49] bg-slate-100 text-[#082f49]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  type="button"
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading news...
            </div>
          ) : null}

          {!isLoading && filteredArticles.length === 0 && !error ? (
            <div className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
              <Newspaper
                className="mx-auto size-8 text-[#0f766e]"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">
                No articles match this view
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Create the first Travel Xchange news story or clear the
                filters to see all published articles.
              </p>
              <Link
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-5 bg-[#0f766e] text-white hover:bg-[#115e59]",
                )}
                href="/news/create"
              >
                <Plus className="size-4" aria-hidden="true" />
                Create article
              </Link>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredArticles.map((article) => (
              <ArticleCard article={article} key={article.id} />
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Megaphone className="size-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                Supplier updates
              </h2>
            </div>
            {supplierUpdates.length > 0 ? (
              <div className="mt-4 space-y-3">
                {supplierUpdates.map((article) => (
                  <Link
                    className="block rounded-md border border-slate-100 p-3 hover:bg-slate-50"
                    href={`/news/${article.slug}`}
                    key={article.id}
                  >
                    <p className="font-semibold text-slate-950">
                      {article.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {article.company?.name ?? getArticleTypeLabel(article.article_type)}
                    </p>
                  </Link>
                ))}
                <Link
                  className="inline-flex text-sm font-semibold text-[#0f766e] hover:text-[#115e59]"
                  href="/supplier-updates"
                >
                  View supplier updates
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Supplier announcements and press releases will appear here once
                they are published.
              </p>
            )}
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Tags className="size-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                Trending tags
              </h2>
            </div>
            {trendingTags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {trendingTags.map(([tag, count]) => (
                  <span
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600"
                    key={tag}
                  >
                    {tag} ({count})
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Tags from published articles will help members find topics
                quickly.
              </p>
            )}
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              CMS placeholder
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This phase adds a simple internal publishing form. Admin approval,
              sponsored articles, and richer editorial workflow arrive later.
            </p>
          </article>
        </aside>
      </div>
    </MemberPageShell>
  );
}
