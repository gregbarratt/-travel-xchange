import type { SupabaseClient, User } from "@supabase/supabase-js";

import type {
  Database,
  Profile,
  SupplierPageAccessRequest,
  SupplierPageContentSubmission,
  SupplierPagePermissionKey,
  SupplierPageRole,
  SupplierPageRolePermission,
  SupplierPageSectionKey,
  SupplierPageSectionSetting,
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

export const supplierVisibilityTableNames = [
  "supplier_page_section_settings",
  "supplier_page_content_submissions",
];

export const supplierAgentAccessTableNames = [
  "supplier_page_access_requests",
  "supplier_page_members",
  "supplier_page_roles",
];

const supplierSectionKeys = [
  "profile",
  "news",
  "jobs",
  "events",
  "media",
  "training",
  "adverts",
  "team",
] as const satisfies readonly SupplierPageSectionKey[];

export function isSupplierPageSectionKey(
  value: string,
): value is SupplierPageSectionKey {
  return supplierSectionKeys.includes(value as SupplierPageSectionKey);
}

export function isSupplierPageSectionVisibility(
  value: string,
): value is SupplierPageSectionSetting["visibility"] {
  return value === "public" || value === "private";
}

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
        .neq("role_key", "approved_agent")
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

export async function listSupplierPageSectionSettings(
  supabase: SupabaseClient<Database>,
  companyId: string,
  updatedBy?: string,
) {
  const { data: existingSettings, error } = await supabase
    .from("supplier_page_section_settings")
    .select("*")
    .eq("company_id", companyId)
    .order("section_key", { ascending: true });

  if (error) {
    return { error, settings: [] as SupplierPageSectionSetting[] };
  }

  const existingKeys = new Set(
    (existingSettings ?? []).map((setting) => setting.section_key),
  );
  const missingSettings = supplierSectionKeys.filter(
    (sectionKey) => !existingKeys.has(sectionKey),
  );

  if (missingSettings.length > 0) {
    const { error: upsertError } = await supabase
      .from("supplier_page_section_settings")
      .upsert(
        missingSettings.map((sectionKey) => ({
          company_id: companyId,
          section_key: sectionKey,
          updated_by: updatedBy ?? null,
          visibility: "public" as const,
        })),
        { onConflict: "company_id,section_key" },
      );

    if (upsertError) {
      return { error: upsertError, settings: [] as SupplierPageSectionSetting[] };
    }

    const { data: refreshedSettings, error: refreshError } = await supabase
      .from("supplier_page_section_settings")
      .select("*")
      .eq("company_id", companyId)
      .order("section_key", { ascending: true });

    return {
      error: refreshError,
      settings: (refreshedSettings ?? []) as SupplierPageSectionSetting[],
    };
  }

  return {
    error: null,
    settings: (existingSettings ?? []) as SupplierPageSectionSetting[],
  };
}

export async function getSupplierPageSectionVisibility(
  supabase: SupabaseClient<Database>,
  companyId: string,
  sectionKey: SupplierPageSectionKey,
) {
  const { data, error } = await supabase
    .from("supplier_page_section_settings")
    .select("visibility")
    .eq("company_id", companyId)
    .eq("section_key", sectionKey)
    .maybeSingle();

  if (error) {
    return { error, visibility: null };
  }

  return {
    error: null,
    visibility: data?.visibility ?? ("public" as const),
  };
}

export async function getSupplierPageViewerContext(
  supabase: SupabaseClient<Database>,
  companyId: string,
  user: User,
) {
  const [{ data: company }, { data: profile }, { data: memberships }] =
    await Promise.all([
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
      supabase
        .from("supplier_page_members")
        .select("role_id")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .eq("status", "active"),
    ]);

  if (!company) {
    return {
      access: { roleKey: null, status: "removed" as const },
      company: null,
      viewer: {
        isApprovedMember: false,
        isPageAdmin: false,
        isPlatformModerator: false,
      },
    };
  }

  const roleIds = (memberships ?? []).map((membership) => membership.role_id);
  const { data: roles } =
    roleIds.length > 0
      ? await supabase
          .from("supplier_page_roles")
          .select("role_key")
          .eq("company_id", companyId)
          .eq("status", "active")
          .in("id", roleIds)
      : { data: [] };

  const roleKey = roles?.[0]?.role_key ?? null;
  const isPlatformModerator = isPlatformAdmin(profile);
  const isPageAdmin =
    company.created_by === user.id ||
    isPlatformModerator ||
    roles?.some((role) => role.role_key === "page_admin") === true;
  const isApprovedMember = isPageAdmin || roleIds.length > 0;

  return {
    access: {
      roleKey: isPageAdmin ? "page_admin" : roleKey,
      status: isApprovedMember ? ("active" as const) : ("removed" as const),
    },
    company,
    viewer: {
      isApprovedMember,
      isPageAdmin,
      isPlatformModerator,
    },
  };
}

export async function listPendingSupplierPageSubmissions(
  supabase: SupabaseClient<Database>,
  companyId: string,
) {
  const { data, error } = await supabase
    .from("supplier_page_content_submissions")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return {
    error,
    submissions: (data ?? []) as SupplierPageContentSubmission[],
  };
}

export async function listSupplierPageReviewerIds(
  supabase: SupabaseClient<Database>,
  companyId: string,
) {
  const [{ data: company }, { data: pageAdminRoles }, { data: moderators }] =
    await Promise.all([
      supabase
        .from("companies")
        .select("created_by")
        .eq("id", companyId)
        .maybeSingle(),
      supabase
        .from("supplier_page_roles")
        .select("id")
        .eq("company_id", companyId)
        .eq("role_key", "page_admin")
        .eq("status", "active"),
      supabase
        .from("profiles")
        .select("id")
        .in("role", ["moderator", "admin", "super_admin"]),
    ]);

  const roleIds = (pageAdminRoles ?? []).map((role) => role.id);
  const { data: pageAdminMembers } =
    roleIds.length > 0
      ? await supabase
          .from("supplier_page_members")
          .select("user_id")
          .eq("company_id", companyId)
          .eq("status", "active")
          .in("role_id", roleIds)
      : { data: [] };

  return Array.from(
    new Set(
      [
        company?.created_by,
        ...(pageAdminMembers ?? []).map((member) => member.user_id),
        ...(moderators ?? []).map((moderator) => moderator.id),
      ].filter(Boolean) as string[],
    ),
  );
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

export async function ensureApprovedAgentRole(
  supabase: SupabaseClient<Database>,
  companyId: string,
) {
  const { data: existingRole, error: existingRoleError } = await supabase
    .from("supplier_page_roles")
    .select("*")
    .eq("company_id", companyId)
    .eq("role_key", "approved_agent")
    .maybeSingle();

  if (existingRoleError) {
    return { error: existingRoleError, role: null };
  }

  if (existingRole) {
    return { error: null, role: existingRole as SupplierPageRole };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("created_by")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError || !company) {
    return {
      error:
        companyError ??
        new Error("Supplier page not found while creating approved agent role."),
      role: null,
    };
  }

  const { data: role, error: roleError } = await supabase
    .from("supplier_page_roles")
    .insert({
      company_id: companyId,
      created_by: company.created_by,
      description:
        "Can view private supplier sections after approval but cannot manage page areas.",
      is_system: true,
      name: "Approved agent",
      role_key: "approved_agent",
      role_type: "baseline",
      status: "active",
    })
    .select("*")
    .single();

  if (roleError) {
    return { error: roleError, role: null };
  }

  const { data: permissions, error: permissionsError } = await supabase
    .from("supplier_page_permissions")
    .select("key")
    .eq("status", "active");

  if (permissionsError) {
    return { error: permissionsError, role: null };
  }

  const { error: permissionInsertError } = await supabase
    .from("supplier_page_role_permissions")
    .upsert(
      (permissions ?? []).map((permission) => ({
        is_allowed: false,
        permission_key: permission.key,
        role_id: role.id,
        updated_by: company.created_by,
      })),
      { onConflict: "role_id,permission_key" },
    );

  if (permissionInsertError) {
    return { error: permissionInsertError, role: null };
  }

  return { error: null, role: role as SupplierPageRole };
}

export async function getSupplierPageAccessRequestForUser(
  supabase: SupabaseClient<Database>,
  companyId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("supplier_page_access_requests")
    .select("*")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    error,
    request: data ? (data as SupplierPageAccessRequest) : null,
  };
}

export async function listPendingSupplierPageAccessRequests(
  supabase: SupabaseClient<Database>,
  companyId: string,
) {
  const { data, error } = await supabase
    .from("supplier_page_access_requests")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return {
    error,
    requests: (data ?? []) as SupplierPageAccessRequest[],
  };
}

export async function listApprovedSupplierPageAgents(
  supabase: SupabaseClient<Database>,
  companyId: string,
) {
  const roleResult = await ensureApprovedAgentRole(supabase, companyId);

  if (roleResult.error || !roleResult.role) {
    return {
      error: roleResult.error,
      members: [] as { id: string; user_id: string }[],
    };
  }

  const { data, error } = await supabase
    .from("supplier_page_members")
    .select("id, user_id")
    .eq("company_id", companyId)
    .eq("role_id", roleResult.role.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return {
    error,
    members: (data ?? []) as { id: string; user_id: string }[],
  };
}

export async function listSupplierAccessProfiles(
  supabase: SupabaseClient<Database>,
  userIds: string[],
) {
  if (userIds.length === 0) {
    return [] as Pick<Profile, "id" | "full_name" | "headline" | "role">[];
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, headline, role")
    .in("id", Array.from(new Set(userIds)));

  return (data ?? []) as Pick<
    Profile,
    "id" | "full_name" | "headline" | "role"
  >[];
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
