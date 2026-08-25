import type { Sensitivity } from "./classify.ts";

export type FeedType = "rss" | "atom" | "json";
export type TrustLevel = "low" | "standard" | "high";
export type SourceHealth = "unverified" | "healthy" | "warning" | "failing" | "disabled";
export type NewsPostStatus = "pending_review" | "published" | "rejected" | "unpublished";
export type IngestionTrigger = "cron" | "manual" | "test";

export type IngestionSource = {
  id: string;
  slug: string;
  name: string;
  publisher: string;
  websiteUrl: string;
  feedUrl: string | null;
  feedType: FeedType;
  enabled: boolean;
  autoPublish: boolean;
  pollingIntervalMinutes: number;
  trustLevel: TrustLevel;
  defaultTopicSlugs: string[];
  requestEtag: string | null;
  requestLastModified: string | null;
  consecutiveFailures: number;
  healthStatus: SourceHealth;
  lastAttemptAt: string | null;
};

export type NewsItemRecord = {
  sourceId: string;
  externalGuid: string | null;
  canonicalUrl: string;
  canonicalUrlHash: string;
  sourceUrl: string;
  title: string;
  titleFingerprint: string;
  originalDescription: string | null;
  author: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
  duplicateOfItemId: string | null;
  processingStatus: "pending" | "processed" | "duplicate" | "rejected" | "failed";
};

export type NewsPostRecord = {
  newsItemId: string;
  sourceId: string;
  title: string;
  summary: string | null;
  canonicalUrl: string;
  publisher: string;
  imageUrl: string | null;
  publishedAt: string;
  status: NewsPostStatus;
  classificationConfidence: number;
  requiresModeration: boolean;
  sensitivity: Sensitivity;
  autoPublished: boolean;
  publishedToFeedAt: string | null;
};

export type SourceRunRecord = {
  runId: string;
  sourceId: string;
  status: "succeeded" | "not_modified" | "skipped" | "failed";
  httpStatus: number | null;
  discoveredCount: number;
  newItemCount: number;
  duplicateCount: number;
  publishedCount: number;
  moderationCount: number;
  durationMs: number;
  errorMessage: string | null;
};

export type SourceUpdate = {
  requestEtag?: string | null;
  requestLastModified?: string | null;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastError?: string | null;
  consecutiveFailures?: number;
  healthStatus?: SourceHealth;
};

export type RunTotals = {
  sourceCount: number;
  fetchedCount: number;
  notModifiedCount: number;
  newItemCount: number;
  duplicateCount: number;
  publishedCount: number;
  moderationCount: number;
  failureCount: number;
};

/**
 * Storage boundary for the ingestion run.
 *
 * The orchestrator talks only to this interface, so the pipeline can be run
 * against a real database or an in-memory double without changing behaviour.
 */
export type NewsStore = {
  /**
   * Claims the single active ingestion slot. Returns null when another run
   * already holds it, which is how overlapping cron invocations stay
   * idempotent.
   */
  beginRun(trigger: IngestionTrigger): Promise<string | null>;
  completeRun(
    runId: string,
    status: "succeeded" | "partial" | "failed",
    totals: RunTotals,
    durationMs: number,
  ): Promise<void>;
  listDueSources(now: Date): Promise<IngestionSource[]>;
  listTopicIdsBySlug(): Promise<Map<string, string>>;
  listKnownCompanies(): Promise<Array<{ id: string; name: string }>>;
  /** Existing item for this source by feed GUID or canonical URL. */
  findItemInSource(
    sourceId: string,
    externalGuid: string | null,
    canonicalUrlHash: string,
  ): Promise<{ id: string } | null>;
  /** The same story already captured from a different publisher. */
  findCrossSourceDuplicate(
    canonicalUrlHash: string,
    titleFingerprint: string,
    publishedAt: string | null,
  ): Promise<{ id: string } | null>;
  insertItem(record: NewsItemRecord): Promise<{ id: string }>;
  insertPost(record: NewsPostRecord): Promise<{ id: string }>;
  setPostTopics(
    postId: string,
    topics: Array<{ topicId: string; confidence: number; assignedBy: "rules" | "source_default" }>,
  ): Promise<void>;
  recordModerationEvent(postId: string, action: "auto_published"): Promise<void>;
  recordSourceRun(record: SourceRunRecord): Promise<void>;
  updateSource(sourceId: string, update: SourceUpdate): Promise<void>;
};
