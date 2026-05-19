"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  AdminEmptyState,
  AdminStatusBadge,
  getStatusTone,
} from "@/components/admin/admin-ui";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { SelectField } from "@/components/ui/field";
import { formatArticleDate, getArticleTypeLabel } from "@/config/news";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { Article, ArticleCategory, Company, Profile } from "@/types/database";

type ArticleStatus = Article["status"];

type AdminArticle = Article & {
  author: Pick<Profile, "id" | "full_name" | "headline"> | null;
  category: Pick<ArticleCategory, "id" | "name" | "slug"> | null;
  company: Pick<Company, "id" | "name" | "company_type"> | null;
};

const articleStatusOptions: Array<{ label: string; value: ArticleStatus }> = [
  { label: "Published", value: "published" },
  { label: "Hidden", value: "hidden" },
  { label: "Archived", value: "archived" },
  { label: "Draft", value: "draft" },
];

export function AdminArticlesPage() {
  return (
    <AdminPageShell
      activeHref="/admin/articles"
      description="Review news stories and supplier updates before the media area becomes a fuller CMS."
      title="Articles admin"
    >
      {({ userId }) => <AdminArticlesContent userId={userId} />}
    </AdminPageShell>
  );
}

function AdminArticlesContent({ userId }: { userId: string }) {
  const configured = isSupabaseConfigured();
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadArticles = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: articleData, error: articleError } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);

    if (articleError) {
      setError(articleError.message);
      setIsLoading(false);
      return;
    }

    const articleRows = (articleData ?? []) as Article[];
    const authorIds = Array.from(
      new Set(articleRows.map((article) => article.created_by)),
    );
    const categoryIds = Array.from(
      new Set(
        articleRows.map((article) => article.category_id).filter(Boolean) as string[],
      ),
    );
    const companyIds = Array.from(
      new Set(
        articleRows.map((article) => article.company_id).filter(Boolean) as string[],
      ),
    );

    const [
      { data: authorData },
      { data: categoryData },
      { data: companyData },
    ] = await Promise.all([
      authorIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, full_name, headline")
            .in("id", authorIds)
        : Promise.resolve({ data: [] }),
      categoryIds.length > 0
        ? supabase
            .from("article_categories")
            .select("id, name, slug")
            .in("id", categoryIds)
        : Promise.resolve({ data: [] }),
      companyIds.length > 0
        ? supabase
            .from("companies")
            .select("id, name, company_type")
            .in("id", companyIds)
        : Promise.resolve({ data: [] }),
    ]);

    const authorMap = new Map(
      ((authorData ?? []) as Pick<
        Profile,
        "id" | "full_name" | "headline"
      >[]).map((author) => [author.id, author]),
    );
    const categoryMap = new Map(
      ((categoryData ?? []) as Pick<
        ArticleCategory,
        "id" | "name" | "slug"
      >[]).map((category) => [category.id, category]),
    );
    const companyMap = new Map(
      ((companyData ?? []) as Pick<
        Company,
        "id" | "name" | "company_type"
      >[]).map((company) => [company.id, company]),
    );

    setArticles(
      articleRows.map((article) => ({
        ...article,
        author: authorMap.get(article.created_by) ?? null,
        category: article.category_id
          ? categoryMap.get(article.category_id) ?? null
          : null,
        company: article.company_id ? companyMap.get(article.company_id) ?? null : null,
      })),
    );
    setError(null);
    setIsLoading(false);
  }, [supabase]);

  async function updateArticleStatus(
    article: AdminArticle,
    status: ArticleStatus,
  ) {
    if (!supabase || article.status === status) {
      return;
    }

    setBusyId(article.id);
    setError(null);

    const { error: updateError } = await supabase
      .from("articles")
      .update({ status })
      .eq("id", article.id);

    if (updateError) {
      setError(updateError.message);
      setBusyId(null);
      return;
    }

    await supabase.from("audit_logs").insert({
      action: "article.status_updated",
      actor_id: userId,
      entity_id: article.id,
      entity_type: "article",
      summary: `Changed article to ${status}.`,
    });

    setMessage("Article updated.");
    setBusyId(null);
    await loadArticles();
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadArticles();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadArticles]);

  if (isLoading) {
    return (
      <div className="tx-card p-6 text-sm text-[#4d6b9e]">
        Loading articles...
      </div>
    );
  }

  if (articles.length === 0 && !error) {
    return (
      <AdminEmptyState title="No articles yet">
        News articles and supplier updates will appear here after they are
        created.
      </AdminEmptyState>
    );
  }

  return (
    <section className="space-y-4">
      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      {articles.map((article) => (
        <article className="tx-card p-5" key={article.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className="font-extrabold text-[#061b4f] hover:text-[#f52968]"
                  href={`/news/${article.slug}`}
                >
                  {article.title}
                </Link>
                <AdminStatusBadge tone={getStatusTone(article.status)}>
                  {article.status}
                </AdminStatusBadge>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
                {getArticleTypeLabel(article.article_type)} -{" "}
                {article.category?.name ?? "No category"} -{" "}
                {article.company?.name ?? "No company"}
              </p>
              <p className="mt-1 text-xs font-medium text-[#7288b8]">
                Created {formatArticleDate(article.created_at)}
              </p>
            </div>

            <div className="w-full sm:w-52">
              <SelectField
                disabled={busyId === article.id}
                label="Article status"
                name={`article-status-${article.id}`}
                onChange={(event) =>
                  void updateArticleStatus(
                    article,
                    event.target.value as ArticleStatus,
                  )
                }
                options={articleStatusOptions}
                value={article.status}
              />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
