import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, NewsPost, NewsPostWithMeta, NewsTopic } from "../../types/database.ts";

/**
 * Personalised delivery of trade news.
 *
 * Relevance is resolved on the server and applied inside the database query.
 * The browser is never sent the whole news table and asked to hide the parts
 * the member did not ask for - that would leak the full feed to anyone who
 * opens developer tools, and it would get slower every week.
 */

export type FeedAudience = {
  mode: "personalised" | "default";
  /** Topics whose posts this member should receive. */
  topicIds: string[];
  /** Publishers this member follows explicitly. */
  sourceIds: string[];
};

export type PersonalisedNewsPage = {
  posts: NewsPostWithMeta[];
  nextCursor: string | null;
  audience: FeedAudience;
};

/** Posts requested per page. Kept small so the feed paginates rather than dumps. */
export const newsPageSize = 20;

/**
 * Works out which topics a member's feed is built from.
 *
 * A member who follows nothing is not shown an empty page and is not shown
 * everything either: they get the default topic set, which is the balanced
 * professional feed a new travel professional should land on.
 */
export function resolveFeedAudience(input: {
  followedTopicIds: string[];
  followedSourceIds: string[];
  defaultTopicIds: string[];
  /** Topics every member receives regardless of what they follow. */
  mandatoryTopicIds?: string[];
}): FeedAudience {
  const mandatory = input.mandatoryTopicIds ?? [];
  const hasFollows = input.followedTopicIds.length > 0 || input.followedSourceIds.length > 0;

  if (!hasFollows) {
    return {
      mode: "default",
      sourceIds: [],
      topicIds: [...new Set([...input.defaultTopicIds, ...mandatory])],
    };
  }

  return {
    mode: "personalised",
    sourceIds: [...new Set(input.followedSourceIds)],
    topicIds: [...new Set([...input.followedTopicIds, ...mandatory])],
  };
}

/**
 * Whether a post reaches a member, given the topics it was classified into.
 *
 * This mirrors the database query and exists so segmentation can be asserted
 * directly in tests.
 */
export function isPostInAudience(
  post: { sourceId: string; topicIds: string[] },
  audience: FeedAudience,
) {
  if (audience.sourceIds.includes(post.sourceId)) {
    return true;
  }

  return post.topicIds.some((topicId) => audience.topicIds.includes(topicId));
}

type NewsPostRow = NewsPost & {
  news_sources: {
    id: string;
    name: string;
    publisher: string;
    slug: string;
    website_url: string;
  } | null;
  news_post_topics: Array<{
    news_topics: Pick<NewsTopic, "id" | "name" | "slug"> | null;
  }> | null;
};

const newsPostSelect = `
  *,
  news_sources ( id, name, publisher, slug, website_url ),
  news_post_topics ( news_topics ( id, name, slug ) )
`;

function toNewsPostWithMeta(row: NewsPostRow): NewsPostWithMeta {
  const { news_post_topics: postTopics, news_sources: source, ...post } = row;

  return {
    ...post,
    source,
    topics: (postTopics ?? [])
      .map((entry) => entry.news_topics)
      .filter((topic): topic is Pick<NewsTopic, "id" | "name" | "slug"> => topic !== null),
  };
}

/**
 * Loads the audience for a member from their follows.
 */
export async function loadFeedAudience(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<FeedAudience> {
  const [topicFollows, sourceFollows, topics] = await Promise.all([
    supabase.from("user_topic_follows").select("topic_id").eq("user_id", userId),
    supabase.from("user_source_follows").select("source_id").eq("user_id", userId),
    supabase.from("news_topics").select("id, slug, is_default").eq("status", "active"),
  ]);

  const defaultTopicIds = (topics.data ?? [])
    .filter((topic) => topic.is_default)
    .map((topic) => topic.id);

  // Platform announcements reach everyone: they are about Travel Xchange
  // itself, not about a sector a member may or may not sell.
  const mandatoryTopicIds = (topics.data ?? [])
    .filter((topic) => topic.slug === "platform-updates")
    .map((topic) => topic.id);

  return resolveFeedAudience({
    defaultTopicIds,
    followedSourceIds: (sourceFollows.data ?? []).map((row) => row.source_id),
    followedTopicIds: (topicFollows.data ?? []).map((row) => row.topic_id),
    mandatoryTopicIds,
  });
}

/**
 * Returns one page of published news for a member.
 *
 * @param cursor `published_at` of the last post on the previous page.
 */
export async function getPersonalisedNews(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { cursor?: string | null; limit?: number; topicId?: string | null } = {},
): Promise<PersonalisedNewsPage> {
  const audience = await loadFeedAudience(supabase, userId);
  const limit = Math.min(options.limit ?? newsPageSize, 50);

  // A member browsing one topic has asked for that topic explicitly, so the
  // audience filter steps aside and only the topic filter applies.
  const topicIds = options.topicId ? [options.topicId] : audience.topicIds;

  const matchingPostIds = new Set<string>();

  if (topicIds.length > 0) {
    const { data } = await supabase
      .from("news_post_topics")
      .select("news_post_id")
      .in("topic_id", topicIds)
      .limit(2000);

    for (const row of data ?? []) {
      matchingPostIds.add(row.news_post_id);
    }
  }

  if (!options.topicId && audience.sourceIds.length > 0) {
    const { data } = await supabase
      .from("news_posts")
      .select("id")
      .eq("status", "published")
      .in("source_id", audience.sourceIds)
      .limit(2000);

    for (const row of data ?? []) {
      matchingPostIds.add(row.id);
    }
  }

  if (matchingPostIds.size === 0) {
    return { audience, nextCursor: null, posts: [] };
  }

  let query = supabase
    .from("news_posts")
    .select(newsPostSelect)
    .eq("status", "published")
    .in("id", [...matchingPostIds])
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt("published_at", options.cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`The news feed could not be loaded: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as NewsPostRow[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    audience,
    nextCursor: hasMore ? page[page.length - 1].published_at : null,
    posts: page.map(toNewsPostWithMeta),
  };
}
