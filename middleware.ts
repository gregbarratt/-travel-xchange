import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  accessTokenCookieName,
  accessTokenMaxAgeSeconds,
  getCookieOptions,
  refreshTokenCookieName,
  refreshTokenMaxAgeSeconds,
} from "./src/lib/auth/session-cookies";
import {
  canViewInternalPricing,
  isProfileApprovedForPlatform,
} from "./src/lib/auth/platform-access";
import type { Database } from "./src/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const accessPendingRoute = "/access-pending";

const publicExactRoutes = new Set([
  "/",
  "/forgot-password",
  "/login",
  "/register",
  "/robots.txt",
  "/sitemap.xml",
  "/update-password",
]);

function isPublicRoute(pathname: string) {
  if (publicExactRoutes.has(pathname)) {
    return true;
  }

  return pathname.startsWith("/legal/");
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (requestedPath !== "/login") {
    loginUrl.searchParams.set("next", requestedPath);
  }

  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(accessTokenCookieName, "", getCookieOptions(0));
  response.cookies.set(refreshTokenCookieName, "", getCookieOptions(0));
  return response;
}

function redirectToAccessPending(request: NextRequest) {
  return NextResponse.redirect(new URL(accessPendingRoute, request.url));
}

function createSupabaseAuthClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createSupabaseRequestClient(accessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

async function getPlatformAccessResponse(
  request: NextRequest,
  accessToken: string,
  userId: string,
) {
  if (request.nextUrl.pathname === accessPendingRoute) {
    return NextResponse.next();
  }

  const supabase = createSupabaseRequestClient(accessToken);

  if (!supabase) {
    return redirectToAccessPending(request);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, verification_tier")
    .eq("id", userId)
    .maybeSingle();

  if (!isProfileApprovedForPlatform(profile)) {
    return redirectToAccessPending(request);
  }

  if (request.nextUrl.pathname === "/pricing" && !canViewInternalPricing(profile)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const supabase = createSupabaseAuthClient();

  if (!supabase) {
    return redirectToLogin(request);
  }

  const accessToken = request.cookies.get(accessTokenCookieName)?.value;
  const refreshToken = request.cookies.get(refreshTokenCookieName)?.value;

  if (accessToken) {
    const { data } = await supabase.auth.getUser(accessToken);

    if (data.user) {
      return getPlatformAccessResponse(request, accessToken, data.user.id);
    }
  }

  if (refreshToken) {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (!error && data.session) {
      const response = await getPlatformAccessResponse(
        request,
        data.session.access_token,
        data.session.user.id,
      );
      response.cookies.set(
        accessTokenCookieName,
        data.session.access_token,
        getCookieOptions(data.session.expires_in ?? accessTokenMaxAgeSeconds),
      );
      response.cookies.set(
        refreshTokenCookieName,
        data.session.refresh_token,
        getCookieOptions(refreshTokenMaxAgeSeconds),
      );
      return response;
    }
  }

  return redirectToLogin(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};
