export const travelXchangeRoles = [
  "registered_user",
  "verified_travel_professional",
  "supplier",
  "recruiter",
  "trainer",
  "advertiser",
  "moderator",
  "admin",
  "super_admin",
] as const;

export type SharedTravelXchangeRole = (typeof travelXchangeRoles)[number];

export const verificationTiers = [
  "unverified",
  "email_verified",
  "travel_professional_verified",
  "supplier_verified",
  "recruiter_verified",
  "trainer_verified",
  "admin_verified",
] as const;

export type SharedVerificationTier = (typeof verificationTiers)[number];

export const roleLabels: Record<SharedTravelXchangeRole, string> = {
  registered_user: "Registered User",
  verified_travel_professional: "Verified Travel Professional",
  supplier: "Supplier",
  recruiter: "Recruiter",
  trainer: "Trainer",
  advertiser: "Advertiser",
  moderator: "Moderator",
  admin: "Admin",
  super_admin: "Super Admin",
};

export const verificationLabels: Record<SharedVerificationTier, string> = {
  unverified: "Unverified",
  email_verified: "Email verified",
  travel_professional_verified: "Travel professional verified",
  supplier_verified: "Supplier verified",
  recruiter_verified: "Recruiter verified",
  trainer_verified: "Trainer verified",
  admin_verified: "Admin verified",
};

export type SharedAuthState =
  | "signed_out"
  | "signed_in_needs_onboarding"
  | "signed_in_ready"
  | "suspended";

export type SharedContentVisibility = "public" | "members" | "private";

export type SharedRecordStatus =
  | "draft"
  | "published"
  | "active"
  | "hidden"
  | "archived"
  | "deleted";
