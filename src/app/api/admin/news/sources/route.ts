import { NextResponse, type NextRequest } from "next/server";

import { authoriseNewsSourceAdmin } from "@/lib/news/admin-auth";
import { assertSafeFetchUrl, UnsafeUrlError } from "@/lib/news/url";

/**
 * Source configuration for platform admins.
 *
 * Adding or editing a source never requires a code change, which is the point:
 * a feed that starts misbehaving can be switched off from the admin screen.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateSourceBody = {
  name?: string;
  slug?: string;
  publisher?: string;
  websiteUrl?: string;
  feedUrl?: string | null;
  feedType?: "rss" | "atom" | "json";
  sourceType?: "trade_media" | "official_body" | "supplier" | "platform";
  trustLevel?: "low" | "standard" | "high";
  pollingIntervalMinutes?: number;
  defaultTopicSlugs?: string[];
  rightsNotes?: string | null;
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET(request: NextRequest) {
  const authorised = await authoriseNewsSourceAdmin(request);

  if ("response" in authorised) {
    return authorised.response;
  }

  const { supabase } = authorised;

  const [sources, runs, sourceRuns, postCounts] = await Promise.all([
    supabase.from("news_sources").select("*").order("name", { ascending: true }),
    supabase
      .from("news_ingestion_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(10),
    supabase
      .from("news_ingestion_source_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("news_posts").select("source_id, status"),
  ]);

  const countsBySource = new Map<string, { published: number; pending: number }>();

  for (const post of postCounts.data ?? []) {
    const entry = countsBySource.get(post.source_id) ?? { pending: 0, published: 0 };

    if (post.status === "published") {
      entry.published += 1;
    } else if (post.status === "pending_review") {
      entry.pending += 1;
    }

    countsBySource.set(post.source_id, entry);
  }

  return NextResponse.json({
    recentRuns: runs.data ?? [],
    recentSourceRuns: sourceRuns.data ?? [],
    sources: (sources.data ?? []).map((source) => ({
      ...source,
      counts: countsBySource.get(source.id) ?? { pending: 0, published: 0 },
    })),
  });
}

export async function POST(request: NextRequest) {
  const authorised = await authoriseNewsSourceAdmin(request);

  if ("response" in authorised) {
    return authorised.response;
  }

  const { supabase } = authorised;
  const body = (await request.json().catch(() => null)) as CreateSourceBody | null;

  if (!body?.name?.trim() || !body.websiteUrl?.trim()) {
    return NextResponse.json(
      { error: "A source needs a name and the publisher's website address." },
      { status: 400 },
    );
  }

  if (body.feedUrl) {
    try {
      assertSafeFetchUrl(body.feedUrl);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof UnsafeUrlError ? error.message : "The feed URL could not be used.",
        },
        { status: 400 },
      );
    }
  }

  const name = body.name.trim();

  const { data, error } = await supabase
    .from("news_sources")
    .insert({
      default_topic_slugs: body.defaultTopicSlugs ?? [],
      // A new source always starts switched off. It is enabled only after a
      // successful live test against a real feed endpoint.
      enabled: false,
      feed_type: body.feedType ?? "rss",
      feed_url: body.feedUrl ?? null,
      health_status: "unverified",
      name,
      polling_interval_minutes: body.pollingIntervalMinutes ?? 15,
      publisher: body.publisher?.trim() || name,
      rights_notes: body.rightsNotes ?? null,
      slug: body.slug?.trim() || toSlug(name),
      source_type: body.sourceType ?? "trade_media",
      trust_level: body.trustLevel ?? "standard",
      website_url: body.websiteUrl.trim(),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ source: data }, { status: 201 });
}
