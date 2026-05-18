"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Newspaper, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import {
  articleTypeOptions,
  slugifyArticleTitle,
  splitArticleTags,
} from "@/config/news";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { normalizeWebsiteUrl } from "@/lib/urls";
import type {
  ArticleCategory,
  ArticleType,
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

export function ArticleCreateForm() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(configured);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadFormData = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    setUserId(userData.user.id);

    const [
      { data: profileData },
      { data: categoryRows, error: categoriesError },
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
    ]);

    setViewerProfile(profileData);

    if (categoriesError) {
      setError(
        isMissingNewsTable(categoriesError)
          ? phase7SetupMessage
          : categoriesError.message,
      );
      setIsLoading(false);
      return;
    }

    setCategories((categoryRows ?? []) as ArticleCategory[]);

    if (profileData?.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profileData.company_id)
        .maybeSingle();

      setCompany(companyData);
    }

    setError(null);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadFormData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadFormData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !userId) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const excerpt = String(formData.get("excerpt") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const articleType = String(formData.get("article_type") ?? "news") as ArticleType;
    const categoryId = String(formData.get("category_id") ?? "").trim() || null;
    const imageUrl = normalizeWebsiteUrl(String(formData.get("image_url") ?? ""));
    const tags = splitArticleTags(String(formData.get("tags") ?? ""));
    const isFeatured = formData.get("is_featured") === "on";

    if (!title || !content) {
      setError("Please add a title and article content.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const { data: articleData, error: articleError } = await supabase
      .from("articles")
      .insert({
        article_type: articleType,
        category_id: categoryId,
        company_id: company?.id ?? null,
        content,
        created_by: userId,
        excerpt: excerpt || null,
        image_url: imageUrl,
        is_featured: isFeatured || articleType === "featured",
        published_at: new Date().toISOString(),
        slug: slugifyArticleTitle(title),
        status: "published",
        title,
        visibility: "members",
      })
      .select("id, slug")
      .single();

    if (articleError) {
      setError(
        isMissingNewsTable(articleError)
          ? phase7SetupMessage
          : articleError.code === "23505"
            ? "An article with this title already exists. Try changing the title slightly."
            : articleError.message,
      );
      setIsSaving(false);
      return;
    }

    if (tags.length > 0) {
      const { error: tagsError } = await supabase.from("article_tags").insert(
        tags.map((tag) => ({
          article_id: articleData.id,
          name: tag,
        })),
      );

      if (tagsError) {
        setError(
          isMissingNewsTable(tagsError) ? phase7SetupMessage : tagsError.message,
        );
        setIsSaving(false);
        return;
      }
    }

    router.push(`/news/${articleData.slug}`);
  }

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
      eyebrow="Create article"
      title="Publish a travel trade update"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so articles cannot save.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading publishing form...
        </div>
      ) : null}

      <form
        className="mx-auto max-w-4xl space-y-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={handleSubmit}
      >
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          This article will be attributed to{" "}
          <strong>{company?.name ?? viewerProfile?.full_name ?? "your account"}</strong>.
          Admin approval and scheduled publishing are saved for later phases.
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Newspaper className="size-5 text-[#0f766e]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-950">
              Article details
            </h2>
          </div>
          <TextField
            label="Title"
            name="title"
            placeholder="Cruise line announces new agent incentive"
            required
          />
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Article type"
              name="article_type"
              options={articleTypeOptions
                .filter((option) => option.value !== "all")
                .map((option) => ({
                  label: `${option.label} - ${option.description}`,
                  value: option.value,
                }))}
            />
            <SelectField
              label="Category"
              name="category_id"
              options={[
                { label: "No category", value: "" },
                ...categories.map((category) => ({
                  label: category.name,
                  value: category.id,
                })),
              ]}
            />
          </div>
          <TextareaField
            hint="A short summary for cards and listings."
            label="Excerpt"
            name="excerpt"
            placeholder="Summarise the update in one or two sentences."
          />
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Story content
          </h2>
          <TextareaField
            className="min-h-64"
            hint="Plain text is fine for now. Rich text editing can be added later."
            label="Article body"
            name="content"
            placeholder="Write the article, supplier update, or press release here."
            required
          />
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Discovery and placement
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              hint="Optional. Paste a full image URL if you have one."
              label="Image URL"
              name="image_url"
              placeholder="https://example.com/image.jpg"
              type="text"
            />
            <TextField
              hint="Separate tags with commas, for example: cruise, training, luxury."
              label="Tags"
              name="tags"
              placeholder="Cruise, Incentives, Supplier update"
              type="text"
            />
          </div>
          <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <input
              className="mt-1 size-4 accent-[#0f766e]"
              name="is_featured"
              type="checkbox"
            />
            <span>
              <span className="block font-semibold text-slate-950">
                Feature this article
              </span>
              <span className="mt-1 block leading-6">
                This is a placeholder editorial choice until the admin CMS and
                sponsored article workflow arrive later.
              </span>
            </span>
          </label>
        </section>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "justify-center sm:hidden",
            )}
            href="/news"
          >
            Back to news
          </Link>
          <Button
            className="h-11 bg-[#0f766e] px-5 text-white hover:bg-[#115e59]"
            disabled={isSaving}
            type="submit"
          >
            <Plus className="size-4" aria-hidden="true" />
            {isSaving ? "Publishing" : "Publish article"}
          </Button>
        </div>
      </form>
    </MemberPageShell>
  );
}
