import { NextResponse, type NextRequest } from "next/server";

import { isPlatformAdminRole } from "../auth/platform-access.ts";
import {
  createSupabaseAdminClient,
  getAuthenticatedUser,
  isSupabaseServerConfigured,
} from "../supabase/server.ts";
import type { Database, TravelXchangeRole } from "../../types/database.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Authorisation for the news surfaces.
 *
 * Managing sources and moderating incoming stories are platform-level powers,
 * so they are checked against the caller's profile role on the server. A
 * hidden menu item is not a permission.
 */

export type NewsAdminContext = {
  actorId: string;
  role: TravelXchangeRole;
  supabase: SupabaseClient<Database>;
};

function unconfigured() {
  return NextResponse.json(
    { error: "Supabase is not configured on this deployment." },
    { status: 503 },
  );
}

async function loadActorRole(supabase: SupabaseClient<Database>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return data?.role ?? null;
}

/**
 * Requires a signed-in admin or super admin. Source configuration changes what
 * every member reads, so moderators are deliberately not included.
 */
export async function authoriseNewsSourceAdmin(
  request: NextRequest,
): Promise<NewsAdminContext | { response: NextResponse }> {
  if (!isSupabaseServerConfigured()) {
    return { response: unconfigured() };
  }

  const { error, user } = await getAuthenticatedUser(request);

  if (error || !user) {
    return {
      response: NextResponse.json(
        { error: error ?? "Please log in before continuing." },
        { status: 401 },
      ),
    };
  }

  const supabase = createSupabaseAdminClient();
  const role = await loadActorRole(supabase, user.id);

  if (!role || (role !== "admin" && role !== "super_admin")) {
    return {
      response: NextResponse.json(
        { error: "Only platform admins can manage news sources." },
        { status: 403 },
      ),
    };
  }

  return { actorId: user.id, role, supabase };
}

/**
 * Requires a signed-in moderator, admin or super admin. Moderators review the
 * queue but cannot change which publishers are ingested.
 */
export async function authoriseNewsModerator(
  request: NextRequest,
): Promise<NewsAdminContext | { response: NextResponse }> {
  if (!isSupabaseServerConfigured()) {
    return { response: unconfigured() };
  }

  const { error, user } = await getAuthenticatedUser(request);

  if (error || !user) {
    return {
      response: NextResponse.json(
        { error: error ?? "Please log in before continuing." },
        { status: 401 },
      ),
    };
  }

  const supabase = createSupabaseAdminClient();
  const role = await loadActorRole(supabase, user.id);

  if (!isPlatformAdminRole(role)) {
    return {
      response: NextResponse.json(
        { error: "Only moderators and platform admins can review trade news." },
        { status: 403 },
      ),
    };
  }

  return { actorId: user.id, role: role as TravelXchangeRole, supabase };
}

/** Requires a signed-in member. Used by the personalised news surfaces. */
export async function authoriseMember(
  request: NextRequest,
): Promise<{ userId: string; supabase: SupabaseClient<Database> } | { response: NextResponse }> {
  if (!isSupabaseServerConfigured()) {
    return { response: unconfigured() };
  }

  const { error, user } = await getAuthenticatedUser(request);

  if (error || !user) {
    return {
      response: NextResponse.json(
        { error: error ?? "Please log in before continuing." },
        { status: 401 },
      ),
    };
  }

  return { supabase: createSupabaseAdminClient(), userId: user.id };
}

/**
 * Authorises the scheduled ingestion endpoint.
 *
 * The route is reachable from the public internet, so it is only ever run for
 * a caller carrying the cron secret, or for a signed-in platform admin
 * pressing "Run ingestion now".
 */
export async function authoriseIngestionTrigger(
  request: NextRequest,
): Promise<{ trigger: "cron" | "manual"; actorId: string | null } | { response: NextResponse }> {
  const secret = process.env.NEWS_INGESTION_CRON_SECRET ?? process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  const presented =
    request.headers.get("x-cron-secret") ??
    (header?.toLowerCase().startsWith("bearer ") ? header.slice("bearer ".length).trim() : null);

  if (secret && presented && timingSafeEqual(secret, presented)) {
    return { actorId: null, trigger: "cron" };
  }

  const admin = await authoriseNewsSourceAdmin(request);

  if ("response" in admin) {
    // Do not leak whether the secret exists; an unauthenticated caller always
    // sees the same refusal.
    return {
      response: NextResponse.json(
        { error: "This endpoint requires the ingestion cron secret or a platform admin login." },
        { status: 401 },
      ),
    };
  }

  return { actorId: admin.actorId, trigger: "manual" };
}

/** Length-independent comparison, so a wrong secret leaks no timing signal. */
function timingSafeEqual(expected: string, presented: string) {
  if (expected.length !== presented.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ presented.charCodeAt(index);
  }

  return mismatch === 0;
}
