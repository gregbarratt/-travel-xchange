import { NextRequest, NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseAdminClient,
  getAuthenticatedUser,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { setSupplierPageSectionVisibility } from "@/lib/suppliers/access-control";
import {
  canManageSupplierPageRoles,
  isSupplierPageSectionKey,
  isSupplierPageSectionVisibility,
  listSupplierPageSectionSettings,
  supplierVisibilityTableNames,
} from "@/lib/suppliers/server";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

type SectionUpdateBody = {
  sections?: {
    sectionKey?: string;
    section_key?: string;
    visibility?: string;
  }[];
};

const missingPhaseMessage =
  "The supplier section visibility tables are not installed yet. Run supabase/phase-24-supplier-visibility-approval.sql in Supabase, then refresh this page.";

export async function GET(request: NextRequest, context: RouteContext) {
  const result = await authorizeSectionManager(request, context);

  if ("response" in result) {
    return result.response;
  }

  const { companyId, supabase, user } = result;
  const settingsResult = await listSupplierPageSectionSettings(
    supabase,
    companyId,
    user.id,
  );

  if (settingsResult.error) {
    return NextResponse.json(
      {
        error: isMissingTableError(
          settingsResult.error,
          supplierVisibilityTableNames,
        )
          ? missingPhaseMessage
          : settingsResult.error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ sections: settingsResult.settings });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const result = await authorizeSectionManager(request, context);

  if ("response" in result) {
    return result.response;
  }

  const { companyId, supabase, user } = result;
  const body = (await request.json().catch(() => null)) as
    | SectionUpdateBody
    | null;
  const sections = body?.sections ?? [];

  if (sections.length === 0) {
    return NextResponse.json(
      { error: "Choose at least one section visibility setting to save." },
      { status: 400 },
    );
  }

  const sectionDrafts = [];

  for (const section of sections) {
    const sectionKey = section.sectionKey ?? section.section_key ?? "";
    const visibility = section.visibility ?? "";

    if (
      !isSupplierPageSectionKey(sectionKey) ||
      !isSupplierPageSectionVisibility(visibility)
    ) {
      return NextResponse.json(
        { error: "One of the section visibility settings is invalid." },
        { status: 400 },
      );
    }

    sectionDrafts.push(
      setSupplierPageSectionVisibility(
        { roleKey: "page_admin", status: "active" },
        sectionKey,
        visibility,
      ),
    );
  }

  const { error } = await supabase.from("supplier_page_section_settings").upsert(
    sectionDrafts.map((section) => ({
      company_id: companyId,
      section_key: section.sectionKey,
      updated_by: user.id,
      visibility: section.visibility,
    })),
    { onConflict: "company_id,section_key" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const settingsResult = await listSupplierPageSectionSettings(
    supabase,
    companyId,
    user.id,
  );

  return NextResponse.json({ sections: settingsResult.settings });
}

async function authorizeSectionManager(
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
