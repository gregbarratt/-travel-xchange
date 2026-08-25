import { NextResponse, type NextRequest } from "next/server";

import { authoriseMember } from "@/lib/news/admin-auth";

/**
 * Topic and publisher follows for the signed-in member.
 *
 * A member may only ever read or change their own follows; the row level
 * security policy enforces the same rule at the database.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FollowBody = {
  topicId?: string;
  sourceId?: string;
  following?: boolean;
};

export async function GET(request: NextRequest) {
  const authorised = await authoriseMember(request);

  if ("response" in authorised) {
    return authorised.response;
  }

  const { supabase, userId } = authorised;

  const [topics, sources, followedTopics, followedSources] = await Promise.all([
    supabase
      .from("news_topics")
      .select("id, name, slug, description, topic_group, is_default, sort_order")
      .eq("status", "active")
      .order("sort_order", { ascending: true }),
    supabase
      .from("news_sources")
      .select("id, name, publisher, slug, website_url, enabled")
      .eq("enabled", true)
      .order("name", { ascending: true }),
    supabase.from("user_topic_follows").select("topic_id").eq("user_id", userId),
    supabase.from("user_source_follows").select("source_id").eq("user_id", userId),
  ]);

  return NextResponse.json({
    followedSourceIds: (followedSources.data ?? []).map((row) => row.source_id),
    followedTopicIds: (followedTopics.data ?? []).map((row) => row.topic_id),
    sources: sources.data ?? [],
    topics: topics.data ?? [],
  });
}

export async function PUT(request: NextRequest) {
  const authorised = await authoriseMember(request);

  if ("response" in authorised) {
    return authorised.response;
  }

  const { supabase, userId } = authorised;
  const body = (await request.json().catch(() => null)) as FollowBody | null;

  if (!body || (!body.topicId && !body.sourceId)) {
    return NextResponse.json(
      { error: "Choose a topic or a publisher to follow." },
      { status: 400 },
    );
  }

  const following = body.following !== false;

  if (body.topicId) {
    if (following) {
      const { error } = await supabase
        .from("user_topic_follows")
        .upsert({ topic_id: body.topicId, user_id: userId }, { onConflict: "user_id,topic_id" });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      await supabase
        .from("user_topic_follows")
        .delete()
        .eq("user_id", userId)
        .eq("topic_id", body.topicId);
    }
  }

  if (body.sourceId) {
    if (following) {
      const { error } = await supabase
        .from("user_source_follows")
        .upsert(
          { source_id: body.sourceId, user_id: userId },
          { onConflict: "user_id,source_id" },
        );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      await supabase
        .from("user_source_follows")
        .delete()
        .eq("user_id", userId)
        .eq("source_id", body.sourceId);
    }
  }

  return NextResponse.json({ ok: true });
}
