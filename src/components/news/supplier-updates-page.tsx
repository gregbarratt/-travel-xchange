"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Megaphone, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { ArticleCard } from "@/components/news/article-card";
import { buttonVariants } from "@/components/ui/button";
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
  ArticleWithMeta,
  Company,
  Profile,
} from "@/types/database";

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

export function SupplierUpdatesPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [articles, setArticles] = useState<ArticleWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadSupplierUpdates = useCallback(async () => {
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
        .in("article_type", ["supplier_update", "press_release"])
        .order("published_at", { ascending: false }),
    ]);

    setViewerProfile(profileData);

    const issue = categoriesError ?? articlesError;

    if (issue) {
      setError(isMissingNewsTable(issue) ? phase7SetupMessage : issue.message);
      setArticles([]);
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
      void loadSupplierUpdates();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadSupplierUpdates]);

  return (
    <MemberPageShell
      activeLabel="News"
      actions={
        <Link
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "hidden sm:inline-flex",
          )}
          href="/news"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          News
        </Link>
      }
      eyebrow="Supplier updates"
      title="Supplier announcements"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so supplier updates cannot load.
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="size-5 text-[#0f766e]" aria-hidden="true" />
              <p className="text-sm font-semibold uppercase text-[#0f766e]">
                Supplier media
              </p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
              Product updates, incentives, launches, and trade notices
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              This page filters the news system to supplier updates and press
              releases. Dedicated supplier sponsorships and paid placements are
              saved for the advertising phase.
            </p>
          </div>
          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-[#0f766e] text-white hover:bg-[#115e59]",
            )}
            href="/news/create"
          >
            <Plus className="size-4" aria-hidden="true" />
            Create update
          </Link>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          {error ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading supplier updates...
            </div>
          ) : null}

          {!isLoading && articles.length === 0 && !error ? (
            <div className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
              <Building2
                className="mx-auto size-8 text-[#0f766e]"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">
                No supplier updates yet
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Publish a supplier update or press release to make it appear in
                this section.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {articles.map((article) => (
              <ArticleCard article={article} compact key={article.id} />
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Supplier spotlight placeholder
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Later advertising phases will let suppliers sponsor this area,
              boost updates, and track clicks.
            </p>
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              What belongs here
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>Supplier product announcements.</p>
              <p>Agent incentives and fam trip notices.</p>
              <p>Tour operator, cruise, hotel, airline, and tourist board news.</p>
              <p>Formal trade press releases.</p>
            </div>
          </article>
        </aside>
      </div>
    </MemberPageShell>
  );
}
