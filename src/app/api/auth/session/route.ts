import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  accessTokenCookieName,
  accessTokenMaxAgeSeconds,
  getCookieOptions,
  refreshTokenCookieName,
  refreshTokenMaxAgeSeconds,
} from "@/lib/auth/session-cookies";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type SessionPayload = {
  accessToken?: string;
  expiresIn?: number;
  refreshToken?: string;
};

function clearSessionCookies(response: NextResponse) {
  response.cookies.set(accessTokenCookieName, "", getCookieOptions(0));
  response.cookies.set(refreshTokenCookieName, "", getCookieOptions(0));
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as SessionPayload | null;
  const accessToken = body?.accessToken?.trim();
  const refreshToken = body?.refreshToken?.trim();

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { error: "Login session is missing." },
      { status: 400 },
    );
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return NextResponse.json(
      { error: "Login session could not be verified." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    accessTokenCookieName,
    accessToken,
    getCookieOptions(body?.expiresIn ?? accessTokenMaxAgeSeconds),
  );
  response.cookies.set(
    refreshTokenCookieName,
    refreshToken,
    getCookieOptions(refreshTokenMaxAgeSeconds),
  );

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
