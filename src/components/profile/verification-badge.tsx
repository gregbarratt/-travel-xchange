import { BadgeCheck, ShieldCheck } from "lucide-react";

import type { VerificationTier } from "@/types/database";

type VerificationBadgeProps = {
  tier: VerificationTier;
};

const verificationLabels: Record<VerificationTier, string> = {
  admin_verified: "Admin verified",
  email_verified: "Email verified",
  recruiter_verified: "Recruiter verified",
  supplier_verified: "Supplier verified",
  trainer_verified: "Trainer verified",
  travel_professional_verified: "Travel professional verified",
  unverified: "Verification pending",
};

export function VerificationBadge({ tier }: VerificationBadgeProps) {
  const verified = tier !== "unverified";
  const Icon = verified ? BadgeCheck : ShieldCheck;

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
        verified
          ? "bg-[#ecfeff] text-[#0e7490]"
          : "bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {verificationLabels[tier]}
    </span>
  );
}
