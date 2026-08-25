import { classifyArticle, requiresModeration } from "./classify.ts";
import { fetchFeed, type FeedFetchRequest } from "./fetch-feed.ts";
import { FeedParseError, parseFeed, type ParsedFeedItem } from "./feed-parser.ts";
import { buildArticleSummary } from "./summarise.ts";
import { canonicaliseUrl, hashCanonicalUrl, titleFingerprint } from "./url.ts";
import type {
  IngestionSource,
  IngestionTrigger,
  NewsStore,
  RunTotals,
  SourceHealth,
  SourceRunRecord,
} from "./types.ts";

/**
 * The scheduled ingestion run.
 *
 * Design rules that the tests pin down:
 *
 * - one failing publisher never fails the run, so each source is wrapped and
 *   its outcome recorded independently;
 * - a second concurrent invocation exits without touching a feed, because the
 *   run slot is claimed in the database before any work starts;
 * - nothing is published that a moderator should have seen first;
 * - the run always closes its own record, including when a source throws.
 */

export type IngestionOptions = {
  trigger?: IngestionTrigger;
  now?: Date;
  /** Overrides passed through to the fetcher, used by tests. */
  fetchOptions?: Pick<
    FeedFetchRequest,
    "fetchImpl" | "resolveHostname" | "timeoutMs" | "maxBytes" | "attempts"
  >;
  /** Cap on sources handled in one invocation, to stay inside a function timeout. */
  maxSources?: number;
};

export type SourceOutcome = {
  sourceId: string;
  sourceSlug: string;
  status: SourceRunRecord["status"];
  httpStatus: number | null;
  discoveredCount: number;
  newItemCount: number;
  duplicateCount: number;
  publishedCount: number;
  moderationCount: number;
  errorMessage: string | null;
};

export type IngestionResult = {
  status: "completed" | "skipped";
  runId: string | null;
  totals: RunTotals;
  sources: SourceOutcome[];
  reason?: string;
};

/** Consecutive failures before a source stops being reported as healthy. */
const warningThreshold = 1;
const failingThreshold = 3;

function nextHealth(consecutiveFailures: number): SourceHealth {
  if (consecutiveFailures >= failingThreshold) {
    return "failing";
  }

  if (consecutiveFailures > warningThreshold) {
    return "warning";
  }

  return consecutiveFailures > 0 ? "warning" : "healthy";
}

function emptyTotals(): RunTotals {
  return {
    duplicateCount: 0,
    failureCount: 0,
    fetchedCount: 0,
    moderationCount: 0,
    newItemCount: 0,
    notModifiedCount: 0,
    publishedCount: 0,
    sourceCount: 0,
  };
}

/**
 * True when the source is not yet due for another poll.
 *
 * The cron fires on a fixed cadence for everyone; per-source intervals are
 * honoured here so a publisher asking for hourly polling gets hourly polling.
 */
export function isSourceDue(source: IngestionSource, now: Date) {
  if (!source.lastAttemptAt) {
    return true;
  }

  const lastAttempt = Date.parse(source.lastAttemptAt);

  if (Number.isNaN(lastAttempt)) {
    return true;
  }

  const elapsedMinutes = (now.getTime() - lastAttempt) / 60_000;

  // A small tolerance stops a source slipping a whole cycle when the cron
  // fires a few seconds early.
  return elapsedMinutes >= source.pollingIntervalMinutes - 0.5;
}

type PreparedItem = {
  canonicalUrl: string;
  canonicalUrlHash: string;
  titleFingerprint: string;
  title: string;
  publishedAt: string | null;
};

function prepareItem(
  item: ParsedFeedItem,
  homepageUrl: string | null,
  websiteUrl: string,
): PreparedItem | null {
  const title = item.title.trim();
  const base = homepageUrl ?? websiteUrl;
  const canonicalUrl = item.link ? canonicaliseUrl(item.link, base) : null;

  if (!title || !canonicalUrl) {
    return null;
  }

  return {
    canonicalUrl,
    canonicalUrlHash: hashCanonicalUrl(canonicalUrl),
    publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
    title,
    titleFingerprint: titleFingerprint(title),
  };
}

async function ingestSource(
  store: NewsStore,
  source: IngestionSource,
  topicIdsBySlug: Map<string, string>,
  knownCompanies: Array<{ id: string; name: string }>,
  options: IngestionOptions,
  now: Date,
): Promise<SourceOutcome> {
  const startedAt = Date.now();
  const outcome: SourceOutcome = {
    discoveredCount: 0,
    duplicateCount: 0,
    errorMessage: null,
    httpStatus: null,
    moderationCount: 0,
    newItemCount: 0,
    publishedCount: 0,
    sourceId: source.id,
    sourceSlug: source.slug,
    status: "failed",
  };

  if (!source.feedUrl) {
    outcome.status = "skipped";
    outcome.errorMessage = "The source has no verified feed URL.";
    return outcome;
  }

  await store.updateSource(source.id, { lastAttemptAt: now.toISOString() });

  const response = await fetchFeed({
    etag: source.requestEtag,
    lastModified: source.requestLastModified,
    url: source.feedUrl,
    ...options.fetchOptions,
  });

  if (response.status === "not_modified") {
    outcome.status = "not_modified";
    outcome.httpStatus = response.httpStatus;
    await store.updateSource(source.id, {
      consecutiveFailures: 0,
      healthStatus: "healthy",
      lastError: null,
      lastSuccessAt: now.toISOString(),
    });
    return outcome;
  }

  if (response.status === "failed") {
    const consecutiveFailures = source.consecutiveFailures + 1;
    outcome.httpStatus = response.httpStatus;
    outcome.errorMessage = response.error;
    await store.updateSource(source.id, {
      consecutiveFailures,
      healthStatus: nextHealth(consecutiveFailures),
      lastError: response.error,
    });
    return outcome;
  }

  outcome.httpStatus = response.httpStatus;

  let feed;

  try {
    feed = parseFeed(response.body);
  } catch (error) {
    const message =
      error instanceof FeedParseError ? error.message : "The feed could not be parsed.";
    const consecutiveFailures = source.consecutiveFailures + 1;
    outcome.errorMessage = message;
    await store.updateSource(source.id, {
      consecutiveFailures,
      healthStatus: nextHealth(consecutiveFailures),
      lastError: message,
    });
    return outcome;
  }

  outcome.discoveredCount = feed.items.length;

  // Feeds regularly repeat an item within a single response.
  const seenInThisResponse = new Set<string>();

  for (const item of feed.items) {
    const prepared = prepareItem(item, feed.homepageUrl, source.websiteUrl);

    if (!prepared) {
      continue;
    }

    const responseKey = item.externalGuid ?? prepared.canonicalUrlHash;

    if (seenInThisResponse.has(responseKey)) {
      outcome.duplicateCount += 1;
      continue;
    }

    seenInThisResponse.add(responseKey);

    const existing = await store.findItemInSource(
      source.id,
      item.externalGuid,
      prepared.canonicalUrlHash,
    );

    if (existing) {
      outcome.duplicateCount += 1;
      continue;
    }

    const crossSource = await store.findCrossSourceDuplicate(
      prepared.canonicalUrlHash,
      prepared.titleFingerprint,
      prepared.publishedAt,
    );

    const inserted = await store.insertItem({
      author: item.author,
      canonicalUrl: prepared.canonicalUrl,
      canonicalUrlHash: prepared.canonicalUrlHash,
      duplicateOfItemId: crossSource?.id ?? null,
      externalGuid: item.externalGuid,
      imageUrl: item.imageUrl,
      originalDescription: item.description || null,
      processingStatus: crossSource ? "duplicate" : "processed",
      publishedAt: prepared.publishedAt,
      sourceId: source.id,
      sourceUrl: item.link ?? prepared.canonicalUrl,
      title: prepared.title,
      titleFingerprint: prepared.titleFingerprint,
    });

    if (crossSource) {
      // The story is already on Travel Xchange from another publisher. Keep the
      // record for provenance, but do not publish a second card for it.
      outcome.duplicateCount += 1;
      continue;
    }

    outcome.newItemCount += 1;

    const summary = buildArticleSummary(item.description, prepared.title);
    const classification = classifyArticle(
      prepared.title,
      summary.summary ?? "",
      source.defaultTopicSlugs,
      knownCompanies,
    );

    const needsModeration = requiresModeration({
      autoPublish: source.autoPublish,
      confidence: classification.confidence,
      sensitivity: classification.sensitivity,
      trustLevel: source.trustLevel,
    });

    const publishedAt = prepared.publishedAt ?? now.toISOString();

    const post = await store.insertPost({
      autoPublished: !needsModeration,
      canonicalUrl: prepared.canonicalUrl,
      classificationConfidence: classification.confidence,
      imageUrl: item.imageUrl,
      newsItemId: inserted.id,
      publishedAt,
      publishedToFeedAt: needsModeration ? null : now.toISOString(),
      publisher: source.publisher,
      requiresModeration: needsModeration,
      sensitivity: classification.sensitivity,
      sourceId: source.id,
      status: needsModeration ? "pending_review" : "published",
      summary: summary.summary,
      title: prepared.title,
    });

    const topics = classification.topics
      .map((topic) => {
        const topicId = topicIdsBySlug.get(topic.slug);

        if (!topicId) {
          return null;
        }

        return {
          assignedBy: source.defaultTopicSlugs.includes(topic.slug)
            ? ("source_default" as const)
            : ("rules" as const),
          confidence: topic.confidence,
          topicId,
        };
      })
      .filter((topic): topic is NonNullable<typeof topic> => topic !== null);

    if (topics.length > 0) {
      await store.setPostTopics(post.id, topics);
    }

    if (needsModeration) {
      outcome.moderationCount += 1;
    } else {
      outcome.publishedCount += 1;
      await store.recordModerationEvent(post.id, "auto_published");
    }
  }

  outcome.status = "succeeded";

  await store.updateSource(source.id, {
    consecutiveFailures: 0,
    healthStatus: "healthy",
    lastError: null,
    lastSuccessAt: now.toISOString(),
    requestEtag: response.etag,
    requestLastModified: response.lastModified,
  });

  void startedAt;

  return outcome;
}

/**
 * Runs one ingestion pass over every source that is enabled and due.
 */
export async function runIngestion(
  store: NewsStore,
  options: IngestionOptions = {},
): Promise<IngestionResult> {
  const now = options.now ?? new Date();
  const trigger = options.trigger ?? "cron";
  const startedAt = Date.now();

  const runId = await store.beginRun(trigger);

  if (!runId) {
    return {
      reason: "Another ingestion run is already in progress.",
      runId: null,
      sources: [],
      status: "skipped",
      totals: emptyTotals(),
    };
  }

  const totals = emptyTotals();
  const outcomes: SourceOutcome[] = [];

  try {
    const allSources = await store.listDueSources(now);
    const dueSources = allSources
      .filter((source) => source.enabled && source.feedUrl && isSourceDue(source, now))
      .slice(0, options.maxSources ?? 25);

    totals.sourceCount = dueSources.length;

    const [topicIdsBySlug, knownCompanies] = await Promise.all([
      store.listTopicIdsBySlug(),
      store.listKnownCompanies(),
    ]);

    for (const source of dueSources) {
      const sourceStartedAt = Date.now();
      let outcome: SourceOutcome;

      try {
        outcome = await ingestSource(
          store,
          source,
          topicIdsBySlug,
          knownCompanies,
          options,
          now,
        );
      } catch (error) {
        // A source that throws is contained here: the run continues and the
        // failure is attributed to the source that caused it.
        outcome = {
          discoveredCount: 0,
          duplicateCount: 0,
          errorMessage:
            error instanceof Error ? error.message : "The source failed with an unknown error.",
          httpStatus: null,
          moderationCount: 0,
          newItemCount: 0,
          publishedCount: 0,
          sourceId: source.id,
          sourceSlug: source.slug,
          status: "failed",
        };

        const consecutiveFailures = source.consecutiveFailures + 1;

        try {
          await store.updateSource(source.id, {
            consecutiveFailures,
            healthStatus: nextHealth(consecutiveFailures),
            lastError: outcome.errorMessage,
          });
        } catch {
          // Health bookkeeping must never take the run down with it.
        }
      }

      outcomes.push(outcome);

      if (outcome.status === "succeeded") {
        totals.fetchedCount += 1;
      } else if (outcome.status === "not_modified") {
        totals.notModifiedCount += 1;
      } else if (outcome.status === "failed") {
        totals.failureCount += 1;
      }

      totals.newItemCount += outcome.newItemCount;
      totals.duplicateCount += outcome.duplicateCount;
      totals.publishedCount += outcome.publishedCount;
      totals.moderationCount += outcome.moderationCount;

      try {
        await store.recordSourceRun({
          discoveredCount: outcome.discoveredCount,
          duplicateCount: outcome.duplicateCount,
          durationMs: Date.now() - sourceStartedAt,
          errorMessage: outcome.errorMessage,
          httpStatus: outcome.httpStatus,
          moderationCount: outcome.moderationCount,
          newItemCount: outcome.newItemCount,
          publishedCount: outcome.publishedCount,
          runId,
          sourceId: outcome.sourceId,
          status: outcome.status,
        });
      } catch {
        // Recording the per-source row is observability, not the job.
      }
    }

    const status =
      totals.failureCount === 0
        ? "succeeded"
        : totals.failureCount === totals.sourceCount && totals.sourceCount > 0
          ? "failed"
          : "partial";

    await store.completeRun(runId, status, totals, Date.now() - startedAt);

    return { runId, sources: outcomes, status: "completed", totals };
  } catch (error) {
    await store.completeRun(runId, "failed", totals, Date.now() - startedAt);
    throw error;
  }
}
