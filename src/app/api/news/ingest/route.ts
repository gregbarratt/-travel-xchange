import { NextResponse, type NextRequest } from "next/server";

import { authoriseIngestionTrigger } from "@/lib/news/admin-auth";
import { runIngestion } from "@/lib/news/ingest";
import { createSupabaseNewsStore } from "@/lib/news/store";

/**
 * Scheduled trade news ingestion.
 *
 * Called by the platform scheduler on a fixed cadence (see `vercel.json`) and
 * by a platform admin pressing "Run ingestion now". Overlapping invocations
 * are safe: the run slot is claimed in the database before any publisher is
 * contacted, and a second caller exits immediately.
 *
 * This never runs on a member's request path. Members read news from our own
 * database and are never made to wait for a remote publisher.
 */

// Feed polling needs the Node runtime for DNS-based egress checks.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: NextRequest) {
  const authorised = await authoriseIngestionTrigger(request);

  if ("response" in authorised) {
    return authorised.response;
  }

  let store;

  try {
    store = createSupabaseNewsStore();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Supabase is not configured on this deployment.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await runIngestion(store, { trigger: authorised.trigger });

    if (result.status === "skipped") {
      return NextResponse.json(
        { reason: result.reason, status: "skipped" },
        { status: 200 },
      );
    }

    return NextResponse.json({
      runId: result.runId,
      sources: result.sources.map((source) => ({
        error: source.errorMessage,
        httpStatus: source.httpStatus,
        moderation: source.moderationCount,
        newItems: source.newItemCount,
        published: source.publishedCount,
        slug: source.sourceSlug,
        status: source.status,
      })),
      status: "completed",
      totals: result.totals,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "The ingestion run failed.",
        status: "failed",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return handle(request);
}

// Vercel Cron issues GET requests.
export async function GET(request: NextRequest) {
  return handle(request);
}
