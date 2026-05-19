import { Crown } from "lucide-react";

import type { BillingSubscription } from "@/types/database";

export function SubscriptionBadge({
  subscription,
}: {
  subscription: BillingSubscription | null;
}) {
  if (!subscription || subscription.status !== "active") {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#ffe7ed] px-3 py-1 text-xs font-extrabold text-[#f52968]">
      <Crown className="size-3.5" aria-hidden="true" />
      Premium member
    </span>
  );
}
