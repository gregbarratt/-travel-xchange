import { NextRequest, NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  getAuthenticatedUser,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/suppliers/server";
import type { Company, Profile } from "@/types/database";

type ManagedPage = Pick<
  Company,
  | "company_type"
  | "id"
  | "name"
  | "page_visibility"
  | "status"
  | "verification_tier"
> & {
  cover_image_url: string | null;
  href: string;
  logo_url: string | null;
  managementReason: "owner" | "page_admin" | "platform_admin";
};

type ManagedCompanyRow = Pick<
  Company,
  | "company_type"
  | "id"
  | "name"
  | "page_visibility"
  | "status"
  | "verification_tier"
> &
  Partial<Pick<Company, "cover_image_url" | "logo_url">>;

const managedCompanySelect =
  "id, name, company_type, page_visibility, status, verification_tier";

export async function GET(request: NextRequest) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      {
        error:
          "Supabase server settings are missing. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
      },
      { status: 500 },
    );
  }

  const { error: authError, user } = await getAuthenticatedUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: profileError?.message ?? "Your profile could not be loaded." },
      { status: 500 },
    );
  }

  const viewerProfile = profile as Profile;
  const isAdmin = isPlatformAdmin(viewerProfile);

  if (isAdmin) {
    const { data, error } = await supabase
      .from("companies")
      .select(managedCompanySelect)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      pages: ((data ?? []) as ManagedCompanyRow[]).map((company) =>
        mapManagedPage(company, "platform_admin"),
      ),
      viewerProfile,
    });
  }

  const ownedResult = await supabase
    .from("companies")
    .select(managedCompanySelect)
    .eq("created_by", user.id)
    .order("name", { ascending: true });

  const membershipResult = await supabase
    .from("supplier_page_members")
    .select("company_id, role_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (ownedResult.error) {
    return NextResponse.json(
      { error: ownedResult.error.message },
      { status: 500 },
    );
  }

  if (membershipResult.error) {
    return NextResponse.json(
      { error: getManagedPagesSetupMessage(membershipResult.error.message) },
      { status: 500 },
    );
  }

  const memberships = membershipResult.data ?? [];
  const roleIds = Array.from(new Set(memberships.map((item) => item.role_id)));
  let pageAdminCompanyIds = new Set<string>();

  if (roleIds.length > 0) {
    const { data: pageAdminRoles, error: roleError } = await supabase
      .from("supplier_page_roles")
      .select("id")
      .eq("role_key", "page_admin")
      .eq("status", "active")
      .in("id", roleIds);

    if (roleError) {
      return NextResponse.json(
        { error: getManagedPagesSetupMessage(roleError.message) },
        { status: 500 },
      );
    }

    const pageAdminRoleIds = new Set((pageAdminRoles ?? []).map((role) => role.id));
    pageAdminCompanyIds = new Set(
      memberships
        .filter((membership) => pageAdminRoleIds.has(membership.role_id))
        .map((membership) => membership.company_id),
    );
  }

  const ownedCompanies = (ownedResult.data ?? []) as ManagedCompanyRow[];
  const ownedIds = new Set(ownedCompanies.map((company) => company.id));
  const extraPageAdminIds = Array.from(pageAdminCompanyIds).filter(
    (companyId) => !ownedIds.has(companyId),
  );
  let pageAdminCompanies: ManagedCompanyRow[] = [];

  if (extraPageAdminIds.length > 0) {
    const { data, error } = await supabase
      .from("companies")
      .select(managedCompanySelect)
      .in("id", extraPageAdminIds)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    pageAdminCompanies = (data ?? []) as ManagedCompanyRow[];
  }

  const pages = [
    ...ownedCompanies.map((company) => mapManagedPage(company, "owner")),
    ...pageAdminCompanies.map((company) =>
      mapManagedPage(company, "page_admin"),
    ),
  ].sort((first, second) => first.name.localeCompare(second.name));

  return NextResponse.json({ pages, viewerProfile });
}

function mapManagedPage(
  company: ManagedCompanyRow,
  managementReason: ManagedPage["managementReason"],
): ManagedPage {
  return {
    company_type: company.company_type,
    cover_image_url: company.cover_image_url ?? null,
    href: `/suppliers/${company.id}`,
    id: company.id,
    logo_url: company.logo_url ?? null,
    managementReason,
    name: company.name,
    page_visibility: company.page_visibility,
    status: company.status,
    verification_tier: company.verification_tier,
  };
}

function getManagedPagesSetupMessage(message: string) {
  if (
    message.includes("supplier_page_members") ||
    message.includes("supplier_page_roles")
  ) {
    return "The supplier page role tables are not installed yet. Run the supplier access SQL files in Supabase, then refresh this page.";
  }

  return message;
}
