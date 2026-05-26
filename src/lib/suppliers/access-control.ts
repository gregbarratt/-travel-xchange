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
    description: "Manage supplier training modules and academy content.",
    key: "manage_training",
    label: "Manage training",
    section: "training",
  },
  {
    description: "Manage supplier adverts, spotlight cards, and sponsorship slots.",
    key: "manage_adverts",
    label: "Manage adverts",
    section: "adverts",
  },
  {
    description: "Manage supplier page team members and page assignments.",
    key: "manage_team",
    label: "Manage team",
    section: "team",
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
  isPlatformModerator?: boolean;
};

type SupplierPagePermissionSection =
  (typeof supplierPagePermissions)[number]["section"];

export type SupplierPageSectionKey = Exclude<
  SupplierPagePermissionSection,
  "settings"
>;

export type SupplierPageSectionVisibility = "public" | "private";

export type SupplierPageSectionSettingDraft = {
  sectionKey: SupplierPageSectionKey;
  visibility: SupplierPageSectionVisibility;
};

export type SupplierPageSubmissionStatus =
  | "pending"
  | "approved"
  | "rejected";

export type SupplierPageAccessRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type SupplierPageSubmissionDraft = {
  content: string;
  createdBy: string;
  reviewerNotificationRequired: boolean;
  sectionKey: SupplierPageSectionKey;
  status: SupplierPageSubmissionStatus;
  title: string;
};

export type SupplierPageAccessRequestDraft = {
  companyId: string;
  message: string | null;
  status: SupplierPageAccessRequestStatus;
  userId: string;
};

export type SupplierPageRoleRecord = {
  description?: string | null;
  id?: string;
  isSystem?: boolean;
  name: string;
  permissions?: SupplierPagePermissionMap;
  roleKey: string;
  roleType: "baseline" | "custom";
  status?: "active" | "archived";
};

export type SupplierPageCustomRoleInput = {
  description?: string | null;
  name: string;
  permissions?: SupplierPagePermissionMap;
};

export const assignableSupplierPagePermissions = supplierPagePermissions.filter(
  (permission) => permission.key !== "manage_roles",
);

export const assignableSupplierPagePermissionKeys =
  assignableSupplierPagePermissions.map((permission) => permission.key);

export const supplierPageSections = Array.from(
  new Map(
    assignableSupplierPagePermissions.map((permission) => [
      permission.section,
      {
        key: permission.section as SupplierPageSectionKey,
        label: permission.label.replace("Manage ", ""),
        permissionKey: permission.key,
      },
    ]),
  ).values(),
);

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
    Boolean(
      viewer.isPageAdmin ||
        viewer.isApprovedMember ||
        viewer.isPlatformModerator,
    )
  );
}

export function isSupplierPageSectionVisibleToViewer(
  sectionVisibility: SupplierPageSectionVisibility,
  viewer: SupplierPageViewer = {},
) {
  return (
    sectionVisibility === "public" ||
    Boolean(
      viewer.isApprovedMember ||
        viewer.isPageAdmin ||
        viewer.isPlatformModerator,
    )
  );
}

export function setSupplierPageSectionVisibility(
  actorAccess: SupplierPageMemberAccess | null | undefined,
  sectionKey: SupplierPageSectionKey,
  visibility: SupplierPageSectionVisibility,
): SupplierPageSectionSettingDraft {
  assertCanManageSupplierPageRoleSettings(actorAccess);

  return {
    sectionKey,
    visibility,
  };
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

export function canManageSupplierPageRoleSettings(
  access: SupplierPageMemberAccess | null | undefined,
) {
  return (
    isActiveAccess(access) &&
    supplierPageRoleHasFullControl(access?.roleKey ?? null)
  );
}

export function assertCanManageSupplierPageRoleSettings(
  access: SupplierPageMemberAccess | null | undefined,
) {
  if (!canManageSupplierPageRoleSettings(access)) {
    throw new Error(
      "Only the supplier page admin can manage roles and permissions.",
    );
  }
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
  assertCanManageSupplierPageRoleSettings(actorAccess);

  return {
    ...currentPermissions,
    [permissionKey]: permissionKey === "manage_roles" ? false : isAllowed,
  };
}

export function normalizeCustomSupplierRoleName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function createSupplierPageRoleKey(name: string) {
  const slug = normalizeCustomSupplierRoleName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return `custom_${slug || "role"}`;
}

export function buildSupplierPagePermissionMap(
  actorAccess: SupplierPageMemberAccess | null | undefined,
  permissions: SupplierPagePermissionMap = {},
) {
  assertCanManageSupplierPageRoleSettings(actorAccess);

  return supplierPagePermissions.reduce<SupplierPagePermissionMap>(
    (permissionMap, permission) => ({
      ...permissionMap,
      [permission.key]:
        permission.key !== "manage_roles" && permissions[permission.key] === true,
    }),
    {},
  );
}

export function createCustomSupplierPageRoleDraft(
  actorAccess: SupplierPageMemberAccess | null | undefined,
  input: SupplierPageCustomRoleInput,
  existingRoleKeys: string[] = [],
): SupplierPageRoleRecord {
  assertCanManageSupplierPageRoleSettings(actorAccess);

  const name = normalizeCustomSupplierRoleName(input.name);

  if (name.length < 2) {
    throw new Error("Role name must be at least 2 characters.");
  }

  const roleKey = createSupplierPageRoleKey(name);

  if (existingRoleKeys.includes(roleKey)) {
    throw new Error("A supplier page role with this name already exists.");
  }

  return {
    description: input.description?.trim() || null,
    isSystem: false,
    name,
    permissions: buildSupplierPagePermissionMap(
      actorAccess,
      input.permissions ?? {},
    ),
    roleKey,
    roleType: "custom",
    status: "active",
  };
}

export function updateSupplierPageRoleDraft(
  actorAccess: SupplierPageMemberAccess | null | undefined,
  role: SupplierPageRoleRecord,
  input: Partial<SupplierPageCustomRoleInput>,
): SupplierPageRoleRecord {
  assertCanManageSupplierPageRoleSettings(actorAccess);

  if (role.roleKey === "page_admin") {
    throw new Error("The page admin role cannot be edited.");
  }

  const nextName =
    role.roleType === "custom" && typeof input.name === "string"
      ? normalizeCustomSupplierRoleName(input.name)
      : role.name;

  if (role.roleType === "custom" && nextName.length < 2) {
    throw new Error("Role name must be at least 2 characters.");
  }

  return {
    ...role,
    description:
      role.roleType === "custom" && typeof input.description !== "undefined"
        ? input.description?.trim() || null
        : role.description ?? null,
    name: nextName,
    permissions: buildSupplierPagePermissionMap(
      actorAccess,
      input.permissions ?? role.permissions ?? {},
    ),
  };
}

export function assertCanDeleteSupplierPageRole(
  actorAccess: SupplierPageMemberAccess | null | undefined,
  role: SupplierPageRoleRecord,
) {
  assertCanManageSupplierPageRoleSettings(actorAccess);

  if (role.roleType !== "custom" || role.isSystem) {
    throw new Error("Only custom supplier page roles can be deleted.");
  }
}

export function userCanAccessOnlyPermittedSupplierSections(
  access: SupplierPageMemberAccess,
) {
  return assignableSupplierPagePermissionKeys.filter((permissionKey) =>
    canManageSupplierPageArea(access, permissionKey),
  );
}

export function canEditSupplierPageSection(
  access: SupplierPageMemberAccess | null | undefined,
  sectionKey: SupplierPageSectionKey,
) {
  const permission = supplierPagePermissions.find(
    (supplierPermission) => supplierPermission.section === sectionKey,
  );

  return permission ? canManageSupplierPageArea(access, permission.key) : false;
}

export function createSupplierPageSubmissionDraft(input: {
  actorAccess?: SupplierPageMemberAccess | null;
  content: string;
  createdBy: string;
  sectionKey: SupplierPageSectionKey;
  sectionVisibility: SupplierPageSectionVisibility;
  title: string;
  viewer?: SupplierPageViewer;
}): SupplierPageSubmissionDraft {
  if (
    !isSupplierPageSectionVisibleToViewer(
      input.sectionVisibility,
      input.viewer ?? {},
    )
  ) {
    throw new Error("This supplier page section is private.");
  }

  const title = input.title.trim();
  const content = input.content.trim();

  if (title.length < 2) {
    throw new Error("Add a title before submitting content.");
  }

  if (content.length < 10) {
    throw new Error("Add a little more detail before submitting content.");
  }

  const isPageAdmin = canManageSupplierPageRoleSettings(input.actorAccess);
  const status = isPageAdmin ? "approved" : "pending";

  return {
    content,
    createdBy: input.createdBy,
    reviewerNotificationRequired: status === "pending",
    sectionKey: input.sectionKey,
    status,
    title,
  };
}

export function isSupplierPageSubmissionPubliclyVisible(
  status: SupplierPageSubmissionStatus,
) {
  return status === "approved";
}

export function reviewSupplierPageSubmission(
  reviewerAccess: SupplierPageMemberAccess | null | undefined,
  decision: "approved" | "rejected",
  reviewer: SupplierPageViewer = {},
) {
  if (
    !canManageSupplierPageRoleSettings(reviewerAccess) &&
    !reviewer.isPlatformModerator
  ) {
    throw new Error(
      "Only the supplier page admin or a platform moderator can review supplier content.",
    );
  }

  return {
    reviewedAt: new Date().toISOString(),
    status: decision,
  };
}

export function canRequestSupplierPageAccess(
  viewer: SupplierPageViewer = {},
) {
  return !viewer.isApprovedMember && !viewer.isPageAdmin;
}

export function createSupplierPageAccessRequestDraft(input: {
  companyId: string;
  message?: string | null;
  userId: string;
  viewer?: SupplierPageViewer;
}): SupplierPageAccessRequestDraft {
  if (!canRequestSupplierPageAccess(input.viewer ?? {})) {
    throw new Error("You already have access to this supplier page.");
  }

  const message = input.message?.trim() || null;

  if (message && message.length > 500) {
    throw new Error("Keep the access request message under 500 characters.");
  }

  return {
    companyId: input.companyId,
    message,
    status: "pending",
    userId: input.userId,
  };
}

export function reviewSupplierPageAccessRequest(
  reviewerAccess: SupplierPageMemberAccess | null | undefined,
  decision: "approved" | "rejected",
  reviewer: SupplierPageViewer = {},
) {
  if (
    !canManageSupplierPageRoleSettings(reviewerAccess) &&
    !reviewer.isPlatformModerator
  ) {
    throw new Error(
      "Only the supplier page admin or a platform moderator can review access requests.",
    );
  }

  return {
    reviewedAt: new Date().toISOString(),
    status: decision,
  };
}
