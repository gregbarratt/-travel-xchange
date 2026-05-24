import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertCanDeleteSupplierPageRole,
  assignableSupplierPagePermissionKeys,
  buildSupplierPagePermissionMap,
  canManageSupplierPageArea,
  canManageSupplierPageRoleSettings,
  createCustomSupplierPageRoleDraft,
  isBaselineSupplierPageRole,
  isSupplierPagePublic,
  isSupplierPageVisibleToViewer,
  supplierPageBaselineRoleKeys,
  supplierPagePermissions,
  toggleSupplierPagePermission,
  updateSupplierPageRoleDraft,
  userCanAccessOnlyPermittedSupplierSections,
  type SupplierPageMemberAccess,
} from "../src/lib/suppliers/access-control.ts";

const pageAdminAccess: SupplierPageMemberAccess = {
  roleKey: "page_admin",
  status: "active",
};

describe("supplier page access control", () => {
  it("supports supplier pages being public or private", () => {
    assert.equal(isSupplierPagePublic("public"), true);
    assert.equal(isSupplierPagePublic("private"), false);
    assert.equal(isSupplierPageVisibleToViewer("public"), true);
    assert.equal(isSupplierPageVisibleToViewer("private"), false);
    assert.equal(
      isSupplierPageVisibleToViewer("private", { isApprovedMember: true }),
      true,
    );
  });

  it("defines the baseline supplier page roles", () => {
    assert.deepEqual(supplierPageBaselineRoleKeys, [
      "page_admin",
      "bdm",
      "marketer",
    ]);
    assert.equal(isBaselineSupplierPageRole("page_admin"), true);
    assert.equal(isBaselineSupplierPageRole("bdm"), true);
    assert.equal(isBaselineSupplierPageRole("marketer"), true);
    assert.equal(isBaselineSupplierPageRole("viewer"), false);
  });

  it("gives page admins full control over every supplier page area", () => {
    for (const permission of supplierPagePermissions) {
      assert.equal(
        canManageSupplierPageArea(pageAdminAccess, permission.key),
        true,
      );
    }
  });

  it("allows page admins to toggle BDM and marketer permissions", () => {
    const bdmAccess: SupplierPageMemberAccess = {
      permissions: {},
      roleKey: "bdm",
      status: "active",
    };

    assert.equal(canManageSupplierPageArea(bdmAccess, "manage_news"), false);

    const bdmPermissions = toggleSupplierPagePermission(
      pageAdminAccess,
      bdmAccess.permissions ?? {},
      "manage_news",
      true,
    );

    assert.equal(
      canManageSupplierPageArea(
        { ...bdmAccess, permissions: bdmPermissions },
        "manage_news",
      ),
      true,
    );

    const marketerPermissions = toggleSupplierPagePermission(
      pageAdminAccess,
      {},
      "manage_events",
      true,
    );

    assert.equal(
      canManageSupplierPageArea(
        {
          permissions: marketerPermissions,
          roleKey: "marketer",
          status: "active",
        },
        "manage_events",
      ),
      true,
    );
  });

  it("blocks users without permission from restricted areas", () => {
    const bdmAccess: SupplierPageMemberAccess = {
      permissions: {},
      roleKey: "bdm",
      status: "active",
    };

    assert.equal(canManageSupplierPageArea(bdmAccess, "manage_events"), false);

    assert.throws(
      () =>
        toggleSupplierPagePermission(
          bdmAccess,
          {},
          "manage_events",
          true,
        ),
      /Only the supplier page admin/,
    );
  });

  it("allows page admins to create custom roles", () => {
    const role = createCustomSupplierPageRoleDraft(pageAdminAccess, {
      description: "Handles luxury supplier launches.",
      name: "Luxury launch manager",
      permissions: { manage_news: true, manage_media: true },
    });

    assert.equal(role.roleType, "custom");
    assert.equal(role.roleKey, "custom_luxury_launch_manager");
    assert.equal(role.isSystem, false);
    assert.equal(role.permissions?.manage_news, true);
    assert.equal(role.permissions?.manage_media, true);
    assert.equal(role.permissions?.manage_roles, false);
  });

  it("allows page admins to update permissions for custom roles", () => {
    const role = createCustomSupplierPageRoleDraft(pageAdminAccess, {
      name: "Events coordinator",
      permissions: { manage_events: false },
    });

    const updatedRole = updateSupplierPageRoleDraft(pageAdminAccess, role, {
      permissions: { manage_events: true, manage_jobs: true },
    });

    assert.equal(updatedRole.permissions?.manage_events, true);
    assert.equal(updatedRole.permissions?.manage_jobs, true);
    assert.equal(updatedRole.permissions?.manage_news, false);
  });

  it("makes every supplier page section assignable to roles", () => {
    for (const permissionKey of assignableSupplierPagePermissionKeys) {
      const permissionMap = buildSupplierPagePermissionMap(pageAdminAccess, {
        [permissionKey]: true,
      });

      assert.equal(permissionMap[permissionKey], true);
    }
  });

  it("blocks non-admin users from creating, editing, deleting, or assigning roles", () => {
    const marketerAccess: SupplierPageMemberAccess = {
      permissions: { manage_news: true, manage_roles: true },
      roleKey: "marketer",
      status: "active",
    };

    assert.equal(canManageSupplierPageRoleSettings(marketerAccess), false);

    assert.throws(
      () =>
        createCustomSupplierPageRoleDraft(marketerAccess, {
          name: "Trade sales editor",
        }),
      /Only the supplier page admin/,
    );

    assert.throws(
      () =>
        updateSupplierPageRoleDraft(
          marketerAccess,
          {
            name: "Trade sales editor",
            roleKey: "custom_trade_sales_editor",
            roleType: "custom",
          },
          { permissions: { manage_news: true } },
        ),
      /Only the supplier page admin/,
    );

    assert.throws(
      () =>
        assertCanDeleteSupplierPageRole(marketerAccess, {
          isSystem: false,
          name: "Trade sales editor",
          roleKey: "custom_trade_sales_editor",
          roleType: "custom",
        }),
      /Only the supplier page admin/,
    );

    assert.throws(
      () =>
        buildSupplierPagePermissionMap(marketerAccess, {
          manage_events: true,
        }),
      /Only the supplier page admin/,
    );
  });

  it("only gives users access to sections they have permission for", () => {
    const customAccess: SupplierPageMemberAccess = {
      permissions: {
        manage_events: true,
        manage_news: true,
      },
      roleKey: "custom_trade_marketer",
      status: "active",
    };

    assert.deepEqual(
      userCanAccessOnlyPermittedSupplierSections(customAccess),
      ["manage_news", "manage_events"],
    );
    assert.equal(canManageSupplierPageArea(customAccess, "manage_jobs"), false);
    assert.equal(canManageSupplierPageArea(customAccess, "manage_profile"), false);
  });
});
