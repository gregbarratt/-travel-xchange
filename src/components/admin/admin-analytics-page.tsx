"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CreditCard,
  GraduationCap,
  Megaphone,
  MousePointerClick,
  Newspaper,
  TrendingUp,
  Users,
} from "lucide-react";

import { AdminEmptyState, AdminStatusBadge } from "@/components/admin/admin-ui";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { recordAnalyticsEvent } from "@/lib/analytics";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type {
  AnalyticsEvent,
  BillingInvoice,
  DashboardMetric,
  FeedPost,
} from "@/types/database";

type MetricCard = {
  change?: string;
  icon: typeof Users;
  label: string;
  tone: "blue" | "green" | "pink" | "amber";
  value: string;
};

type PopularPost = {
  commentCount: number;
  content: string;
  id: string;
  likeCount: number;
};

const phase16SetupMessage =
  "The Phase 16 analytics tables are not installed yet. Run supabase/phase-16-analytics.sql in Supabase, then refresh this page.";

const metricToneClasses = {
  amber: "bg-amber-50 text-amber-800",
  blue: "bg-[#eef5ff] text-[#063b86]",
  green: "bg-emerald-50 text-emerald-800",
  pink: "bg-[#fff1f3] text-[#f52968]",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}

function formatMoneyFromPence(value: number) {
  return new Intl.NumberFormat("en-GB", {
    currency: "GBP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function AdminAnalyticsPage() {
  return (
    <AdminPageShell
      activeHref="/admin/analytics"
      description="Track early platform growth, engagement, adverts, training, and revenue placeholders from one owner dashboard."
      title="Analytics dashboard"
    >
      {({ userId }) => <AdminAnalyticsContent userId={userId} />}
    </AdminPageShell>
  );
}

function AdminAnalyticsContent({ userId }: { userId: string }) {
  const configured = isSupabaseConfigured();
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetric[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [popularPosts, setPopularPosts] = useState<PopularPost[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [isRecording, setIsRecording] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadAnalytics = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

    const [
      memberCount,
      newMemberCount,
      activeUserEvents,
      postCount,
      jobCount,
      articleCount,
      enrolmentCount,
      adImpressionCount,
      adClickCount,
      invoiceRows,
      eventRows,
      dashboardMetricRows,
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgoIso),
      supabase
        .from("analytics_events")
        .select("user_id, created_at")
        .gte("created_at", thirtyDaysAgoIso)
        .limit(1000),
      supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("articles")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("course_enrolments")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("ad_impressions")
        .select("*", { count: "exact", head: true }),
      supabase.from("ad_clicks").select("*", { count: "exact", head: true }),
      supabase
        .from("invoices")
        .select("amount_paid, currency, status")
        .limit(1000),
      supabase
        .from("analytics_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("dashboard_metrics")
        .select("*")
        .order("label", { ascending: true }),
    ]);

    const firstError =
      memberCount.error ??
      newMemberCount.error ??
      activeUserEvents.error ??
      postCount.error ??
      jobCount.error ??
      articleCount.error ??
      enrolmentCount.error ??
      adImpressionCount.error ??
      adClickCount.error ??
      invoiceRows.error ??
      eventRows.error ??
      dashboardMetricRows.error;

    if (firstError) {
      setError(
        isMissingTableError(firstError, ["analytics_events", "dashboard_metrics"])
          ? phase16SetupMessage
          : firstError.message,
      );
      setIsLoading(false);
      return;
    }

    const uniqueActiveUsers = new Set(
      ((activeUserEvents.data ?? []) as Pick<AnalyticsEvent, "user_id">[])
        .map((event) => event.user_id)
        .filter(Boolean),
    );
    const typedInvoices = (invoiceRows.data ?? []) as Pick<
      BillingInvoice,
      "amount_paid" | "currency" | "status"
    >[];
    const paidRevenuePence = typedInvoices
      .filter(
        (invoice) =>
          invoice.status === "paid" &&
          invoice.currency?.toLowerCase() === "gbp" &&
          invoice.amount_paid,
      )
      .reduce((total, invoice) => total + (invoice.amount_paid ?? 0), 0);

    setMetrics([
      {
        change: `${formatNumber(newMemberCount.count ?? 0)} new in 30 days`,
        icon: Users,
        label: "Members",
        tone: "blue",
        value: formatNumber(memberCount.count ?? 0),
      },
      {
        change: "Tracked by analytics events",
        icon: Activity,
        label: "Active users 30d",
        tone: "green",
        value: formatNumber(uniqueActiveUsers.size),
      },
      {
        change: "Published feed posts",
        icon: TrendingUp,
        label: "Popular content pool",
        tone: "pink",
        value: formatNumber(postCount.count ?? 0),
      },
      {
        change: "Published roles",
        icon: BriefcaseBusiness,
        label: "Jobs live",
        tone: "amber",
        value: formatNumber(jobCount.count ?? 0),
      },
      {
        change: "Published stories",
        icon: Newspaper,
        label: "News articles",
        tone: "blue",
        value: formatNumber(articleCount.count ?? 0),
      },
      {
        change: "Course enrolments",
        icon: GraduationCap,
        label: "Training engagement",
        tone: "green",
        value: formatNumber(enrolmentCount.count ?? 0),
      },
      {
        change: `${formatNumber(adClickCount.count ?? 0)} advert clicks`,
        icon: Megaphone,
        label: "Ad impressions",
        tone: "pink",
        value: formatNumber(adImpressionCount.count ?? 0),
      },
      {
        change: "Stripe paid invoices",
        icon: CreditCard,
        label: "Revenue tracked",
        tone: "amber",
        value: formatMoneyFromPence(paidRevenuePence),
      },
    ]);
    setEvents((eventRows.data ?? []) as AnalyticsEvent[]);
    setDashboardMetrics((dashboardMetricRows.data ?? []) as DashboardMetric[]);
    setError(null);

    const { data: postRows } = await supabase
      .from("posts")
      .select("id, content")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(10);

    const typedPosts = (postRows ?? []) as Pick<FeedPost, "content" | "id">[];
    const postIds = typedPosts.map((post) => post.id);

    if (postIds.length > 0) {
      const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
        supabase.from("post_likes").select("post_id").in("post_id", postIds),
        supabase
          .from("comments")
          .select("post_id")
          .in("post_id", postIds)
          .eq("status", "published"),
      ]);

      const likesByPost = countByPostId((likeRows ?? []) as Array<{ post_id: string }>);
      const commentsByPost = countByPostId(
        (commentRows ?? []) as Array<{ post_id: string }>,
      );

      setPopularPosts(
        typedPosts
          .map((post) => ({
            commentCount: commentsByPost[post.id] ?? 0,
            content: post.content,
            id: post.id,
            likeCount: likesByPost[post.id] ?? 0,
          }))
          .sort(
            (first, second) =>
              second.likeCount +
              second.commentCount -
              (first.likeCount + first.commentCount),
          )
          .slice(0, 5),
      );
    } else {
      setPopularPosts([]);
    }

    setIsLoading(false);
  }, [supabase]);

  async function handleRecordTestEvent() {
    if (!supabase) {
      return;
    }

    setIsRecording(true);
    setError(null);

    const { error: eventError } = await recordAnalyticsEvent(supabase, {
      eventName: "admin.analytics_test",
      metadata: { source: "Phase 16 analytics dashboard" },
      pagePath: "/admin/analytics",
      userId,
    });

    if (eventError) {
      setError(eventError.message);
      setIsRecording(false);
      return;
    }

    setMessage("Analytics test event recorded.");
    setIsRecording(false);
    await loadAnalytics();
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAnalytics();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAnalytics]);

  if (isLoading) {
    return (
      <div className="tx-card p-6 text-sm text-[#4d6b9e]">
        Loading analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="tx-card border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article className="tx-card p-5" key={metric.label}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[#4d6b9e]">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-[#061b4f]">
                    {metric.value}
                  </p>
                  {metric.change ? (
                    <p className="mt-2 text-xs font-bold text-[#7288b8]">
                      {metric.change}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${metricToneClasses[metric.tone]}`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="tx-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#061b4f]">
                Popular posts
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#4d6b9e]">
                Ranked with the likes and comments we already track.
              </p>
            </div>
          </div>

          {popularPosts.length === 0 ? (
            <AdminEmptyState title="No post engagement yet">
              Popular posts will appear after members like and comment on feed
              posts.
            </AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-3">
              {popularPosts.map((post, index) => (
                <div className="rounded-lg border border-[#d9e4f5] p-4" key={post.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-[#f52968]">
                      #{index + 1}
                    </p>
                    <div className="flex gap-2">
                      <AdminStatusBadge tone="blue">
                        {post.likeCount} likes
                      </AdminStatusBadge>
                      <AdminStatusBadge tone="green">
                        {post.commentCount} comments
                      </AdminStatusBadge>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#203b70]">
                    {post.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="tx-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-[#061b4f]">
                  Event tracking
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#4d6b9e]">
                  Record a safe test event to confirm analytics writes work.
                </p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-lg bg-[#eef5ff] text-[#063b86]">
                <MousePointerClick className="size-5" aria-hidden="true" />
              </span>
            </div>
            <Button
              className="tx-action mt-4 w-full"
              disabled={isRecording}
              onClick={handleRecordTestEvent}
              type="button"
            >
              {isRecording ? "Recording..." : "Record test event"}
            </Button>
          </section>

          <section className="tx-card p-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-[#063b86]" aria-hidden="true" />
              <h2 className="text-lg font-extrabold text-[#061b4f]">
                Placeholder metrics
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              {dashboardMetrics.map((metric) => (
                <div
                  className="rounded-lg border border-[#d9e4f5] bg-white p-3"
                  key={metric.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-[#061b4f]">{metric.label}</p>
                    <span className="text-sm font-extrabold text-[#f52968]">
                      {formatNumber(metric.value)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium capitalize text-[#7288b8]">
                    {metric.period.replaceAll("_", " ")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="tx-card p-5">
        <h2 className="text-lg font-extrabold text-[#061b4f]">
          Latest analytics events
        </h2>
        {events.length === 0 ? (
          <AdminEmptyState title="No analytics events yet">
            Events will appear here as we add tracking to important workflows.
          </AdminEmptyState>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-[#d9e4f5]">
            <div className="divide-y divide-[#d9e4f5]">
              {events.map((event) => (
                <div
                  className="grid gap-2 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_170px]"
                  key={event.id}
                >
                  <div>
                    <p className="font-bold text-[#061b4f]">{event.event_name}</p>
                    <p className="mt-1 text-sm text-[#4d6b9e]">
                      {event.page_path ?? "No page path"}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-[#7288b8] sm:text-right">
                    {formatDate(event.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function countByPostId(rows: Array<{ post_id: string }>) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.post_id] = (counts[row.post_id] ?? 0) + 1;
    return counts;
  }, {});
}
