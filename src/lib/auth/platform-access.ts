import type { Profile, TravelXchangeRole, VerificationTier } from "@/types/database";

export type PlatformAccessProfile = Pick<
  Profile,
  "role" | "verification_tier"
> | null;

const platformAdminRoles = new Set<TravelXchangeRole>([
  "moderator",
  "admin",
  "super_admin",
]);

const approvedPlatformRoles = new Set<TravelXchangeRole>([
  "verified_travel_professional",
  "supplier",
  "recruiter",
  "trainer",
  "advertiser",
  "moderator",
  "admin",
  "super_admin",
]);

const approvedVerificationTiers = new Set<VerificationTier>([
  "travel_professional_verified",
  "supplier_verified",
  "recruiter_verified",
  "trainer_verified",
  "admin_verified",
]);

export function isPlatformAdminRole(role: TravelXchangeRole | null | undefined) {
  return Boolean(role && platformAdminRoles.has(role));
}

export function canViewInternalPricing(profile: PlatformAccessProfile) {
  return isPlatformAdminRole(profile?.role);
}

export function isProfileApprovedForPlatform(profile: PlatformAccessProfile) {
  if (!profile) {
    return false;
  }

  if (approvedPlatformRoles.has(profile.role)) {
    return true;
  }

  return approvedVerificationTiers.has(profile.verification_tier);
}

export function getPlatformAccessStatus(profile: PlatformAccessProfile) {
  return isProfileApprovedForPlatform(profile) ? "approved" : "pending";
}
