import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canManageSupplierPageArea,
  isBaselineSupplierPageRole,
  isSupplierPagePublic,
  isSupplierPageVisibleToViewer,
  supplierPageBaselineRoleKeys,
  supplierPagePermissions,
  toggleSupplierPagePermission,
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
      /does not have permission/,
    );
  });
});
