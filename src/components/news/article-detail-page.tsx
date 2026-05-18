"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ExternalLink,
  Newspaper,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { buttonVariants } from "@/components/ui/button";
import {
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
  Company,
  Profile,
} from "@/types/database";

type ArticleDetailPageProps = {
  articleSlug: string;
};

const phase7SetupMessage =
  "The Phase 7 news tables are not installed yet. Run supabase/phase-7-news.sql in Supabase, then refresh this page.";

function isMissingNewsTable(error: { code?: string; message?: string }) {
  return isMissingTableError(error, [
    "articles",
    "article_categories",
    "article_tags",
  ]);
}

export function ArticleDetailPage({ articleSlug }: ArticleDetailPageProps) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [category, setCategory] = useState<ArticleCategory | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [tags, setTags] = useState<ArticleTag[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadArticle = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const [{ data: profileData }, { data: articleData, error: articleError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase
          .from("articles")
          .select("*")
          .eq("slug", articleSlug)
          .maybeSingle(),
      ]);

    setViewerProfile(profileData);

    if (articleError) {
      setError(
        isMissingNewsTable(articleError) ? phase7SetupMessage : articleError.message,
      );
      setIsLoading(false);
      return;
    }

    if (!articleData) {
      setError("That article could not be found.");
      setIsLoading(false);
      return;
    }

    const typedArticle = articleData as Article;
    setArticle(typedArticle);

    const detailRequests = [
      supabase
        .from("article_tags")
        .select("*")
        .eq("article_id", typedArticle.id),
      supabase
        .from("profiles")
        .select("*")
        .eq("id", typedArticle.created_by)
        .maybeSingle(),
    ] as const;

    const [tagResult, authorResult] = await Promise.all(detailRequests);

    if (tagResult.error) {
      setError(
        isMissingNewsTable(tagResult.error)
          ? phase7SetupMessage
          : tagResult.error.message,
      );
      setIsLoading(false);
      return;
    }

    setTags((tagResult.data ?? []) as ArticleTag[]);
    setAuthor(authorResult.data as Profile | null);

    if (typedArticle.category_id) {
      const { data: categoryData } = await supabase
        .from("article_categories")
        .select("*")
        .eq("id", typedArticle.category_id)
        .maybeSingle();

      setCategory(categoryData as ArticleCategory | null);
    }

    if (typedArticle.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", typedArticle.company_id)
        .maybeSingle();

      setCompany(companyData as Company | null);
    }

    setError(null);
    setIsLoading(false);
  }, [articleSlug, router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadArticle();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadArticle]);

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
      eyebrow="Article"
      title={article?.title ?? "News article"}
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so articles cannot load.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading article...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      {article ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#e0f2f1] px-2 py-1 text-xs font-semibold text-[#0f766e]">
                <Newspaper className="size-3" aria-hidden="true" />
                {getArticleTypeLabel(article.article_type)}
              </span>
              {category ? (
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  {category.name}
                </span>
              ) : null}
              {article.is_featured ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                  <Star className="size-3" aria-hidden="true" />
                  Featured
                </span>
              ) : null}
            </div>

            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">
              {article.title}
            </h2>

            {article.excerpt ? (
              <p className="mt-4 text-lg leading-8 text-slate-700">
                {article.excerpt}
              </p>
            ) : null}

            {article.image_url ? (
              <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  className="h-64 w-full object-cover"
                  src={article.image_url}
                />
              </div>
            ) : null}

            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {article.content}
              </p>
            </div>

            {tags.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                {tags.map((tag) => (
                  <span
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600"
                    key={tag.id}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : null}
          </article>

          <aside className="space-y-5">
            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5 text-[#0f766e]" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950">
                  Article details
                </h2>
              </div>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-500">
                    Published
                  </dt>
                  <dd className="mt-1 font-medium text-slate-950">
                    {formatArticleDate(article.published_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-500">
                    Author
                  </dt>
                  <dd className="mt-1 font-medium text-slate-950">
                    {author?.full_name ?? "Travel Xchange member"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-500">
                    Visibility
                  </dt>
                  <dd className="mt-1 font-medium capitalize text-slate-950">
                    {article.visibility}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-[#0f766e]" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950">
                  Source
                </h2>
              </div>
              {company ? (
                <div className="mt-4 space-y-3">
                  <p className="font-semibold text-slate-950">{company.name}</p>
                  <p className="text-sm leading-6 text-slate-600">
                    {company.description ??
                      "This article is linked to a Travel Xchange company profile."}
                  </p>
                  <Link
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "w-full justify-center bg-white",
                    )}
                    href={`/companies/${company.id}`}
                  >
                    View company
                  </Link>
                  {company.website_url ? (
                    <a
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "w-full bg-[#082f49] text-white hover:bg-[#0c4a6e]",
                      )}
                      href={company.website_url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Visit website
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  This article is attributed to the publishing member until a
                  company is connected.
                </p>
              )}
            </article>

            <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Editorial workflow
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                This article is live immediately for MVP testing. Moderation,
                approval, and sponsored article controls arrive in later phases.
              </p>
            </article>
          </aside>
        </div>
      ) : null}
    </MemberPageShell>
  );
}
