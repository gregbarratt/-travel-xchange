import { NextRequest, NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  getAuthenticatedUser,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import {
  assertCanDeleteSupplierPageRole,
  supplierPagePermissions,
  updateSupplierPageRoleDraft,
  type SupplierPagePermissionKey,
} from "@/lib/suppliers/access-control";
import {
  canManageSupplierPageRoles,
  listSupplierPageRoles,
} from "@/lib/suppliers/server";
import type {
  SupplierPageRole,
  SupplierPageRolePermission,
} from "@/types/database";

type RouteContext = {
  params: Promise<{ companyId: string; roleId: string }>;
};

type RoleUpdateBody = {
  description?: string | null;
  name?: string;
  permissions?: Partial<Record<SupplierPagePermissionKey, boolean>>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const result = await authorizeSupplierRoleManager(request, context);

  if ("response" in result) {
    return result.response;
  }

  const { companyId, roleId, supabase, user } = result;
  const body = (await request.json().catch(() => null)) as RoleUpdateBody | null;
  const roleResult = await getSupplierPageRole(supabase, companyId, roleId);

  if ("response" in roleResult) {
    return roleResult.response;
  }

  const { role, permissions } = roleResult;
  const currentPermissions = permissions.reduce<
    Partial<Record<SupplierPagePermissionKey, boolean>>
  >(
    (permissionMap, permission) => ({
      ...permissionMap,
      [permission.permission_key]: permission.is_allowed,
    }),
    {},
  );

  let roleDraft;

  try {
    roleDraft = updateSupplierPageRoleDraft(
      { roleKey: "page_admin", status: "active" },
      {
        description: role.description,
        id: role.id,
        isSystem: role.is_system,
        name: role.name,
        permissions: currentPermissions,
        roleKey: role.role_key,
        roleType: role.role_type,
        status: role.status,
      },
      {
        description: body?.description ?? undefined,
        name: body?.name ?? undefined,
        permissions: {
          ...currentPermissions,
          ...(body?.permissions ?? {}),
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The supplier role could not be updated.",
      },
      { status: 400 },
    );
  }

  if (role.role_type === "custom") {
    const { error: roleUpdateError } = await supabase
      .from("supplier_page_roles")
      .update({
        description: roleDraft.description,
        name: roleDraft.name,
      })
      .eq("id", role.id)
      .eq("company_id", companyId);

    if (roleUpdateError) {
      return NextResponse.json(
        { error: roleUpdateError.message },
        { status: 500 },
      );
    }
  }

  const { error: permissionError } = await supabase
    .from("supplier_page_role_permissions")
    .upsert(
      supplierPagePermissions.map((permission) => ({
        is_allowed: roleDraft.permissions?.[permission.key] === true,
        permission_key: permission.key,
        role_id: role.id,
        updated_by: user.id,
      })),
      { onConflict: "role_id,permission_key" },
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

export async function DELETE(request: NextRequest, context: RouteContext) {
  const result = await authorizeSupplierRoleManager(request, context);

  if ("response" in result) {
    return result.response;
  }

  const { companyId, roleId, supabase } = result;
  const roleResult = await getSupplierPageRole(supabase, companyId, roleId);

  if ("response" in roleResult) {
    return roleResult.response;
  }

  const { role } = roleResult;

  try {
    assertCanDeleteSupplierPageRole(
      { roleKey: "page_admin", status: "active" },
      {
        description: role.description,
        id: role.id,
        isSystem: role.is_system,
        name: role.name,
        roleKey: role.role_key,
        roleType: role.role_type,
        status: role.status,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The supplier role could not be deleted.",
      },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("supplier_page_roles")
    .delete()
    .eq("id", role.id)
    .eq("company_id", companyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  const { companyId, roleId } = await context.params;
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

  return { companyId, roleId, supabase, user };
}

async function getSupplierPageRole(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  companyId: string,
  roleId: string,
) {
  const { data: role, error: roleError } = await supabase
    .from("supplier_page_roles")
    .select("*")
    .eq("id", roleId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (roleError) {
    return {
      response: NextResponse.json({ error: roleError.message }, { status: 500 }),
    };
  }

  if (!role) {
    return {
      response: NextResponse.json(
        { error: "Supplier page role not found." },
        { status: 404 },
      ),
    };
  }

  const { data: permissions, error: permissionsError } = await supabase
    .from("supplier_page_role_permissions")
    .select("*")
    .eq("role_id", role.id);

  if (permissionsError) {
    return {
      response: NextResponse.json(
        { error: permissionsError.message },
        { status: 500 },
      ),
    };
  }

  return {
    permissions: (permissions ?? []) as SupplierPageRolePermission[],
    role: role as SupplierPageRole,
  };
}
