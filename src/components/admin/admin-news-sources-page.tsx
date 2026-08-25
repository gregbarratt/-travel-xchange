"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  PlayCircle,
  Rss,
  XCircle,
} from "lucide-react";

import { AdminEmptyState, AdminStatusBadge } from "@/components/admin/admin-ui";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  NewsIngestionRun,
  NewsIngestionSourceRun,
  NewsSource,
  NewsSourceHealth,
} from "@/types/database";

/**
 * Super admin control panel for automated trade news.
 *
 * Every publisher ships disabled with no feed URL. Turning one on is a
 * deliberate act here: paste the endpoint, run a live test, look at what it
 * would actually publish, then save and enable. Nothing about a source is
 * guessed, and switching off a misbehaving feed never needs a deploy.
 */

type SourceWithCounts = NewsSource & {
  counts: { published: number; pending: number };
};

type SourcesPayload = {
  sources: SourceWithCounts[];
  recentRuns: NewsIngestionRun[];
  recentSourceRuns: NewsIngestionSourceRun[];
  error?: string;
};

type TestPreviewItem = {
  title: string;
  link: string | null;
  summary: string | null;
  publishedAt: string | null;
  sensitivity: string;
  topics: Array<{ slug: string; confidence: number }>;
};

type TestPayload = {
  ok?: boolean;
  error?: string;
  feedFormat?: string;
  feedTitle?: string;
  itemCount?: number;
  httpStatus?: number;
  supportsConditionalRequests?: boolean;
  saved?: boolean;
  preview?: TestPreviewItem[];
};

const phase31SetupMessage =
  "The Phase 31 news tables are not installed yet. Run supabase/phase-31-news-ingestion.sql in Supabase, then refresh this page.";

const healthTone: Record<NewsSourceHealth, "green" | "amber" | "red" | "slate"> = {
  disabled: "slate",
  failing: "red",
  healthy: "green",
  unverified: "amber",
  warning: "amber",
};

const healthLabel: Record<NewsSourceHealth, string> = {
  disabled: "Disabled",
  failing: "Failing",
  healthy: "Healthy",
  unverified: "Unverified",
  warning: "Warning",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return date.toLocaleString("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AdminNewsSourcesPage() {
  return (
    <AdminPageShell
      activeHref="/admin/news-sources"
      description="Verify publisher feeds, control automated ingestion and review incoming trade news."
      title="News sources"
    >
      {() => <NewsSourcesPanel />}
    </AdminPageShell>
  );
}

function NewsSourcesPanel() {
  const configured = isSupabaseConfigured();
  const supabase = useMemo(
    () => (configured ? createSupabaseBrowserClient() : null),
    [configured],
  );

  const [sources, setSources] = useState<SourceWithCounts[]>([]);
  const [recentRuns, setRecentRuns] = useState<NewsIngestionRun[]>([]);
  const [sourceRuns, setSourceRuns] = useState<NewsIngestionSourceRun[]>([]);
  const [feedUrlDrafts, setFeedUrlDrafts] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, TestPayload>>({});
  const [busySourceId, setBusySourceId] = useState<string | null>(null);
  const [isRunningIngestion, setIsRunningIngestion] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getAccessToken = useCallback(async () => {
    if (!supabase) {
      return null;
    }

    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [supabase]);

  const loadSources = useCallback(async () => {
    const token = await getAccessToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    const response = await fetch("/api/admin/news/sources", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await response.json().catch(() => ({}))) as SourcesPayload;

    if (!response.ok) {
      setError(
        payload.error?.includes("news_sources") ? phase31SetupMessage : payload.error ?? "The news sources could not be loaded.",
      );
      setIsLoading(false);
      return;
    }

    setSources(payload.sources ?? []);
    setRecentRuns(payload.recentRuns ?? []);
    setSourceRuns(payload.recentSourceRuns ?? []);
    setError(null);
    setIsLoading(false);
  }, [getAccessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSources();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadSources]);

  const testSource = useCallback(
    async (source: SourceWithCounts, save: boolean) => {
      const token = await getAccessToken();

      if (!token) {
        return;
      }

      setBusySourceId(source.id);
      setMessage(null);

      const feedUrl = (feedUrlDrafts[source.id] ?? source.feed_url ?? "").trim();

      const response = await fetch(`/api/admin/news/sources/${source.id}/test`, {
        body: JSON.stringify({ feedUrl, save }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response.json().catch(() => ({}))) as TestPayload;
      setTestResults((current) => ({ ...current, [source.id]: payload }));

      if (payload.saved) {
        setMessage(
          `${source.name}: feed verified and saved. Switch the source on when you are ready.`,
        );
        await loadSources();
      }

      setBusySourceId(null);
    },
    [feedUrlDrafts, getAccessToken, loadSources],
  );

  const updateSource = useCallback(
    async (sourceId: string, patch: Record<string, unknown>) => {
      const token = await getAccessToken();

      if (!token) {
        return;
      }

      setBusySourceId(sourceId);

      const response = await fetch(`/api/admin/news/sources/${sourceId}`, {
        body: JSON.stringify(patch),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "That change could not be saved.");
      } else {
        setError(null);
        await loadSources();
      }

      setBusySourceId(null);
    },
    [getAccessToken, loadSources],
  );

  const runIngestionNow = useCallback(async () => {
    const token = await getAccessToken();

    if (!token) {
      return;
    }

    setIsRunningIngestion(true);
    setMessage(null);

    const response = await fetch("/api/news/ingest", {
      headers: { Authorization: `Bearer ${token}` },
      method: "POST",
    });

    const payload = (await response.json().catch(() => ({}))) as {
      status?: string;
      reason?: string;
      error?: string;
      totals?: { newItemCount: number; publishedCount: number; moderationCount: number };
    };

    if (!response.ok) {
      setError(payload.error ?? "The ingestion run failed.");
    } else if (payload.status === "skipped") {
      setMessage(payload.reason ?? "Another ingestion run is already in progress.");
    } else {
      setMessage(
        `Ingestion complete: ${payload.totals?.newItemCount ?? 0} new, ${payload.totals?.publishedCount ?? 0} published, ${payload.totals?.moderationCount ?? 0} awaiting review.`,
      );
      await loadSources();
    }

    setIsRunningIngestion(false);
  }, [getAccessToken, loadSources]);

  const lastRunBySource = useMemo(() => {
    const map = new Map<string, NewsIngestionSourceRun>();

    for (const run of sourceRuns) {
      if (!map.has(run.source_id)) {
        map.set(run.source_id, run);
      }
    }

    return map;
  }, [sourceRuns]);

  const enabledCount = sources.filter((source) => source.enabled).length;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-[#d6e2f5] bg-white p-5 shadow-[0_10px_22px_rgba(7,36,91,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Rss className="size-5 text-[#063b86]" aria-hidden="true" />
              <h2 className="text-lg font-extrabold text-[#061b4f]">
                Automated trade news
              </h2>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#3d4d6b]">
              Ingestion runs on the platform scheduler every 15 minutes and polls only
              the sources that are enabled and due. A source cannot be enabled until a
              real feed endpoint has been tested here, so no publisher is contacted on
              a guessed URL.
            </p>
            <p className="mt-2 text-sm font-semibold text-[#061b4f]">
              {enabledCount} of {sources.length} sources enabled
            </p>
          </div>
          <Button
            className="shrink-0"
            disabled={isRunningIngestion || enabledCount === 0}
            onClick={() => void runIngestionNow()}
            type="button"
          >
            {isRunningIngestion ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <PlayCircle className="size-4" aria-hidden="true" />
            )}
            Run ingestion now
          </Button>
        </div>
      </section>

      {message ? (
        <div className="rounded-lg border border-[#bfe3d3] bg-[#f0fbf6] p-4 text-sm font-semibold leading-6 text-[#0b5b3f]">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border border-[#d6e2f5] bg-white p-6 text-sm font-semibold text-[#3d4d6b]">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading news sources...
        </div>
      ) : null}

      {!isLoading && sources.length === 0 && !error ? (
        <AdminEmptyState title="No news sources configured">
          Run supabase/phase-31-news-ingestion.sql to install the publisher source pool,
          then verify a feed endpoint before enabling it.
        </AdminEmptyState>
      ) : null}

      <div className="space-y-4">
        {sources.map((source) => {
          const test = testResults[source.id];
          const lastRun = lastRunBySource.get(source.id);
          const draft = feedUrlDrafts[source.id] ?? source.feed_url ?? "";

          return (
            <article
              className="rounded-lg border border-[#d6e2f5] bg-white p-5 shadow-[0_10px_22px_rgba(7,36,91,0.06)]"
              key={source.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold text-[#061b4f]">{source.name}</h3>
                    <AdminStatusBadge tone={healthTone[source.health_status]}>
                      {healthLabel[source.health_status]}
                    </AdminStatusBadge>
                    <AdminStatusBadge tone={source.enabled ? "green" : "slate"}>
                      {source.enabled ? "Enabled" : "Off"}
                    </AdminStatusBadge>
                    <AdminStatusBadge tone={source.auto_publish ? "green" : "amber"}>
                      {source.auto_publish ? "Auto-publish" : "Moderated"}
                    </AdminStatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-[#3d4d6b]">
                    {source.publisher} &middot;{" "}
                    <a
                      className="inline-flex items-center gap-1 font-semibold text-[#063b86] hover:underline"
                      href={source.website_url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {source.website_url.replace(/^https?:\/\//, "")}
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#5b6b8a]">
                    Last success: {formatDateTime(source.last_success_at)} &middot; Last attempt:{" "}
                    {formatDateTime(source.last_attempt_at)} &middot; {source.counts.published}{" "}
                    published, {source.counts.pending} awaiting review
                  </p>
                  {source.consecutive_failures > 0 ? (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-[#a3261f]">
                      <AlertTriangle className="size-3.5" aria-hidden="true" />
                      {source.consecutive_failures} consecutive failures
                      {source.last_error ? `: ${source.last_error}` : ""}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    disabled={busySourceId === source.id || !source.feed_url}
                    onClick={() => void updateSource(source.id, { enabled: !source.enabled })}
                    type="button"
                    variant={source.enabled ? "outline" : "default"}
                  >
                    {source.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    disabled={busySourceId === source.id}
                    onClick={() =>
                      void updateSource(source.id, { autoPublish: !source.auto_publish })
                    }
                    type="button"
                    variant="outline"
                  >
                    {source.auto_publish ? "Require moderation" : "Allow auto-publish"}
                  </Button>
                </div>
              </div>

              {source.rights_notes ? (
                <p className="mt-3 rounded-md border border-[#eef2f9] bg-[#f8fbff] p-3 text-xs leading-5 text-[#3d4d6b]">
                  {source.rights_notes}
                </p>
              ) : null}

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <TextField
                  hint="Paste the publisher's real RSS, Atom or JSON feed endpoint. Travel Xchange never guesses one."
                  label="Feed URL"
                  name={`feed-url-${source.id}`}
                  onChange={(event) =>
                    setFeedUrlDrafts((current) => ({
                      ...current,
                      [source.id]: event.target.value,
                    }))
                  }
                  placeholder="https://publisher.example/feed"
                  value={draft}
                />
                <div className="flex gap-2">
                  <Button
                    disabled={busySourceId === source.id || !draft.trim()}
                    onClick={() => void testSource(source, false)}
                    type="button"
                    variant="outline"
                  >
                    {busySourceId === source.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    Test source
                  </Button>
                  <Button
                    disabled={busySourceId === source.id || !draft.trim()}
                    onClick={() => void testSource(source, true)}
                    type="button"
                  >
                    Test and save
                  </Button>
                </div>
              </div>

              {test ? (
                <div
                  className={cn(
                    "mt-4 rounded-md border p-4",
                    test.ok
                      ? "border-[#bfe3d3] bg-[#f0fbf6]"
                      : "border-amber-200 bg-amber-50",
                  )}
                >
                  <p className="flex items-center gap-2 text-sm font-bold text-[#061b4f]">
                    {test.ok ? (
                      <CheckCircle2 className="size-4 text-[#0b5b3f]" aria-hidden="true" />
                    ) : (
                      <XCircle className="size-4 text-[#a3261f]" aria-hidden="true" />
                    )}
                    {test.ok
                      ? `${test.feedFormat?.toUpperCase()} feed with ${test.itemCount} items${
                          test.supportsConditionalRequests
                            ? ", supports conditional requests"
                            : ", no ETag or Last-Modified"
                        }`
                      : test.error}
                  </p>

                  {test.preview && test.preview.length > 0 ? (
                    <>
                      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[#5b6b8a]">
                        What Travel Xchange would publish
                      </p>
                      <ul className="mt-2 space-y-2">
                        {test.preview.map((item) => (
                          <li
                            className="rounded-md border border-[#d6e2f5] bg-white p-3"
                            key={`${source.id}-${item.title}`}
                          >
                            <p className="text-sm font-bold text-[#061b4f]">{item.title}</p>
                            {item.summary ? (
                              <p className="mt-1 text-xs leading-5 text-[#3d4d6b]">
                                {item.summary}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs italic leading-5 text-[#5b6b8a]">
                                No usable description in the feed. The card would show the
                                headline and source link only.
                              </p>
                            )}
                            <p className="mt-1 text-xs font-semibold text-[#5b6b8a]">
                              {item.topics.map((topic) => topic.slug).join(", ") ||
                                "no topic matched"}
                              {item.sensitivity !== "routine"
                                ? ` · ${item.sensitivity.replace("_", " ")} · holds for moderation`
                                : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              ) : null}

              {lastRun ? (
                <p className="mt-3 text-xs font-semibold text-[#5b6b8a]">
                  Last run: {lastRun.status}
                  {lastRun.http_status ? ` (HTTP ${lastRun.http_status})` : ""} &middot;{" "}
                  {lastRun.discovered_count} discovered, {lastRun.new_item_count} new,{" "}
                  {lastRun.duplicate_count} duplicate
                  {lastRun.error_message ? ` · ${lastRun.error_message}` : ""}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>

      {recentRuns.length > 0 ? (
        <section className="rounded-lg border border-[#d6e2f5] bg-white p-5 shadow-[0_10px_22px_rgba(7,36,91,0.06)]">
          <h2 className="text-lg font-extrabold text-[#061b4f]">Recent ingestion runs</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-wide text-[#5b6b8a]">
                  <th className="py-2 pr-3">Started</th>
                  <th className="py-2 pr-3">Trigger</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Sources</th>
                  <th className="py-2 pr-3">New</th>
                  <th className="py-2 pr-3">Published</th>
                  <th className="py-2 pr-3">Review</th>
                  <th className="py-2">Failures</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr className="border-t border-[#eef2f9] text-[#3d4d6b]" key={run.id}>
                    <td className="py-2 pr-3">{formatDateTime(run.started_at)}</td>
                    <td className="py-2 pr-3">{run.trigger}</td>
                    <td className="py-2 pr-3 font-semibold text-[#061b4f]">{run.status}</td>
                    <td className="py-2 pr-3">{run.source_count}</td>
                    <td className="py-2 pr-3">{run.new_item_count}</td>
                    <td className="py-2 pr-3">{run.published_count}</td>
                    <td className="py-2 pr-3">{run.moderation_count}</td>
                    <td className="py-2">{run.failure_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
