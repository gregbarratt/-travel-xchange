import type { TravelXchangeRole, VerificationTier } from "@/types/database";

export const adminNavigation = [
  { label: "Dashboard", href: "/admin" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Production", href: "/admin/production-readiness" },
  { label: "Users", href: "/admin/users" },
  { label: "Posts", href: "/admin/posts" },
  { label: "Reports", href: "/admin/reports" },
  { label: "Verification", href: "/admin/verification" },
  { label: "Adverts", href: "/admin/adverts" },
  { label: "Jobs", href: "/admin/jobs" },
  { label: "Articles", href: "/admin/articles" },
];

export const adminRoles: TravelXchangeRole[] = [
  "moderator",
  "admin",
  "super_admin",
];

export const systemRoleOptions: Array<{
  label: string;
  value: TravelXchangeRole;
}> = [
  { label: "Moderator", value: "moderator" },
  { label: "Admin", value: "admin" },
  { label: "Super Admin", value: "super_admin" },
];

export const verificationTierOptions: Array<{
  label: string;
  value: VerificationTier;
}> = [
  { label: "Unverified", value: "unverified" },
  { label: "Email verified", value: "email_verified" },
  {
    label: "Travel professional verified",
    value: "travel_professional_verified",
  },
  { label: "Supplier verified", value: "supplier_verified" },
  { label: "Recruiter verified", value: "recruiter_verified" },
  { label: "Trainer verified", value: "trainer_verified" },
  { label: "Admin verified", value: "admin_verified" },
];

export function isAdminRole(role: TravelXchangeRole | null | undefined) {
  return Boolean(role && adminRoles.includes(role));
}

export function getVerificationTierLabel(tier: VerificationTier) {
  return verificationTierOptions.find((option) => option.value === tier)?.label ?? tier;
}
