import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertCanDeleteSupplierPageRole,
  assignableSupplierPagePermissionKeys,
  buildSupplierPagePermissionMap,
  canManageSupplierPageArea,
  canManageSupplierPageRoleSettings,
  canEditSupplierPageSection,
  createCustomSupplierPageRoleDraft,
  createSupplierPageSubmissionDraft,
  isBaselineSupplierPageRole,
  isSupplierPageSectionVisibleToViewer,
  isSupplierPagePublic,
  isSupplierPageSubmissionPubliclyVisible,
  isSupplierPageVisibleToViewer,
  reviewSupplierPageSubmission,
  setSupplierPageSectionVisibility,
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

  it("allows page admins to set each supplier page section public or private", () => {
    const sectionSetting = setSupplierPageSectionVisibility(
      pageAdminAccess,
      "news",
      "private",
    );

    assert.deepEqual(sectionSetting, {
      sectionKey: "news",
      visibility: "private",
    });

    assert.throws(
      () =>
        setSupplierPageSectionVisibility(
          { roleKey: "bdm", status: "active" },
          "events",
          "private",
        ),
      /Only the supplier page admin/,
    );
  });

  it("shows public sections to agents and keeps private sections for approved users", () => {
    assert.equal(isSupplierPageSectionVisibleToViewer("public"), true);
    assert.equal(isSupplierPageSectionVisibleToViewer("private"), false);
    assert.equal(
      isSupplierPageSectionVisibleToViewer("private", {
        isApprovedMember: true,
      }),
      true,
    );
    assert.equal(
      isSupplierPageSectionVisibleToViewer("private", {
        isPageAdmin: true,
      }),
      true,
    );
  });

  it("creates agent supplier content as pending and keeps it hidden publicly", () => {
    const submission = createSupplierPageSubmissionDraft({
      content: "This is a helpful supplier update for agents to review.",
      createdBy: "agent-user-id",
      sectionKey: "news",
      sectionVisibility: "public",
      title: "Cruise launch update",
      viewer: { isApprovedMember: false },
    });

    assert.equal(submission.status, "pending");
    assert.equal(submission.reviewerNotificationRequired, true);
    assert.equal(isSupplierPageSubmissionPubliclyVisible(submission.status), false);
  });

  it("blocks agent submissions to private sections unless joined or approved", () => {
    assert.throws(
      () =>
        createSupplierPageSubmissionDraft({
          content: "This private section content should not go through.",
          createdBy: "agent-user-id",
          sectionKey: "events",
          sectionVisibility: "private",
          title: "Private event idea",
          viewer: { isApprovedMember: false },
        }),
      /private/,
    );

    const submission = createSupplierPageSubmissionDraft({
      content: "This private section content is from an approved member.",
      createdBy: "member-user-id",
      sectionKey: "events",
      sectionVisibility: "private",
      title: "Approved event idea",
      viewer: { isApprovedMember: true },
    });

    assert.equal(submission.status, "pending");
  });

  it("allows admins and moderators to approve or reject pending supplier content", () => {
    const approved = reviewSupplierPageSubmission(pageAdminAccess, "approved");
    const rejected = reviewSupplierPageSubmission(pageAdminAccess, "rejected");
    const moderatorApproved = reviewSupplierPageSubmission(
      { roleKey: "moderator", status: "active" },
      "approved",
      { isPlatformModerator: true },
    );

    assert.equal(approved.status, "approved");
    assert.equal(rejected.status, "rejected");
    assert.equal(moderatorApproved.status, "approved");
    assert.equal(isSupplierPageSubmissionPubliclyVisible(approved.status), true);
    assert.equal(isSupplierPageSubmissionPubliclyVisible(rejected.status), false);

    assert.throws(
      () =>
        reviewSupplierPageSubmission(
          { roleKey: "marketer", status: "active" },
          "approved",
        ),
      /Only the supplier page admin/,
    );
  });

  it("does not let agents edit sections without explicit permission", () => {
    const agentAccess: SupplierPageMemberAccess = {
      permissions: {},
      roleKey: "custom_agent_contributor",
      status: "active",
    };

    const permittedAccess: SupplierPageMemberAccess = {
      permissions: { manage_news: true },
      roleKey: "custom_news_contributor",
      status: "active",
    };

    assert.equal(canEditSupplierPageSection(agentAccess, "news"), false);
    assert.equal(canEditSupplierPageSection(permittedAccess, "news"), true);
    assert.equal(canEditSupplierPageSection(permittedAccess, "events"), false);
  });
});
