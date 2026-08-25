import { NextResponse, type NextRequest } from "next/server";

import { authoriseNewsModerator } from "@/lib/news/admin-auth";

/**
 * The trade news moderation queue.
 *
 * Anything touching collapse, safety, legal risk or regulation lands here,
 * along with everything from a low-trust source. A moderator approves,
 * rejects or unpublishes, and every decision is written to the audit trail.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ModerationBody = {
  postId?: string;
  action?: "approve" | "reject" | "unpublish";
  note?: string;
};

export async function GET(request: NextRequest) {
  const authorised = await authoriseNewsModerator(request);

  if ("response" in authorised) {
    return authorised.response;
  }

  const { supabase } = authorised;

  const { data, error } = await supabase
    .from("news_posts")
    .select(
      `*, news_sources ( id, name, publisher, slug, website_url ),
       news_post_topics ( confidence, news_topics ( id, name, slug ) )`,
    )
    .eq("status", "pending_review")
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(request: NextRequest) {
  const authorised = await authoriseNewsModerator(request);

  if ("response" in authorised) {
    return authorised.response;
  }

  const { actorId, supabase } = authorised;
  const body = (await request.json().catch(() => null)) as ModerationBody | null;

  if (!body?.postId || !body.action) {
    return NextResponse.json(
      { error: "Choose a story and a decision." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const patch =
    body.action === "approve"
      ? { published_to_feed_at: now, requires_moderation: false, status: "published" as const }
      : body.action === "reject"
        ? { requires_moderation: false, status: "rejected" as const }
        : { published_to_feed_at: null, status: "unpublished" as const };

  const { error } = await supabase.from("news_posts").update(patch).eq("id", body.postId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("news_moderation_events").insert({
    action:
      body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : "unpublished",
    actor_id: actorId,
    news_post_id: body.postId,
    note: body.note ?? null,
  });

  return NextResponse.json({ ok: true });
}
