"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  FileText,
  GraduationCap,
  HelpCircle,
  Newspaper,
  Search,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { GlobalSearchBox } from "@/components/search/global-search-box";
import {
  getSearchCategoryLabel,
  searchCategoryOptions,
  trendingSearchTopics,
  type SearchCategory,
  type SearchResultType,
} from "@/config/search";
import { getCompanyTypeLabel, getRoleLabel } from "@/config/roles";
import { getGroupCategoryLabel } from "@/config/groups";
import { getJobCategoryLabel } from "@/config/jobs";
import { getEventTypeLabel } from "@/config/events";
import { getArticleTypeLabel } from "@/config/news";
import { getCourseCategoryLabel } from "@/config/training";
import { getQuestionCategoryLabel } from "@/config/support";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  Article,
  Company,
  Course,
  Event,
  Group,
  Job,
  Post,
  Profile,
  Question,
} from "@/types/database";

type SearchResult = {
  category: SearchResultType;
  description: string;
  href: string;
  id: string;
  meta: string;
  title: string;
};

type SearchPageProps = {
  initialCategory: SearchCategory;
  initialQuery: string;
};

const categoryIcons = {
  companies: Building2,
  events: CalendarDays,
  groups: Users,
  jobs: BriefcaseBusiness,
  news: Newspaper,
  people: UserRound,
  posts: FileText,
  questions: HelpCircle,
  suppliers: Building2,
  training: GraduationCap,
};

const supplierCompanyTypes = [
  "tour_operator",
  "cruise_line",
  "airline",
  "hotel",
  "tourist_board",
  "travel_technology",
  "training_provider",
  "advertising_partner",
  "other",
];

function cleanSearchTerm(value: string) {
  return value
    .replace(/[%(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function getIlikePattern(value: string) {
  const cleaned = cleanSearchTerm(value);

  return `%${cleaned.split(" ").join("%")}%`;
}

function includesCategory(
  activeCategory: SearchCategory,
  category: SearchResultType,
) {
  return activeCategory === "all" || activeCategory === category;
}

function getDescription(value: string | null | undefined, fallback: string) {
  const cleaned = value?.trim();

  return cleaned ? cleaned.slice(0, 180) : fallback;
}

function getResultUrl(result: SearchResult) {
  return result.href;
}

function getCategoryIcon(category: SearchResultType) {
  return categoryIcons[category] ?? Search;
}

export function SearchPage({ initialCategory, initialQuery }: SearchPageProps) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const query = cleanSearchTerm(initialQuery);
  const activeCategory = initialCategory;

  const loadViewer = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      setIsLoading(false);
      return;
    }

    setViewerProfile(profileData as Profile | null);
    setIsLoading(false);
  }, [router, supabase]);

  const runSearch = useCallback(async () => {
    if (!supabase || !query) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const pattern = getIlikePattern(query);
    const nextResults: SearchResult[] = [];

    setIsSearching(true);
    setError(null);

    if (includesCategory(activeCategory, "people")) {
      const { data, error: peopleError } = await supabase
        .from("profiles")
        .select("id, full_name, headline, location, role, verification_tier")
        .or(
          `full_name.ilike.${pattern},headline.ilike.${pattern},location.ilike.${pattern}`,
        )
        .limit(activeCategory === "people" ? 40 : 8);

      if (peopleError) {
        setError(peopleError.message);
        setIsSearching(false);
        return;
      }

      for (const profile of (data ?? []) as Pick<
        Profile,
        "full_name" | "headline" | "id" | "location" | "role"
      >[]) {
        nextResults.push({
          category: "people",
          description: getDescription(profile.headline, "Travel Xchange member"),
          href: `/profile/${profile.id}`,
          id: `people-${profile.id}`,
          meta: [getRoleLabel(profile.role), profile.location].filter(Boolean).join(" - "),
          title: profile.full_name ?? "Unnamed member",
        });
      }
    }

    if (includesCategory(activeCategory, "companies")) {
      const { data, error: companyError } = await supabase
        .from("companies")
        .select("id, name, company_type, description, status")
        .or(`name.ilike.${pattern},description.ilike.${pattern}`)
        .order("name", { ascending: true })
        .limit(activeCategory === "companies" ? 40 : 8);

      if (companyError) {
        setError(companyError.message);
        setIsSearching(false);
        return;
      }

      for (const company of (data ?? []) as Pick<
        Company,
        "company_type" | "description" | "id" | "name" | "status"
      >[]) {
        nextResults.push({
          category: "companies",
          description: getDescription(company.description, "Company profile"),
          href: `/companies/${company.id}`,
          id: `companies-${company.id}`,
          meta: `${getCompanyTypeLabel(company.company_type)} - ${company.status}`,
          title: company.name,
        });
      }
    }

    if (includesCategory(activeCategory, "suppliers")) {
      const { data, error: supplierError } = await supabase
        .from("companies")
        .select("id, name, company_type, description, status")
        .in("company_type", supplierCompanyTypes)
        .or(`name.ilike.${pattern},description.ilike.${pattern}`)
        .order("name", { ascending: true })
        .limit(activeCategory === "suppliers" ? 40 : 8);

      if (supplierError) {
        setError(supplierError.message);
        setIsSearching(false);
        return;
      }

      for (const supplier of (data ?? []) as Pick<
        Company,
        "company_type" | "description" | "id" | "name" | "status"
      >[]) {
        nextResults.push({
          category: "suppliers",
          description: getDescription(supplier.description, "Supplier profile"),
          href: `/suppliers/${supplier.id}`,
          id: `suppliers-${supplier.id}`,
          meta: `${getCompanyTypeLabel(supplier.company_type)} - ${supplier.status}`,
          title: supplier.name,
        });
      }
    }

    if (includesCategory(activeCategory, "posts")) {
      const { data, error: postError } = await supabase
        .from("posts")
        .select("id, title, content, topic, status, created_at")
        .eq("status", "published")
        .or(`title.ilike.${pattern},content.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(activeCategory === "posts" ? 40 : 8);

      if (postError) {
        setError(postError.message);
        setIsSearching(false);
        return;
      }

      for (const post of (data ?? []) as Pick<
        Post,
        "content" | "id" | "title" | "topic"
      >[]) {
        nextResults.push({
          category: "posts",
          description: getDescription(post.content, "Xchange Feed post"),
          href: `/dashboard?post=${post.id}`,
          id: `posts-${post.id}`,
          meta: `Xchange Feed - ${post.topic.replaceAll("_", " ")}`,
          title: post.title ?? post.content.slice(0, 70),
        });
      }
    }

    if (includesCategory(activeCategory, "groups")) {
      const { data, error: groupError } = await supabase
        .from("groups")
        .select("id, name, description, category, visibility, status")
        .eq("status", "active")
        .or(`name.ilike.${pattern},description.ilike.${pattern}`)
        .order("name", { ascending: true })
        .limit(activeCategory === "groups" ? 40 : 8);

      if (groupError) {
        setError(groupError.message);
        setIsSearching(false);
        return;
      }

      for (const group of (data ?? []) as Pick<
        Group,
        "category" | "description" | "id" | "name" | "visibility"
      >[]) {
        nextResults.push({
          category: "groups",
          description: getDescription(group.description, "Community group"),
          href: `/groups/${group.id}`,
          id: `groups-${group.id}`,
          meta: `${getGroupCategoryLabel(group.category)} - ${group.visibility}`,
          title: group.name,
        });
      }
    }

    if (includesCategory(activeCategory, "jobs")) {
      const { data, error: jobError } = await supabase
        .from("jobs")
        .select("id, title, category, description, location, is_remote, status")
        .eq("status", "published")
        .or(`title.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(activeCategory === "jobs" ? 40 : 8);

      if (jobError) {
        setError(jobError.message);
        setIsSearching(false);
        return;
      }

      for (const job of (data ?? []) as Pick<
        Job,
        "category" | "description" | "id" | "is_remote" | "location" | "title"
      >[]) {
        nextResults.push({
          category: "jobs",
          description: getDescription(job.description, "Travel trade job"),
          href: `/jobs/${job.id}`,
          id: `jobs-${job.id}`,
          meta: `${getJobCategoryLabel(job.category)} - ${job.is_remote ? "Remote" : job.location}`,
          title: job.title,
        });
      }
    }

    if (includesCategory(activeCategory, "events")) {
      const { data, error: eventError } = await supabase
        .from("events")
        .select("id, title, description, event_type, location, venue_name, status")
        .eq("status", "published")
        .or(
          `title.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern},venue_name.ilike.${pattern}`,
        )
        .order("starts_at", { ascending: true })
        .limit(activeCategory === "events" ? 40 : 8);

      if (eventError) {
        setError(eventError.message);
        setIsSearching(false);
        return;
      }

      for (const event of (data ?? []) as Pick<
        Event,
        "description" | "event_type" | "id" | "location" | "title" | "venue_name"
      >[]) {
        nextResults.push({
          category: "events",
          description: getDescription(event.description, "Travel trade event"),
          href: `/events/${event.id}`,
          id: `events-${event.id}`,
          meta: `${getEventTypeLabel(event.event_type)} - ${event.location ?? event.venue_name ?? "Location TBC"}`,
          title: event.title,
        });
      }
    }

    if (includesCategory(activeCategory, "news")) {
      const { data, error: articleError } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, content, article_type, status")
        .eq("status", "published")
        .or(`title.ilike.${pattern},excerpt.ilike.${pattern},content.ilike.${pattern}`)
        .order("published_at", { ascending: false })
        .limit(activeCategory === "news" ? 40 : 8);

      if (articleError) {
        setError(articleError.message);
        setIsSearching(false);
        return;
      }

      for (const article of (data ?? []) as Pick<
        Article,
        "article_type" | "content" | "excerpt" | "id" | "slug" | "title"
      >[]) {
        nextResults.push({
          category: "news",
          description: getDescription(article.excerpt ?? article.content, "News article"),
          href: `/news/${article.slug}`,
          id: `news-${article.id}`,
          meta: getArticleTypeLabel(article.article_type),
          title: article.title,
        });
      }
    }

    if (includesCategory(activeCategory, "training")) {
      const { data, error: courseError } = await supabase
        .from("courses")
        .select("id, title, description, category, level, status")
        .eq("status", "published")
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .order("title", { ascending: true })
        .limit(activeCategory === "training" ? 40 : 8);

      if (courseError) {
        setError(courseError.message);
        setIsSearching(false);
        return;
      }

      for (const course of (data ?? []) as Pick<
        Course,
        "category" | "description" | "id" | "level" | "title"
      >[]) {
        nextResults.push({
          category: "training",
          description: getDescription(course.description, "Training course"),
          href: `/training/${course.id}`,
          id: `training-${course.id}`,
          meta: `${getCourseCategoryLabel(course.category)} - ${course.level}`,
          title: course.title,
        });
      }
    }

    if (includesCategory(activeCategory, "questions")) {
      const { data, error: questionError } = await supabase
        .from("questions")
        .select("id, title, content, category, status")
        .in("status", ["published", "resolved"])
        .or(`title.ilike.${pattern},content.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(activeCategory === "questions" ? 40 : 8);

      if (questionError) {
        setError(questionError.message);
        setIsSearching(false);
        return;
      }

      for (const question of (data ?? []) as Pick<
        Question,
        "category" | "content" | "id" | "status" | "title"
      >[]) {
        nextResults.push({
          category: "questions",
          description: getDescription(question.content, "Support question"),
          href: `/support/${question.id}`,
          id: `questions-${question.id}`,
          meta: `${getQuestionCategoryLabel(question.category)} - ${question.status}`,
          title: question.title,
        });
      }
    }

    setResults(nextResults);
    setIsSearching(false);
  }, [activeCategory, query, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadViewer();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadViewer]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void runSearch();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [runSearch]);

  const pageTitle = query ? `Search for "${query}"` : "Search Travel Xchange";

  return (
    <MemberPageShell
      activeLabel="Search"
      eyebrow="Discovery"
      title={pageTitle}
      viewerProfile={viewerProfile}
    >
      <div className="space-y-5">
        {!configured ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Supabase is not configured yet. Add your Supabase keys to .env.local,
            then restart the local app.
          </div>
        ) : null}

        <section className="tx-card p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-[#f52968]" aria-hidden="true" />
                <p className="text-xs font-extrabold uppercase tracking-wide text-[#063b86]">
                  Global search
                </p>
              </div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-normal text-[#061b4f]">
                Find the right travel trade connection
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d6b9e]">
                Search across the MVP areas we have already built. Algolia can
                be added later when the platform needs faster hosted search.
              </p>
            </div>

            <GlobalSearchBox
              category={activeCategory}
              className="self-start"
              initialQuery={query}
              placeholder="Try cruise, Manchester, supplier..."
            />
          </div>
        </section>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          {searchCategoryOptions.map((option) => {
            const params = new URLSearchParams();

            if (query) {
              params.set("q", query);
            }

            if (option.value !== "all") {
              params.set("category", option.value);
            }

            return (
              <Link
                aria-current={activeCategory === option.value ? "page" : undefined}
                className={cn(
                  "min-w-max rounded-lg border px-3 py-2 text-sm font-bold transition",
                  activeCategory === option.value
                    ? "border-[#f52968] bg-white text-[#f52968] shadow-sm"
                    : "border-[#d9e4f5] bg-white/80 text-[#061b4f] hover:border-[#b8cae8] hover:bg-white",
                )}
                href={`/search${params.toString() ? `?${params.toString()}` : ""}`}
                key={option.value}
              >
                {option.label}
              </Link>
            );
          })}
        </nav>

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {error}
          </div>
        ) : null}

        {isLoading || isSearching ? (
          <div className="tx-card p-6 text-sm text-[#4d6b9e]">
            Searching Travel Xchange...
          </div>
        ) : null}

        {!query && !isLoading ? <SearchStarter /> : null}

        {query && !isSearching && !error ? (
          <SearchResults results={results} />
        ) : null}
      </div>
    </MemberPageShell>
  );
}

function SearchStarter() {
  const discoveryCards = [
    {
      description: "Find travel professionals to follow as richer recommendations arrive.",
      href: "/search?category=people&q=travel",
      label: "People",
    },
    {
      description: "Explore active community spaces for cruise, luxury, compliance, and more.",
      href: "/search?category=groups&q=travel",
      label: "Groups",
    },
    {
      description: "Surface supplier updates, news stories, and training content from one place.",
      href: "/search?category=news&q=supplier",
      label: "Supplier updates",
    },
    {
      description: "Find jobs, events, and questions as the trade activity grows.",
      href: "/search?category=jobs&q=travel",
      label: "Opportunities",
    },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="tx-card p-5">
        <h2 className="text-lg font-extrabold text-[#061b4f]">
          Recommended discovery
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {discoveryCards.map((card) => (
            <Link
              className="rounded-lg border border-[#d9e4f5] bg-white p-4 transition hover:border-[#b8cae8] hover:bg-[#f6f9ff]"
              href={card.href}
              key={card.label}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-extrabold text-[#061b4f]">{card.label}</h3>
                <ArrowRight className="size-4 text-[#f52968]" aria-hidden="true" />
              </div>
              <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <aside className="tx-card h-max p-5">
        <h2 className="text-lg font-extrabold text-[#061b4f]">
          Trending topics
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {trendingSearchTopics.map((topic) => (
            <Link
              className="rounded-lg bg-[#eef5ff] px-3 py-2 text-sm font-bold text-[#063b86] transition hover:bg-[#d9e4f5]"
              href={`/search?q=${encodeURIComponent(topic)}`}
              key={topic}
            >
              #{topic}
            </Link>
          ))}
        </div>
      </aside>
    </div>
  );
}

function SearchResults({ results }: { results: SearchResult[] }) {
  if (results.length === 0) {
    return (
      <div className="tx-card p-8 text-center">
        <h2 className="text-lg font-extrabold text-[#061b4f]">
          No matches yet
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#4d6b9e]">
          Try a broader word such as cruise, supplier, marketing, Manchester, or
          training. More advanced filters will come later.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-[#061b4f]">
          {results.length} result{results.length === 1 ? "" : "s"}
        </h2>
      </div>

      {results.map((result) => {
        const Icon = getCategoryIcon(result.category);

        return (
          <Link
            className="tx-card block p-5 transition hover:-translate-y-0.5"
            href={getResultUrl(result)}
            key={result.id}
          >
            <div className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#eef5ff] text-[#063b86]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[#fff1f3] px-2 py-1 text-xs font-extrabold uppercase tracking-wide text-[#f52968]">
                    {getSearchCategoryLabel(result.category)}
                  </span>
                  <span className="text-xs font-bold text-[#7288b8]">
                    {result.meta}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-extrabold text-[#061b4f]">
                  {result.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
                  {result.description}
                </p>
              </div>
              <ArrowRight className="mt-1 size-5 shrink-0 text-[#f52968]" aria-hidden="true" />
            </div>
          </Link>
        );
      })}
    </section>
  );
}
