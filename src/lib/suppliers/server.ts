import type { SupabaseClient, User } from "@supabase/supabase-js";

import type {
  Database,
  Profile,
  SupplierPagePermissionKey,
  SupplierPageRole,
  SupplierPageRolePermission,
} from "@/types/database";

export type SupplierPageRoleWithPermissions = SupplierPageRole & {
  permissions: Record<SupplierPagePermissionKey, boolean>;
};

export const supplierRoleTableNames = [
  "supplier_page_permissions",
  "supplier_page_roles",
  "supplier_page_members",
  "supplier_page_role_permissions",
];

export function isPlatformAdmin(profile: Pick<Profile, "role"> | null) {
  return (
    profile?.role === "moderator" ||
    profile?.role === "admin" ||
    profile?.role === "super_admin"
  );
}

export async function canManageSupplierPageRoles(
  supabase: SupabaseClient<Database>,
  companyId: string,
  user: User,
) {
  const [{ data: company }, { data: profile }] = await Promise.all([
    supabase
      .from("companies")
      .select("id, created_by")
      .eq("id", companyId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!company) {
    return { canManage: false, reason: "Supplier page not found." };
  }

  if (company.created_by === user.id || isPlatformAdmin(profile)) {
    return { canManage: true, reason: null };
  }

  const { data: memberships } = await supabase
    .from("supplier_page_members")
    .select("role_id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("status", "active");

  const roleIds = (memberships ?? []).map((membership) => membership.role_id);

  if (roleIds.length === 0) {
    return {
      canManage: false,
      reason: "Only the supplier page admin can manage roles.",
    };
  }

  const { data: roles } = await supabase
    .from("supplier_page_roles")
    .select("id")
    .eq("company_id", companyId)
    .eq("role_key", "page_admin")
    .eq("status", "active")
    .in("id", roleIds);

  return {
    canManage: Boolean(roles?.length),
    reason: roles?.length
      ? null
      : "Only the supplier page admin can manage roles.",
  };
}

export async function listSupplierPageRoles(
  supabase: SupabaseClient<Database>,
  companyId: string,
) {
  const [{ data: roles, error: rolesError }, { data: permissions }] =
    await Promise.all([
      supabase
        .from("supplier_page_roles")
        .select("*")
        .eq("company_id", companyId)
        .neq("status", "archived")
        .order("is_system", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("supplier_page_role_permissions")
        .select("*")
        .in(
          "role_id",
          await getSupplierPageRoleIds(supabase, companyId),
        ),
    ]);

  if (rolesError) {
    return { error: rolesError, roles: [] };
  }

  return {
    error: null,
    roles: mapSupplierPageRolesWithPermissions(
      (roles ?? []) as SupplierPageRole[],
      (permissions ?? []) as SupplierPageRolePermission[],
    ),
  };
}

async function getSupplierPageRoleIds(
  supabase: SupabaseClient<Database>,
  companyId: string,
) {
  const { data } = await supabase
    .from("supplier_page_roles")
    .select("id")
    .eq("company_id", companyId)
    .neq("status", "archived");

  return (data ?? []).map((role) => role.id);
}

function mapSupplierPageRolesWithPermissions(
  roles: SupplierPageRole[],
  permissions: SupplierPageRolePermission[],
) {
  return roles.map<SupplierPageRoleWithPermissions>((role) => {
    const rolePermissions = permissions.filter(
      (permission) => permission.role_id === role.id,
    );

    return {
      ...role,
      permissions: rolePermissions.reduce<
        Record<SupplierPagePermissionKey, boolean>
      >(
        (permissionMap, permission) => ({
          ...permissionMap,
          [permission.permission_key]: permission.is_allowed,
        }),
        {} as Record<SupplierPagePermissionKey, boolean>,
      ),
    };
  });
}
