import { NextRequest, NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  getAuthenticatedUser,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { normalizeWebsiteUrl } from "@/lib/urls";
import { canManageSupplierPageRoles } from "@/lib/suppliers/server";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

type SupplierBrandingBody = {
  coverImageUrl?: string | null;
  cover_image_url?: string | null;
  logoUrl?: string | null;
  logo_url?: string | null;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const result = await authorizeBrandingManager(request, context);

  if ("response" in result) {
    return result.response;
  }

  const { companyId, supabase } = result;
  const { data, error } = await supabase
    .from("companies")
    .select("id, logo_url, cover_image_url")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: getBrandingSetupMessage(error.message) },
      { status: 500 },
    );
  }

  return NextResponse.json({ branding: data });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const result = await authorizeBrandingManager(request, context);

  if ("response" in result) {
    return result.response;
  }

  const { companyId, supabase } = result;
  const body = (await request.json().catch(() => null)) as
    | SupplierBrandingBody
    | null;

  const logoUrl = normalizeWebsiteUrl(
    String(body?.logoUrl ?? body?.logo_url ?? ""),
  );
  const coverImageUrl = normalizeWebsiteUrl(
    String(body?.coverImageUrl ?? body?.cover_image_url ?? ""),
  );

  const { data, error } = await supabase
    .from("companies")
    .update({
      cover_image_url: coverImageUrl,
      logo_url: logoUrl,
    })
    .eq("id", companyId)
    .select("id, logo_url, cover_image_url")
    .single();

  if (error) {
    return NextResponse.json(
      { error: getBrandingSetupMessage(error.message) },
      { status: 500 },
    );
  }

  return NextResponse.json({
    branding: data,
    message: "Supplier brand images saved.",
  });
}

function getBrandingSetupMessage(message: string) {
  if (
    message.includes("logo_url") ||
    message.includes("cover_image_url") ||
    message.includes("companies.logo_url") ||
    message.includes("companies.cover_image_url")
  ) {
    return "The supplier branding fields are not installed yet. Run supabase/phase-26-supplier-branding.sql in Supabase, then refresh this page.";
  }

  return message;
}

async function authorizeBrandingManager(
  request: NextRequest,
  context: RouteContext,
) {
  if (!isSupabaseServerConfigured()) {
    return {
      response: NextResponse.json(
        {
          error:
            "Supabase server settings are missing. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
        },
        { status: 500 },
      ),
    };
  }

  const { error: authError, user } = await getAuthenticatedUser(request);

  if (authError || !user) {
    return {
      response: NextResponse.json({ error: authError }, { status: 401 }),
    };
  }

  const { companyId } = await context.params;
  const supabase = createSupabaseAdminClient();
  const access = await canManageSupplierPageRoles(supabase, companyId, user);

  if (!access.canManage) {
    return {
      response: NextResponse.json(
        { error: access.reason ?? "You cannot manage this supplier page." },
        { status: access.reason === "Supplier page not found." ? 404 : 403 },
      ),
    };
  }

  return { companyId, supabase, user };
}
