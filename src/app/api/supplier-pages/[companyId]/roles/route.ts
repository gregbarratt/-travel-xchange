import { NextRequest, NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseAdminClient,
  getAuthenticatedUser,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import {
  createCustomSupplierPageRoleDraft,
  supplierPagePermissions,
  type SupplierPagePermissionKey,
} from "@/lib/suppliers/access-control";
import {
  canManageSupplierPageRoles,
  listSupplierPageRoles,
  supplierRoleTableNames,
} from "@/lib/suppliers/server";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

type RoleCreateBody = {
  description?: string | null;
  name?: string;
  permissions?: Partial<Record<SupplierPagePermissionKey, boolean>>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const result = await authorizeSupplierRoleManager(request, context);

  if ("response" in result) {
    return result.response;
  }

  const { companyId, supabase } = result;
  const rolesResult = await listSupplierPageRoles(supabase, companyId);

  if (rolesResult.error) {
    return NextResponse.json(
      {
        error: isMissingTableError(rolesResult.error, supplierRoleTableNames)
          ? "The supplier role tables are not installed yet. Run supabase/phase-22-supplier-access-phase-1.sql and supabase/phase-23-supplier-custom-roles.sql in Supabase."
          : rolesResult.error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    permissions: supplierPagePermissions,
    roles: rolesResult.roles,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const result = await authorizeSupplierRoleManager(request, context);

  if ("response" in result) {
    return result.response;
  }

  const { companyId, supabase, user } = result;
  const body = (await request.json().catch(() => null)) as RoleCreateBody | null;

  const { data: existingRoles, error: existingRolesError } = await supabase
    .from("supplier_page_roles")
    .select("role_key")
    .eq("company_id", companyId);

  if (existingRolesError) {
    return NextResponse.json(
      { error: existingRolesError.message },
      { status: 500 },
    );
  }

  let roleDraft;

  try {
    roleDraft = createCustomSupplierPageRoleDraft(
      { roleKey: "page_admin", status: "active" },
      {
        description: body?.description ?? null,
        name: body?.name ?? "",
        permissions: body?.permissions ?? {},
      },
      (existingRoles ?? []).map((role) => role.role_key),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The custom supplier role could not be created.",
      },
      { status: 400 },
    );
  }

  const { data: role, error: roleError } = await supabase
    .from("supplier_page_roles")
    .insert({
      company_id: companyId,
      created_by: user.id,
      description: roleDraft.description,
      is_system: false,
      name: roleDraft.name,
      role_key: roleDraft.roleKey,
      role_type: "custom",
      status: "active",
    })
    .select("*")
    .single();

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 });
  }

  const { error: permissionError } = await supabase
    .from("supplier_page_role_permissions")
    .insert(
      supplierPagePermissions.map((permission) => ({
        is_allowed: roleDraft.permissions?.[permission.key] === true,
        permission_key: permission.key,
        role_id: role.id,
        updated_by: user.id,
      })),
    );

  if (permissionError) {
    return NextResponse.json(
      { error: permissionError.message },
      { status: 500 },
    );
  }

  const rolesResult = await listSupplierPageRoles(supabase, companyId);

  return NextResponse.json({
    permissions: supplierPagePermissions,
    roles: rolesResult.roles,
  });
}

async function authorizeSupplierRoleManager(
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
