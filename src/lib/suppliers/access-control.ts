export const supplierPageVisibilityOptions = ["public", "private"] as const;

export type SupplierPageVisibility =
  (typeof supplierPageVisibilityOptions)[number];

export const supplierPageBaselineRoles = [
  {
    description: "Full control over the supplier page, team roles, and settings.",
    hasFullControl: true,
    key: "page_admin",
    label: "Page admin",
  },
  {
    description:
      "Business development user. Permissions are optional and controlled by the page admin.",
    hasFullControl: false,
    key: "bdm",
    label: "BDM",
  },
  {
    description:
      "Marketing user. Permissions are optional and controlled by the page admin.",
    hasFullControl: false,
    key: "marketer",
    label: "Marketer",
  },
] as const;

export type SupplierPageBaselineRoleKey =
  (typeof supplierPageBaselineRoles)[number]["key"];

export const supplierPageBaselineRoleKeys = supplierPageBaselineRoles.map(
  (role) => role.key,
);

export const supplierPagePermissions = [
  {
    description: "Edit supplier page profile, about text, and core company details.",
    key: "manage_profile",
    label: "Manage profile/about",
    section: "profile",
  },
  {
    description: "Create and manage supplier news, updates, and press releases.",
    key: "manage_news",
    label: "Manage news",
    section: "news",
  },
  {
    description: "Create and manage supplier job listings.",
    key: "manage_jobs",
    label: "Manage jobs",
    section: "jobs",
  },
  {
    description: "Create and manage supplier events, webinars, and roadshows.",
    key: "manage_events",
    label: "Manage events",
    section: "events",
  },
  {
    description: "Manage supplier media, images, gallery, and downloadable assets.",
    key: "manage_media",
    label: "Manage media/gallery",
    section: "media",
  },
  {
    description: "Manage supplier page roles and permission settings.",
    key: "manage_roles",
    label: "Manage roles and permissions",
    section: "settings",
  },
] as const;

export type SupplierPagePermissionKey =
  (typeof supplierPagePermissions)[number]["key"];

export type SupplierPagePermissionMap = Partial<
  Record<SupplierPagePermissionKey, boolean>
>;

export type SupplierPageMemberAccess = {
  permissions?: SupplierPagePermissionMap;
  roleKey: string | null;
  status?: "active" | "invited" | "removed";
};

export type SupplierPageViewer = {
  isApprovedMember?: boolean;
  isPageAdmin?: boolean;
};

function isActiveAccess(access: SupplierPageMemberAccess | null | undefined) {
  return Boolean(access && (access.status ?? "active") === "active");
}

export function isSupplierPageVisibility(
  value: string,
): value is SupplierPageVisibility {
  return supplierPageVisibilityOptions.includes(value as SupplierPageVisibility);
}

export function isSupplierPagePublic(
  page: SupplierPageVisibility | { page_visibility: SupplierPageVisibility },
) {
  const visibility = typeof page === "string" ? page : page.page_visibility;

  return visibility === "public";
}

export function isSupplierPageVisibleToViewer(
  pageVisibility: SupplierPageVisibility,
  viewer: SupplierPageViewer = {},
) {
  return (
    pageVisibility === "public" ||
    Boolean(viewer.isPageAdmin || viewer.isApprovedMember)
  );
}

export function isBaselineSupplierPageRole(
  roleKey: string,
): roleKey is SupplierPageBaselineRoleKey {
  return supplierPageBaselineRoleKeys.includes(
    roleKey as SupplierPageBaselineRoleKey,
  );
}

export function supplierPageRoleHasFullControl(roleKey: string | null) {
  return roleKey === "page_admin";
}

export function canManageSupplierPageArea(
  access: SupplierPageMemberAccess | null | undefined,
  permissionKey: SupplierPagePermissionKey,
) {
  if (!isActiveAccess(access)) {
    return false;
  }

  if (supplierPageRoleHasFullControl(access?.roleKey ?? null)) {
    return true;
  }

  return access?.permissions?.[permissionKey] === true;
}

export function assertCanManageSupplierPageArea(
  access: SupplierPageMemberAccess | null | undefined,
  permissionKey: SupplierPagePermissionKey,
) {
  if (!canManageSupplierPageArea(access, permissionKey)) {
    throw new Error("User does not have permission to manage this supplier area.");
  }
}

export function toggleSupplierPagePermission(
  actorAccess: SupplierPageMemberAccess | null | undefined,
  currentPermissions: SupplierPagePermissionMap,
  permissionKey: SupplierPagePermissionKey,
  isAllowed: boolean,
) {
  assertCanManageSupplierPageArea(actorAccess, "manage_roles");

  return {
    ...currentPermissions,
    [permissionKey]: isAllowed,
  };
}
