import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSourceDue, runIngestion } from "../src/lib/news/ingest.ts";
import type {
  IngestionSource,
  IngestionTrigger,
  NewsItemRecord,
  NewsPostRecord,
  NewsStore,
  RunTotals,
  SourceRunRecord,
  SourceUpdate,
} from "../src/lib/news/types.ts";

/**
 * In-memory double for the storage boundary.
 *
 * It reproduces the behaviour the real schema enforces - one active run at a
 * time, unique feed GUIDs and canonical URLs per source - so the pipeline is
 * exercised exactly as it runs against Postgres.
 */
function createMemoryStore(sources: IngestionSource[]) {
  const items: Array<NewsItemRecord & { id: string }> = [];
  const posts: Array<NewsPostRecord & { id: string }> = [];
  const postTopics = new Map<string, Array<{ topicId: string; confidence: number }>>();
  const sourceRuns: SourceRunRecord[] = [];
  const moderationEvents: Array<{ postId: string; action: string }> = [];
  const runs: Array<{ id: string; status: string; totals: RunTotals | null }> = [];
  const sourceUpdates = new Map<string, SourceUpdate>();

  let sequence = 0;
  const nextId = (prefix: string) => `${prefix}-${(sequence += 1)}`;

  const store: NewsStore = {
    async beginRun(trigger: IngestionTrigger) {
      void trigger;

      if (runs.some((run) => run.status === "running")) {
        return null;
      }

      const id = nextId("run");
      runs.push({ id, status: "running", totals: null });
      return id;
    },

    async completeRun(runId, status, totals) {
      const run = runs.find((entry) => entry.id === runId);

      if (run) {
        run.status = status;
        run.totals = totals;
      }
    },

    async listDueSources() {
      return sources.map((source) => ({
        ...source,
        ...(sourceUpdates.get(source.id) ?? {}),
      })) as IngestionSource[];
    },

    async listTopicIdsBySlug() {
      return new Map([
        ["aviation", "topic-aviation"],
        ["cruise", "topic-cruise"],
        ["disruption", "topic-disruption"],
        ["long-haul", "topic-long-haul"],
        ["supplier-updates", "topic-supplier-updates"],
        ["uk-travel", "topic-uk-travel"],
      ]);
    },

    async listKnownCompanies() {
      return [];
    },

    async findItemInSource(sourceId, externalGuid, canonicalUrlHash) {
      const match = items.find(
        (item) =>
          item.sourceId === sourceId &&
          ((externalGuid !== null && item.externalGuid === externalGuid) ||
            item.canonicalUrlHash === canonicalUrlHash),
      );

      return match ? { id: match.id } : null;
    },

    async findCrossSourceDuplicate(canonicalUrlHash, titleFingerprint, publishedAt) {
      const byUrl = items.find((item) => item.canonicalUrlHash === canonicalUrlHash);

      if (byUrl) {
        return { id: byUrl.id };
      }

      const anchor = publishedAt ? Date.parse(publishedAt) : Date.now();
      const windowMs = 48 * 60 * 60 * 1000;

      const byTitle = items.find((item) => {
        if (item.titleFingerprint !== titleFingerprint) {
          return false;
        }

        const itemTime = item.publishedAt ? Date.parse(item.publishedAt) : anchor;
        return Math.abs(itemTime - anchor) <= windowMs;
      });

      return byTitle ? { id: byTitle.id } : null;
    },

    async insertItem(record) {
      const id = nextId("item");
      items.push({ ...record, id });
      return { id };
    },

    async insertPost(record) {
      const id = nextId("post");
      posts.push({ ...record, id });
      return { id };
    },

    async setPostTopics(postId, topics) {
      postTopics.set(
        postId,
        topics.map((topic) => ({ confidence: topic.confidence, topicId: topic.topicId })),
      );
    },

    async recordModerationEvent(postId, action) {
      moderationEvents.push({ action, postId });
    },

    async recordSourceRun(record) {
      sourceRuns.push(record);
    },

    async updateSource(sourceId, update) {
      sourceUpdates.set(sourceId, { ...(sourceUpdates.get(sourceId) ?? {}), ...update });
    },
  };

  return { items, moderationEvents, postTopics, posts, runs, sourceRuns, sourceUpdates, store };
}

function createSource(overrides: Partial<IngestionSource> = {}): IngestionSource {
  return {
    autoPublish: true,
    consecutiveFailures: 0,
    defaultTopicSlugs: [],
    enabled: true,
    feedType: "rss",
    feedUrl: "https://feed.example.test/rss",
    healthStatus: "healthy",
    id: "source-1",
    lastAttemptAt: null,
    name: "Example Trade News",
    pollingIntervalMinutes: 15,
    publisher: "Example Trade News",
    requestEtag: null,
    requestLastModified: null,
    slug: "example-trade-news",
    trustLevel: "high",
    websiteUrl: "https://feed.example.test",
    ...overrides,
  };
}

const publicAddress = async () => ["93.184.216.34"];

// Successive polls in one test must clear the source's polling interval,
// otherwise the second run correctly declines to re-poll the source.
const firstPoll = new Date("2026-08-18T10:00:00Z");
const secondPoll = new Date("2026-08-18T10:20:00Z");
const thirdPoll = new Date("2026-08-18T10:40:00Z");

function rssWith(items: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Example Trade News</title>
  <link>https://feed.example.test/</link>
  ${items}
</channel></rss>`;
}

const cruiseItem = `<item>
  <title>Royal Caribbean opens 2027 Caribbean cruise season to agents</title>
  <link>https://feed.example.test/cruise/rc-2027?utm_source=rss</link>
  <guid isPermaLink="false">guid-cruise-1</guid>
  <pubDate>Mon, 18 Aug 2026 09:15:00 +0100</pubDate>
  <description>The cruise line has opened trade bookings for its 2027 Caribbean deployment, holding commission for agents who sell before December.</description>
</item>`;

const strikeItem = `<item>
  <title>British Airways cancels Heathrow flights as strike action begins</title>
  <link>https://feed.example.test/aviation/ba-strike</link>
  <guid isPermaLink="false">guid-strike-1</guid>
  <pubDate>Mon, 18 Aug 2026 07:00:00 +0100</pubDate>
  <description>Industrial action has grounded a number of short-haul services from Heathrow this morning, with rebooking advice issued to the trade.</description>
</item>`;

function feedResponse(body: string, headers: Record<string, string> = {}) {
  return new Response(body, {
    headers: { "content-type": "application/rss+xml", ...headers },
    status: 200,
  });
}

function stubFetch(handler: (url: string, init: RequestInit) => Response) {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push(url);
    return handler(url, init ?? {});
  }) as unknown as typeof fetch;

  return { calls, impl };
}

describe("ingestion run", () => {
  it("ingests an RSS feed, classifies it and auto-publishes the routine story", async () => {
    const { store, items, posts, postTopics, moderationEvents, runs } = createMemoryStore([
      createSource(),
    ]);
    const { impl } = stubFetch(() =>
      feedResponse(rssWith(`${cruiseItem}${strikeItem}`), { etag: '"v1"' }),
    );

    const result = await runIngestion(store, {
      fetchOptions: { fetchImpl: impl, resolveHostname: publicAddress },
    });

    assert.equal(result.status, "completed");
    assert.equal(result.totals.newItemCount, 2);
    assert.equal(items.length, 2);
    assert.equal(posts.length, 2);

    const cruisePost = posts.find((post) => post.title.startsWith("Royal Caribbean"));
    const strikePost = posts.find((post) => post.title.startsWith("British Airways"));

    // Routine, confident, trusted source: published without a human.
    assert.equal(cruisePost?.status, "published");
    assert.equal(cruisePost?.autoPublished, true);
    assert.equal(cruisePost?.requiresModeration, false);
    assert.ok(cruisePost?.publishedToFeedAt);

    // Disruption story: held for a moderator despite the same source settings.
    assert.equal(strikePost?.status, "pending_review");
    assert.equal(strikePost?.sensitivity, "sensitive");
    assert.equal(strikePost?.requiresModeration, true);
    assert.equal(strikePost?.publishedToFeedAt, null);

    assert.equal(result.totals.publishedCount, 1);
    assert.equal(result.totals.moderationCount, 1);
    assert.equal(moderationEvents.length, 1);
    assert.equal(moderationEvents[0].action, "auto_published");

    // The cruise story carries more than one topic.
    const topics = postTopics.get(cruisePost?.id ?? "") ?? [];
    assert.ok(topics.length > 1);
    assert.ok(topics.some((topic) => topic.topicId === "topic-cruise"));

    assert.equal(runs[0].status, "succeeded");
  });

  it("keeps the canonical link and drops tracking parameters", async () => {
    const { store, items } = createMemoryStore([createSource()]);
    const { impl } = stubFetch(() => feedResponse(rssWith(cruiseItem)));

    await runIngestion(store, {
      fetchOptions: { fetchImpl: impl, resolveHostname: publicAddress },
    });

    assert.equal(items[0].canonicalUrl, "https://feed.example.test/cruise/rc-2027");
    // The URL the publisher actually served is kept for provenance.
    assert.ok(items[0].sourceUrl.includes("utm_source=rss"));
  });

  it("does not duplicate an item when the same feed is polled again", async () => {
    const { store, items, posts } = createMemoryStore([createSource()]);
    const { impl } = stubFetch(() => feedResponse(rssWith(cruiseItem)));
    const options = { fetchOptions: { fetchImpl: impl, resolveHostname: publicAddress } };

    await runIngestion(store, { ...options, now: firstPoll });
    const second = await runIngestion(store, { ...options, now: secondPoll });

    assert.equal(items.length, 1);
    assert.equal(posts.length, 1);
    assert.equal(second.totals.newItemCount, 0);
    assert.equal(second.totals.duplicateCount, 1);
  });

  it("treats a changed tracking URL for a known GUID as the same item", async () => {
    const { store, items } = createMemoryStore([createSource()]);
    let poll = 0;
    const { impl } = stubFetch(() => {
      poll += 1;
      const url =
        poll === 1
          ? "https://feed.example.test/cruise/rc-2027?utm_source=rss"
          : "https://feed.example.test/cruise/rc-2027?utm_source=newsletter&utm_medium=email";

      return feedResponse(
        rssWith(`<item>
          <title>Royal Caribbean opens 2027 Caribbean cruise season to agents</title>
          <link>${url}</link>
          <guid isPermaLink="false">guid-cruise-1</guid>
          <pubDate>Mon, 18 Aug 2026 09:15:00 +0100</pubDate>
          <description>The cruise line has opened trade bookings for its 2027 Caribbean deployment for agents.</description>
        </item>`),
      );
    });
    const options = { fetchOptions: { fetchImpl: impl, resolveHostname: publicAddress } };

    await runIngestion(store, { ...options, now: firstPoll });
    await runIngestion(store, { ...options, now: secondPoll });

    assert.equal(items.length, 1);
  });

  it("collapses one item repeated inside a single feed response", async () => {
    const { store, items } = createMemoryStore([createSource()]);
    const { impl } = stubFetch(() => feedResponse(rssWith(`${cruiseItem}${cruiseItem}`)));

    const result = await runIngestion(store, {
      fetchOptions: { fetchImpl: impl, resolveHostname: publicAddress },
    });

    assert.equal(items.length, 1);
    assert.equal(result.totals.duplicateCount, 1);
  });

  it("does not publish the same story twice when a second publisher syndicates it", async () => {
    const { store, items, posts } = createMemoryStore([
      createSource(),
      createSource({
        feedUrl: "https://second.example.test/rss",
        id: "source-2",
        name: "Second Trade Title",
        publisher: "Second Trade Title",
        slug: "second-trade-title",
        websiteUrl: "https://second.example.test",
      }),
    ]);

    const { impl } = stubFetch((url) => {
      if (url.startsWith("https://second.example.test")) {
        // Same headline, same day, different publisher and different URL.
        return feedResponse(`<?xml version="1.0"?><rss version="2.0"><channel>
          <title>Second Trade Title</title>
          <link>https://second.example.test/</link>
          <item>
            <title>Royal Caribbean opens 2027 Caribbean cruise season to agents</title>
            <link>https://second.example.test/rc-2027-season</link>
            <guid isPermaLink="false">second-guid-1</guid>
            <pubDate>Mon, 18 Aug 2026 11:00:00 +0100</pubDate>
            <description>The cruise line has opened trade bookings for its 2027 Caribbean deployment for selling agents.</description>
          </item>
        </channel></rss>`);
      }

      return feedResponse(rssWith(cruiseItem));
    });

    const result = await runIngestion(store, {
      fetchOptions: { fetchImpl: impl, resolveHostname: publicAddress },
    });

    // Both records are kept for provenance, but only one card is published.
    assert.equal(items.length, 2);
    assert.equal(posts.length, 1);
    assert.equal(items[1].processingStatus, "duplicate");
    assert.equal(items[1].duplicateOfItemId, items[0].id);
    assert.equal(result.totals.duplicateCount, 1);
  });

  it("keeps separate editorial coverage published outside the syndication window", async () => {
    const { store, posts } = createMemoryStore([
      createSource(),
      createSource({
        feedUrl: "https://second.example.test/rss",
        id: "source-2",
        publisher: "Second Trade Title",
        slug: "second-trade-title",
        websiteUrl: "https://second.example.test",
      }),
    ]);

    const { impl } = stubFetch((url) => {
      if (url.startsWith("https://second.example.test")) {
        return feedResponse(`<?xml version="1.0"?><rss version="2.0"><channel>
          <link>https://second.example.test/</link>
          <item>
            <title>Royal Caribbean opens 2027 Caribbean cruise season to agents</title>
            <link>https://second.example.test/rc-2027-followup</link>
            <guid isPermaLink="false">second-guid-2</guid>
            <pubDate>Mon, 25 Aug 2026 09:00:00 +0100</pubDate>
            <description>A follow-up analysis of the 2027 Caribbean deployment and what it means for agents.</description>
          </item>
        </channel></rss>`);
      }

      return feedResponse(rssWith(cruiseItem));
    });

    await runIngestion(store, {
      fetchOptions: { fetchImpl: impl, resolveHostname: publicAddress },
    });

    assert.equal(posts.length, 2);
  });
});

describe("source policy", () => {
  it("never polls a disabled source", async () => {
    const { store, items } = createMemoryStore([createSource({ enabled: false })]);
    const { impl, calls } = stubFetch(() => feedResponse(rssWith(cruiseItem)));

    const result = await runIngestion(store, {
      fetchOptions: { fetchImpl: impl, resolveHostname: publicAddress },
    });

    assert.equal(calls.length, 0);
    assert.equal(items.length, 0);
    assert.equal(result.totals.sourceCount, 0);
  });

  it("never polls a source with no verified feed URL", async () => {
    const { store } = createMemoryStore([createSource({ enabled: true, feedUrl: null })]);
    const { impl, calls } = stubFetch(() => feedResponse(rssWith(cruiseItem)));

    const result = await runIngestion(store, {
      fetchOptions: { fetchImpl: impl, resolveHostname: publicAddress },
    });

    assert.equal(calls.length, 0);
    assert.equal(result.totals.sourceCount, 0);
  });

  it("honours the per-source polling interval", () => {
    const now = new Date("2026-08-18T10:00:00Z");

    assert.equal(isSourceDue(createSource({ lastAttemptAt: null }), now), true);
    assert.equal(
      isSourceDue(
        createSource({ lastAttemptAt: "2026-08-18T09:56:00Z", pollingIntervalMinutes: 15 }),
        now,
      ),
      false,
    );
    assert.equal(
      isSourceDue(
        createSource({ lastAttemptAt: "2026-08-18T09:40:00Z", pollingIntervalMinutes: 15 }),
        now,
      ),
      true,
    );
  });

  it("stores the validators returned by the publisher and sends them next time", async () => {
    const { store, sourceUpdates } = createMemoryStore([createSource()]);
    const headers: Array<Record<string, string> | undefined> = [];

    const { impl } = stubFetch((url, init) => {
      headers.push(init.headers as Record<string, string> | undefined);

      if (headers.length === 1) {
        return feedResponse(rssWith(cruiseItem), {
          etag: '"abc123"',
          "last-modified": "Mon, 18 Aug 2026 09:20:00 GMT",
        });
      }

      return new Response(null, { status: 304 });
    });

    const options = { fetchOptions: { fetchImpl: impl, resolveHostname: publicAddress } };

    await runIngestion(store, { ...options, now: firstPoll });
    assert.equal(sourceUpdates.get("source-1")?.requestEtag, '"abc123"');

    const second = await runIngestion(store, { ...options, now: secondPoll });

    assert.equal(headers[1]?.["if-none-match"], '"abc123"');
    assert.equal(headers[1]?.["if-modified-since"], "Mon, 18 Aug 2026 09:20:00 GMT");
    assert.equal(second.totals.notModifiedCount, 1);
    assert.equal(second.totals.newItemCount, 0);
  });
});

describe("failure isolation and health", () => {
  it("keeps ingesting the healthy sources when one publisher fails", async () => {
    const { store, posts } = createMemoryStore([
      createSource({ feedUrl: "https://broken.example.test/rss", id: "source-broken", slug: "broken" }),
      createSource({ id: "source-good", slug: "good" }),
    ]);

    const { impl } = stubFetch((url) => {
      if (url.startsWith("https://broken.example.test")) {
        return new Response("upstream error", { status: 500 });
      }

      return feedResponse(rssWith(cruiseItem));
    });

    const result = await runIngestion(store, {
      fetchOptions: { attempts: 1, fetchImpl: impl, resolveHostname: publicAddress },
    });

    assert.equal(result.status, "completed");
    assert.equal(result.totals.failureCount, 1);
    assert.equal(result.totals.newItemCount, 1);
    assert.equal(posts.length, 1);

    const broken = result.sources.find((source) => source.sourceId === "source-broken");
    assert.equal(broken?.status, "failed");
    assert.equal(broken?.httpStatus, 500);
  });

  it("records the whole run as partial rather than failed", async () => {
    const { store, runs } = createMemoryStore([
      createSource({ feedUrl: "https://broken.example.test/rss", id: "source-broken" }),
      createSource({ id: "source-good" }),
    ]);

    const { impl } = stubFetch((url) =>
      url.startsWith("https://broken.example.test")
        ? new Response("nope", { status: 500 })
        : feedResponse(rssWith(cruiseItem)),
    );

    await runIngestion(store, {
      fetchOptions: { attempts: 1, fetchImpl: impl, resolveHostname: publicAddress },
    });

    assert.equal(runs[0].status, "partial");
  });

  it("moves a source through warning and on to failing as failures repeat", async () => {
    const { store, sourceUpdates } = createMemoryStore([
      createSource({ consecutiveFailures: 0 }),
    ]);
    const { impl } = stubFetch(() => new Response("gone", { status: 500 }));
    const options = { fetchOptions: { attempts: 1, fetchImpl: impl, resolveHostname: publicAddress } };

    await runIngestion(store, { ...options, now: firstPoll });
    assert.equal(sourceUpdates.get("source-1")?.consecutiveFailures, 1);
    assert.equal(sourceUpdates.get("source-1")?.healthStatus, "warning");

    await runIngestion(store, { ...options, now: secondPoll });
    await runIngestion(store, { ...options, now: thirdPoll });

    assert.equal(sourceUpdates.get("source-1")?.consecutiveFailures, 3);
    assert.equal(sourceUpdates.get("source-1")?.healthStatus, "failing");
    assert.ok(sourceUpdates.get("source-1")?.lastError);
  });

  it("returns a source to healthy after a successful poll", async () => {
    const { store, sourceUpdates } = createMemoryStore([
      createSource({ consecutiveFailures: 2, healthStatus: "warning" }),
    ]);
    const { impl } = stubFetch(() => feedResponse(rssWith(cruiseItem)));

    await runIngestion(store, {
      fetchOptions: { fetchImpl: impl, resolveHostname: publicAddress },
    });

    assert.equal(sourceUpdates.get("source-1")?.healthStatus, "healthy");
    assert.equal(sourceUpdates.get("source-1")?.consecutiveFailures, 0);
    assert.equal(sourceUpdates.get("source-1")?.lastError, null);
  });

  it("fails a source that points at a private address instead of fetching it", async () => {
    const { store } = createMemoryStore([
      createSource({ feedUrl: "http://169.254.169.254/latest/meta-data/" }),
    ]);
    const { impl, calls } = stubFetch(() => feedResponse(rssWith(cruiseItem)));

    const result = await runIngestion(store, {
      fetchOptions: { attempts: 1, fetchImpl: impl, resolveHostname: publicAddress },
    });

    assert.equal(calls.length, 0);
    assert.equal(result.sources[0].status, "failed");
    assert.match(result.sources[0].errorMessage ?? "", /private, loopback or link-local/);
  });

  it("fails a source whose public hostname resolves to a private address", async () => {
    const { store } = createMemoryStore([
      createSource({ feedUrl: "https://rebind.example.test/rss" }),
    ]);
    const { impl, calls } = stubFetch(() => feedResponse(rssWith(cruiseItem)));

    const result = await runIngestion(store, {
      fetchOptions: {
        attempts: 1,
        fetchImpl: impl,
        resolveHostname: async () => ["127.0.0.1"],
      },
    });

    assert.equal(calls.length, 0);
    assert.equal(result.sources[0].status, "failed");
    assert.match(result.sources[0].errorMessage ?? "", /resolves to a private address/);
  });

  it("records a parse failure without taking the run down", async () => {
    const { store, runs } = createMemoryStore([createSource()]);
    const { impl } = stubFetch(() => feedResponse("<html><body>Not a feed</body></html>"));

    const result = await runIngestion(store, {
      fetchOptions: { attempts: 1, fetchImpl: impl, resolveHostname: publicAddress },
    });

    assert.equal(result.status, "completed");
    assert.equal(result.sources[0].status, "failed");
    assert.match(result.sources[0].errorMessage ?? "", /not an RSS, Atom or JSON feed/);
    assert.equal(runs[0].status, "failed");
  });

  it("refuses a feed larger than the size limit", async () => {
    const { store } = createMemoryStore([createSource()]);
    const huge = rssWith(`<item><title>${"x".repeat(5000)}</title><link>https://feed.example.test/x</link></item>`);
    const { impl } = stubFetch(() => feedResponse(huge));

    const result = await runIngestion(store, {
      fetchOptions: {
        attempts: 1,
        fetchImpl: impl,
        maxBytes: 512,
        resolveHostname: publicAddress,
      },
    });

    assert.equal(result.sources[0].status, "failed");
    assert.match(result.sources[0].errorMessage ?? "", /byte limit/);
  });
});

describe("scheduling idempotency", () => {
  it("skips a second invocation while a run is already in progress", async () => {
    const { store, runs } = createMemoryStore([createSource()]);
    const { impl, calls } = stubFetch(() => feedResponse(rssWith(cruiseItem)));

    // Claim the slot the way a still-running invocation would.
    const heldRunId = await store.beginRun("cron");
    assert.ok(heldRunId);

    const result = await runIngestion(store, {
      fetchOptions: { fetchImpl: impl, resolveHostname: publicAddress },
    });

    assert.equal(result.status, "skipped");
    assert.equal(result.runId, null);
    assert.equal(calls.length, 0);
    assert.equal(runs.length, 1);
    assert.match(result.reason ?? "", /already in progress/);
  });

  it("runs again once the previous run has finished", async () => {
    const { store } = createMemoryStore([createSource()]);
    const { impl } = stubFetch(() => feedResponse(rssWith(cruiseItem)));
    const options = { fetchOptions: { fetchImpl: impl, resolveHostname: publicAddress } };

    const first = await runIngestion(store, { ...options, now: firstPoll });
    assert.equal(first.status, "completed");

    const second = await runIngestion(store, { ...options, now: secondPoll });
    assert.equal(second.status, "completed");
  });
});
