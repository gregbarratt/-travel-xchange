import { createSupabaseAdminClient } from "../supabase/server.ts";
import type {
  IngestionSource,
  IngestionTrigger,
  NewsItemRecord,
  NewsPostRecord,
  NewsStore,
  RunTotals,
  SourceRunRecord,
  SourceUpdate,
} from "./types.ts";
import type { NewsSource } from "../../types/database.ts";

/**
 * Supabase-backed implementation of the ingestion storage boundary.
 *
 * Ingestion runs with the service role because it writes on behalf of the
 * platform rather than a signed-in member. That key is server-only and is
 * never handed to a browser bundle.
 */

/** A run still marked `running` after this long is treated as abandoned. */
const staleRunMinutes = 10;

/** Window in which the same headline from a second publisher is one story. */
const syndicationWindowHours = 48;

const uniqueViolation = "23505";

function toIngestionSource(row: NewsSource): IngestionSource {
  return {
    autoPublish: row.auto_publish,
    consecutiveFailures: row.consecutive_failures,
    defaultTopicSlugs: row.default_topic_slugs ?? [],
    enabled: row.enabled,
    feedType: row.feed_type,
    feedUrl: row.feed_url,
    healthStatus: row.health_status,
    id: row.id,
    lastAttemptAt: row.last_attempt_at,
    name: row.name,
    pollingIntervalMinutes: row.polling_interval_minutes,
    publisher: row.publisher,
    requestEtag: row.request_etag,
    requestLastModified: row.request_last_modified,
    slug: row.slug,
    trustLevel: row.trust_level,
    websiteUrl: row.website_url,
  };
}

export function createSupabaseNewsStore(): NewsStore {
  const supabase = createSupabaseAdminClient();

  return {
    async beginRun(trigger: IngestionTrigger) {
      // Release the slot held by a run that died mid-flight, otherwise a
      // crashed invocation would block ingestion permanently.
      const staleBefore = new Date(Date.now() - staleRunMinutes * 60_000).toISOString();

      await supabase
        .from("news_ingestion_runs")
        .update({ completed_at: new Date().toISOString(), status: "timed_out" })
        .eq("status", "running")
        .lt("started_at", staleBefore);

      const { data, error } = await supabase
        .from("news_ingestion_runs")
        .insert({ status: "running", trigger })
        .select("id")
        .single();

      if (error) {
        // The partial unique index rejected a second concurrent run. That is
        // the intended outcome, not a failure.
        if (error.code === uniqueViolation) {
          return null;
        }

        throw new Error(`The ingestion run could not be started: ${error.message}`);
      }

      return data.id;
    },

    async completeRun(
      runId: string,
      status: "succeeded" | "partial" | "failed",
      totals: RunTotals,
      durationMs: number,
    ) {
      await supabase
        .from("news_ingestion_runs")
        .update({
          completed_at: new Date().toISOString(),
          duplicate_count: totals.duplicateCount,
          duration_ms: durationMs,
          failure_count: totals.failureCount,
          fetched_count: totals.fetchedCount,
          moderation_count: totals.moderationCount,
          new_item_count: totals.newItemCount,
          not_modified_count: totals.notModifiedCount,
          published_count: totals.publishedCount,
          source_count: totals.sourceCount,
          status,
        })
        .eq("id", runId);
    },

    async listDueSources() {
      const { data, error } = await supabase
        .from("news_sources")
        .select("*")
        .eq("enabled", true)
        .not("feed_url", "is", null)
        .order("name", { ascending: true });

      if (error) {
        throw new Error(`The news sources could not be loaded: ${error.message}`);
      }

      return (data ?? []).map(toIngestionSource);
    },

    async listTopicIdsBySlug() {
      const { data, error } = await supabase
        .from("news_topics")
        .select("id, slug")
        .eq("status", "active");

      if (error) {
        throw new Error(`The news topics could not be loaded: ${error.message}`);
      }

      return new Map((data ?? []).map((topic) => [topic.slug, topic.id]));
    },

    async listKnownCompanies() {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .eq("status", "active");

      if (error) {
        // Supplier matching is an enrichment. Losing it must not stop news.
        return [];
      }

      return (data ?? []).map((company) => ({ id: company.id, name: company.name }));
    },

    async findItemInSource(
      sourceId: string,
      externalGuid: string | null,
      canonicalUrlHash: string,
    ) {
      if (externalGuid) {
        const { data } = await supabase
          .from("news_items")
          .select("id")
          .eq("source_id", sourceId)
          .eq("external_guid", externalGuid)
          .maybeSingle();

        if (data) {
          return { id: data.id };
        }
      }

      const { data } = await supabase
        .from("news_items")
        .select("id")
        .eq("source_id", sourceId)
        .eq("canonical_url_hash", canonicalUrlHash)
        .maybeSingle();

      return data ? { id: data.id } : null;
    },

    async findCrossSourceDuplicate(
      canonicalUrlHash: string,
      titleFingerprint: string,
      publishedAt: string | null,
    ) {
      // The same URL from any publisher is the same document.
      const { data: byUrl } = await supabase
        .from("news_items")
        .select("id")
        .eq("canonical_url_hash", canonicalUrlHash)
        .limit(1)
        .maybeSingle();

      if (byUrl) {
        return { id: byUrl.id };
      }

      // The same headline within a short window is a syndicated copy. Outside
      // that window it is more likely to be separate editorial coverage, which
      // is worth keeping.
      const anchor = publishedAt ? Date.parse(publishedAt) : Date.now();

      if (Number.isNaN(anchor)) {
        return null;
      }

      const windowMs = syndicationWindowHours * 60 * 60 * 1000;

      const { data: byTitle } = await supabase
        .from("news_items")
        .select("id")
        .eq("title_fingerprint", titleFingerprint)
        .gte("published_at", new Date(anchor - windowMs).toISOString())
        .lte("published_at", new Date(anchor + windowMs).toISOString())
        .limit(1)
        .maybeSingle();

      return byTitle ? { id: byTitle.id } : null;
    },

    async insertItem(record: NewsItemRecord) {
      const { data, error } = await supabase
        .from("news_items")
        .insert({
          author: record.author,
          canonical_url: record.canonicalUrl,
          canonical_url_hash: record.canonicalUrlHash,
          duplicate_of_item_id: record.duplicateOfItemId,
          external_guid: record.externalGuid,
          image_url: record.imageUrl,
          original_description: record.originalDescription,
          processing_status: record.processingStatus,
          published_at: record.publishedAt,
          source_id: record.sourceId,
          source_url: record.sourceUrl,
          title: record.title,
          title_fingerprint: record.titleFingerprint,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(`The news item could not be stored: ${error.message}`);
      }

      return { id: data.id };
    },

    async insertPost(record: NewsPostRecord) {
      const { data, error } = await supabase
        .from("news_posts")
        .insert({
          auto_published: record.autoPublished,
          canonical_url: record.canonicalUrl,
          classification_confidence: record.classificationConfidence,
          image_url: record.imageUrl,
          news_item_id: record.newsItemId,
          published_at: record.publishedAt,
          published_to_feed_at: record.publishedToFeedAt,
          publisher: record.publisher,
          requires_moderation: record.requiresModeration,
          sensitivity: record.sensitivity,
          source_id: record.sourceId,
          status: record.status,
          summary: record.summary,
          title: record.title,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(`The news post could not be stored: ${error.message}`);
      }

      return { id: data.id };
    },

    async setPostTopics(postId, topics) {
      if (topics.length === 0) {
        return;
      }

      const { error } = await supabase.from("news_post_topics").insert(
        topics.map((topic) => ({
          assigned_by: topic.assignedBy,
          confidence: topic.confidence,
          news_post_id: postId,
          topic_id: topic.topicId,
        })),
      );

      if (error && error.code !== uniqueViolation) {
        throw new Error(`The news topics could not be stored: ${error.message}`);
      }
    },

    async recordModerationEvent(postId: string, action: "auto_published") {
      await supabase
        .from("news_moderation_events")
        .insert({ action, news_post_id: postId });
    },

    async recordSourceRun(record: SourceRunRecord) {
      await supabase.from("news_ingestion_source_runs").insert({
        discovered_count: record.discoveredCount,
        duplicate_count: record.duplicateCount,
        duration_ms: record.durationMs,
        error_message: record.errorMessage,
        http_status: record.httpStatus,
        moderation_count: record.moderationCount,
        new_item_count: record.newItemCount,
        published_count: record.publishedCount,
        run_id: record.runId,
        source_id: record.sourceId,
        status: record.status,
      });
    },

    async updateSource(sourceId: string, update: SourceUpdate) {
      const patch: Partial<NewsSource> = {};

      if (update.requestEtag !== undefined) {
        patch.request_etag = update.requestEtag;
      }

      if (update.requestLastModified !== undefined) {
        patch.request_last_modified = update.requestLastModified;
      }

      if (update.lastAttemptAt !== undefined) {
        patch.last_attempt_at = update.lastAttemptAt;
      }

      if (update.lastSuccessAt !== undefined) {
        patch.last_success_at = update.lastSuccessAt;
      }

      if (update.lastError !== undefined) {
        patch.last_error = update.lastError;
      }

      if (update.consecutiveFailures !== undefined) {
        patch.consecutive_failures = update.consecutiveFailures;
      }

      if (update.healthStatus !== undefined) {
        patch.health_status = update.healthStatus;
      }

      if (Object.keys(patch).length === 0) {
        return;
      }

      await supabase.from("news_sources").update(patch).eq("id", sourceId);
    },
  };
}
