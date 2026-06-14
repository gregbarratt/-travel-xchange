import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canViewInternalPricing,
  getPlatformAccessStatus,
  isPlatformAdminRole,
  isProfileApprovedForPlatform,
} from "../src/lib/auth/platform-access.ts";
import type { PlatformAccessProfile } from "../src/lib/auth/platform-access.ts";
import type { TravelXchangeRole, VerificationTier } from "../src/types/database.ts";

function profile(
  role: TravelXchangeRole,
  verification_tier: VerificationTier,
): PlatformAccessProfile {
  return { role, verification_tier };
}

describe("platform approval access", () => {
  it("blocks users without a profile", () => {
    assert.equal(isProfileApprovedForPlatform(null), false);
    assert.equal(getPlatformAccessStatus(null), "pending");
  });

  it("treats basic registered users as pending until approved", () => {
    assert.equal(
      isProfileApprovedForPlatform(profile("registered_user", "unverified")),
      false,
    );
    assert.equal(
      isProfileApprovedForPlatform(profile("registered_user", "email_verified")),
      false,
    );
    assert.equal(
      getPlatformAccessStatus(profile("registered_user", "email_verified")),
      "pending",
    );
  });

  it("allows verified trade members and commercial roles into the platform", () => {
    const approvedRoles: TravelXchangeRole[] = [
      "verified_travel_professional",
      "supplier",
      "recruiter",
      "trainer",
      "advertiser",
    ];

    for (const role of approvedRoles) {
      assert.equal(
        isProfileApprovedForPlatform(profile(role, "email_verified")),
        true,
      );
    }
  });

  it("allows a registered user only after a proper verification tier is set", () => {
    assert.equal(
      isProfileApprovedForPlatform(
        profile("registered_user", "travel_professional_verified"),
      ),
      true,
    );
  });

  it("always allows platform admin roles", () => {
    for (const role of ["moderator", "admin", "super_admin"] as const) {
      assert.equal(isPlatformAdminRole(role), true);
      assert.equal(
        isProfileApprovedForPlatform(profile(role, "unverified")),
        true,
      );
    }
  });

  it("keeps pricing as an internal admin-only preview", () => {
    assert.equal(
      canViewInternalPricing(
        profile("verified_travel_professional", "travel_professional_verified"),
      ),
      false,
    );
    assert.equal(canViewInternalPricing(profile("supplier", "supplier_verified")), false);
    assert.equal(canViewInternalPricing(profile("admin", "admin_verified")), true);
    assert.equal(
      canViewInternalPricing(profile("super_admin", "admin_verified")),
      true,
    );
  });
});
