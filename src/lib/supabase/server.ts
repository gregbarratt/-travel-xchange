import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseServerConfigured() {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseServiceRoleKey &&
      !supabaseUrl.includes("your-project-ref") &&
      !supabaseAnonKey.includes("your-supabase-anon-key") &&
      !supabaseServiceRoleKey.includes("server-only-never-share"),
  );
}

export function createSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Supabase server credentials are not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");

  if (!header?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return header.slice("bearer ".length).trim();
}

export async function getAuthenticatedUser(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Supabase is not configured.", user: null };
  }

  const token = getBearerToken(request);

  if (!token) {
    return { error: "Please log in before continuing.", user: null };
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { error: "Your login session could not be verified.", user: null };
  }

  return { error: null, user: data.user };
}
