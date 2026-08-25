import { NextResponse, type NextRequest } from "next/server";

import { authoriseMember } from "@/lib/news/admin-auth";
import { getPersonalisedNews, newsPageSize } from "@/lib/news/feed-query";

/**
 * One page of personalised trade news for the signed-in member.
 *
 * Relevance is decided here and applied in the database query, so the browser
 * only ever receives the stories this member should see.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorised = await authoriseMember(request);

  if ("response" in authorised) {
    return authorised.response;
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const topicId = url.searchParams.get("topicId");
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitParam) ? limitParam : newsPageSize;

  try {
    const page = await getPersonalisedNews(authorised.supabase, authorised.userId, {
      cursor,
      limit,
      topicId,
    });

    return NextResponse.json({
      audience: { mode: page.audience.mode },
      nextCursor: page.nextCursor,
      posts: page.posts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The news feed could not be loaded." },
      { status: 500 },
    );
  }
}
