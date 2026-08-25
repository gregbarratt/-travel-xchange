import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getWorkspacesForProfile,
  isSubItemActive,
  resolveActiveAreaId,
  resolveWorkspaceForPath,
  subItemHref,
  type NavArea,
} from "../src/components/tx/workspace-nav.ts";
import type { Profile, TravelXchangeRole } from "../src/types/database.ts";

function profile(role: TravelXchangeRole) {
  return { role } as Pick<Profile, "role">;
}

describe("workspace grants", () => {
  it("gives every approved member the professional workspace", () => {
    const workspaces = getWorkspacesForProfile(profile("verified_travel_professional"));

    assert.deepEqual(
      workspaces.map((workspace) => workspace.id),
      ["professional"],
    );
  });

  it("adds the supplier workspace only for a supplier", () => {
    assert.deepEqual(
      getWorkspacesForProfile(profile("supplier")).map((w) => w.id),
      ["professional", "supplier"],
    );
    assert.ok(
      !getWorkspacesForProfile(profile("recruiter"))
        .map((w) => w.id)
        .includes("supplier"),
    );
  });

  it("adds the admin workspace only for platform roles", () => {
    for (const role of ["moderator", "admin", "super_admin"] as TravelXchangeRole[]) {
      assert.ok(
        getWorkspacesForProfile(profile(role))
          .map((w) => w.id)
          .includes("admin"),
        `${role} should reach the admin workspace`,
      );
    }

    for (const role of [
      "registered_user",
      "verified_travel_professional",
      "supplier",
      "recruiter",
      "trainer",
      "advertiser",
    ] as TravelXchangeRole[]) {
      assert.ok(
        !getWorkspacesForProfile(profile(role))
          .map((w) => w.id)
          .includes("admin"),
        `${role} must not reach the admin workspace`,
      );
    }
  });

  it("falls back to the professional workspace with no profile", () => {
    assert.deepEqual(
      getWorkspacesForProfile(null).map((w) => w.id),
      ["professional"],
    );
  });

  it("gives every workspace exactly one primary action", () => {
    for (const workspace of getWorkspacesForProfile(profile("super_admin"))) {
      assert.ok(workspace.primaryAction.label.length > 0, workspace.id);
      assert.ok(workspace.primaryAction.href.length > 0, workspace.id);
    }
  });

  it("opens the admin workspace on an admin URL, and only when granted", () => {
    const adminUser = getWorkspacesForProfile(profile("admin"));
    assert.equal(resolveWorkspaceForPath(adminUser, "/admin/users").id, "admin");
    assert.equal(resolveWorkspaceForPath(adminUser, "/dashboard").id, "professional");

    // A member without the grant never lands in the admin workspace, whatever
    // URL they type.
    const member = getWorkspacesForProfile(profile("verified_travel_professional"));
    assert.equal(resolveWorkspaceForPath(member, "/admin/users").id, "professional");
  });
});

describe("active area follows the page", () => {
  const areas: NavArea[] = [
    { href: "/dashboard", icon: "home", id: "home", label: "Home" },
    {
      href: "/news/latest",
      icon: "news",
      id: "news",
      items: [
        { description: "", href: "/news/latest", label: "Latest news" },
        { description: "", href: "/news", label: "Articles" },
      ],
      label: "Trade news",
    },
    {
      href: "/suppliers",
      icon: "suppliers",
      id: "suppliers",
      items: [
        { description: "", href: "/suppliers", label: "Directory" },
        { description: "", href: "/workspace/pages", label: "Managed pages" },
      ],
      label: "Suppliers",
    },
  ];

  it("resolves the area from the current path", () => {
    assert.equal(resolveActiveAreaId(areas, "/dashboard"), "home");
    assert.equal(resolveActiveAreaId(areas, "/news"), "news");
    assert.equal(resolveActiveAreaId(areas, "/suppliers"), "suppliers");
  });

  it("keeps a detail page inside its area", () => {
    assert.equal(resolveActiveAreaId(areas, "/news/some-article"), "news");
    assert.equal(resolveActiveAreaId(areas, "/suppliers/abc-travel"), "suppliers");
  });

  it("lets the most specific sub-item win", () => {
    // /workspace/pages belongs to Suppliers, not to whichever area is first.
    assert.equal(resolveActiveAreaId(areas, "/workspace/pages"), "suppliers");
    assert.equal(resolveActiveAreaId(areas, "/news/latest"), "news");
  });

  it("does not let one route claim a longer unrelated route", () => {
    assert.equal(resolveActiveAreaId(areas, "/newsletters"), null);
    assert.equal(resolveActiveAreaId(areas, "/messages"), null);
  });
});

describe("sub-items that name a tab", () => {
  const plain = { description: "", href: "/suppliers", label: "Directory" };
  const tabbed = {
    description: "",
    href: "/suppliers",
    label: "Managed pages",
    tab: "managed",
  };

  it("carries the tab in the URL", () => {
    assert.equal(subItemHref(plain), "/suppliers");
    assert.equal(subItemHref(tabbed), "/suppliers?tab=managed");
  });

  it("appends to an href that already has a query", () => {
    assert.equal(
      subItemHref({ description: "", href: "/jobs?status=open", label: "x", tab: "saved" }),
      "/jobs?status=open&tab=saved",
    );
  });

  it("only lights up the tab that is actually open", () => {
    assert.equal(isSubItemActive(tabbed, "/suppliers", "managed"), true);
    assert.equal(isSubItemActive(tabbed, "/suppliers", "other"), false);
    assert.equal(isSubItemActive(tabbed, "/suppliers", null), false);

    // The untabbed item is the bare page, so it steps aside once a tab is open.
    assert.equal(isSubItemActive(plain, "/suppliers", null), true);
    assert.equal(isSubItemActive(plain, "/suppliers", "managed"), false);
  });

  it("never matches a different page", () => {
    assert.equal(isSubItemActive(tabbed, "/jobs", "managed"), false);
  });
});
