import { NextResponse, type NextRequest } from "next/server";

import { authoriseNewsSourceAdmin } from "@/lib/news/admin-auth";
import { fetchFeed } from "@/lib/news/fetch-feed";
import { FeedParseError, parseFeed } from "@/lib/news/feed-parser";
import { buildArticleSummary } from "@/lib/news/summarise";
import { classifyArticle } from "@/lib/news/classify";
import { assertSafeFetchUrl, UnsafeUrlError } from "@/lib/news/url";

/**
 * Live verification of a candidate feed endpoint.
 *
 * This is how a source gets switched on. Travel Xchange ships every publisher
 * disabled with no feed URL, because a feed endpoint is a fact about the
 * publisher that has to be checked rather than assumed. An admin pastes the
 * endpoint they found, this route fetches and parses it for real, and only a
 * response that is genuinely a feed can be saved.
 *
 * Nothing is ingested here. The response is a preview so the admin can see
 * what the source would contribute before enabling it.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RouteContext = {
  params: Promise<{ sourceId: string }>;
};

type TestSourceBody = {
  /** Candidate endpoint. Falls back to the stored feed URL. */
  feedUrl?: string;
  /** Persist the verified endpoint against the source. */
  save?: boolean;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const authorised = await authoriseNewsSourceAdmin(request);

  if ("response" in authorised) {
    return authorised.response;
  }

  const { sourceId } = await context.params;
  const { supabase } = authorised;
  const body = (await request.json().catch(() => null)) as TestSourceBody | null;

  const { data: source } = await supabase
    .from("news_sources")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();

  if (!source) {
    return NextResponse.json({ error: "That news source no longer exists." }, { status: 404 });
  }

  const candidate = body?.feedUrl?.trim() || source.feed_url;

  if (!candidate) {
    return NextResponse.json(
      {
        error:
          "Enter the publisher's feed URL to test. Travel Xchange does not guess feed endpoints.",
      },
      { status: 400 },
    );
  }

  try {
    assertSafeFetchUrl(candidate);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof UnsafeUrlError ? error.message : "That URL cannot be fetched.",
        ok: false,
      },
      { status: 400 },
    );
  }

  const response = await fetchFeed({ attempts: 2, url: candidate });

  if (response.status === "not_modified") {
    return NextResponse.json({
      httpStatus: 304,
      message: "The publisher reported no change since the last fetch.",
      ok: true,
    });
  }

  if (response.status === "failed") {
    await supabase
      .from("news_sources")
      .update({
        consecutive_failures: source.consecutive_failures + 1,
        health_status: "failing",
        last_attempt_at: new Date().toISOString(),
        last_error: response.error,
      })
      .eq("id", sourceId);

    return NextResponse.json(
      { error: response.error, httpStatus: response.httpStatus, ok: false },
      { status: 502 },
    );
  }

  let feed;

  try {
    feed = parseFeed(response.body);
  } catch (error) {
    const message =
      error instanceof FeedParseError ? error.message : "The response could not be parsed.";

    await supabase
      .from("news_sources")
      .update({
        consecutive_failures: source.consecutive_failures + 1,
        health_status: "failing",
        last_attempt_at: new Date().toISOString(),
        last_error: message,
      })
      .eq("id", sourceId);

    return NextResponse.json(
      { error: message, httpStatus: response.httpStatus, ok: false },
      { status: 422 },
    );
  }

  if (feed.items.length === 0) {
    return NextResponse.json(
      {
        error: "That endpoint parsed as a feed but contained no items.",
        httpStatus: response.httpStatus,
        ok: false,
      },
      { status: 422 },
    );
  }

  // Show the admin exactly what Travel Xchange would store: headline,
  // attribution, short extract and the topics the rules assign.
  const preview = feed.items.slice(0, 5).map((item) => {
    const summary = buildArticleSummary(item.description, item.title);
    const classification = classifyArticle(
      item.title,
      summary.summary ?? "",
      source.default_topic_slugs ?? [],
    );

    return {
      link: item.link,
      publishedAt: item.publishedAt?.toISOString() ?? null,
      sensitivity: classification.sensitivity,
      summary: summary.summary,
      title: item.title,
      topics: classification.topics,
    };
  });

  if (body?.save) {
    const { error } = await supabase
      .from("news_sources")
      .update({
        consecutive_failures: 0,
        feed_type: feed.format,
        feed_url: candidate,
        health_status: "healthy",
        last_attempt_at: new Date().toISOString(),
        last_error: null,
        last_success_at: new Date().toISOString(),
      })
      .eq("id", sourceId);

    if (error) {
      return NextResponse.json({ error: error.message, ok: false }, { status: 400 });
    }
  }

  return NextResponse.json({
    feedFormat: feed.format,
    feedTitle: feed.title,
    httpStatus: response.httpStatus,
    itemCount: feed.items.length,
    ok: true,
    preview,
    saved: Boolean(body?.save),
    supportsConditionalRequests: Boolean(response.etag || response.lastModified),
  });
}
