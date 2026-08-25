import { NextResponse, type NextRequest } from "next/server";

import { authoriseNewsSourceAdmin } from "@/lib/news/admin-auth";
import { assertSafeFetchUrl, UnsafeUrlError } from "@/lib/news/url";
import type { NewsSource } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ sourceId: string }>;
};

type UpdateSourceBody = {
  enabled?: boolean;
  autoPublish?: boolean;
  feedUrl?: string | null;
  feedType?: "rss" | "atom" | "json";
  trustLevel?: "low" | "standard" | "high";
  pollingIntervalMinutes?: number;
  defaultTopicSlugs?: string[];
  rightsNotes?: string | null;
  name?: string;
  publisher?: string;
  websiteUrl?: string;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authorised = await authoriseNewsSourceAdmin(request);

  if ("response" in authorised) {
    return authorised.response;
  }

  const { sourceId } = await context.params;
  const { supabase } = authorised;
  const body = (await request.json().catch(() => null)) as UpdateSourceBody | null;

  if (!body) {
    return NextResponse.json({ error: "No changes were supplied." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("news_sources")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "That news source no longer exists." }, { status: 404 });
  }

  const patch: Partial<NewsSource> = {};

  if (body.feedUrl !== undefined) {
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

    patch.feed_url = body.feedUrl;
  }

  if (body.enabled !== undefined) {
    const feedUrl = patch.feed_url ?? existing.feed_url;

    // A source cannot be switched on until a real feed endpoint is recorded.
    // The database enforces this too; refusing here gives a usable message.
    if (body.enabled && !feedUrl) {
      return NextResponse.json(
        {
          error:
            "Add and test a verified feed URL before enabling this source. Use 'Test source' to check the endpoint first.",
        },
        { status: 400 },
      );
    }

    patch.enabled = body.enabled;
    patch.health_status = body.enabled ? existing.health_status : "disabled";

    if (body.enabled && existing.health_status === "disabled") {
      patch.health_status = "unverified";
    }
  }

  if (body.autoPublish !== undefined) {
    patch.auto_publish = body.autoPublish;
  }

  if (body.feedType !== undefined) {
    patch.feed_type = body.feedType;
  }

  if (body.trustLevel !== undefined) {
    patch.trust_level = body.trustLevel;
  }

  if (body.pollingIntervalMinutes !== undefined) {
    patch.polling_interval_minutes = body.pollingIntervalMinutes;
  }

  if (body.defaultTopicSlugs !== undefined) {
    patch.default_topic_slugs = body.defaultTopicSlugs;
  }

  if (body.rightsNotes !== undefined) {
    patch.rights_notes = body.rightsNotes;
  }

  if (body.name !== undefined) {
    patch.name = body.name.trim();
  }

  if (body.publisher !== undefined) {
    patch.publisher = body.publisher.trim();
  }

  if (body.websiteUrl !== undefined) {
    patch.website_url = body.websiteUrl.trim();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ source: existing });
  }

  const { data, error } = await supabase
    .from("news_sources")
    .update(patch)
    .eq("id", sourceId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ source: data });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const authorised = await authoriseNewsSourceAdmin(request);

  if ("response" in authorised) {
    return authorised.response;
  }

  const { sourceId } = await context.params;
  const { supabase } = authorised;

  // Disabling keeps the published archive and its attribution intact, which
  // deleting the source would cascade away.
  const { error } = await supabase
    .from("news_sources")
    .update({ enabled: false, health_status: "disabled" })
    .eq("id", sourceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
