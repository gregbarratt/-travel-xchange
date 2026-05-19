import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type AnalyticsEventInput = {
  entityId?: string | null;
  entityType?: string | null;
  eventName: string;
  metadata?: Record<string, unknown>;
  pagePath?: string | null;
  userId?: string | null;
};

export async function recordAnalyticsEvent(
  supabase: SupabaseClient<Database>,
  {
    entityId = null,
    entityType = null,
    eventName,
    metadata = {},
    pagePath = null,
    userId = null,
  }: AnalyticsEventInput,
) {
  return supabase.from("analytics_events").insert({
    entity_id: entityId,
    entity_type: entityType,
    event_name: eventName,
    metadata,
    page_path: pagePath,
    user_id: userId,
  });
}
