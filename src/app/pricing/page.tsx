import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Travel Xchange pricing placeholder for memberships, supplier plans, recruiter plans, and advertising.",
};

const plans = [
  "Free member",
  "Premium professional",
  "Supplier basic",
  "Supplier pro",
  "Recruiter plan",
  "Advertiser plan",
];

export default function PricingPage() {
  return (
    <PlaceholderPage
      eyebrow="Pricing"
      title="Membership and revenue plans will come later"
      description="This page is a Phase 1 placeholder. Stripe subscriptions, recruiter packages, supplier plans, and advertising products are planned for later phases."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            className="rounded-lg border border-slate-200 bg-[#f8fafc] p-4 text-sm font-medium text-slate-800"
            key={plan}
          >
            {plan}
          </div>
        ))}
      </div>
    </PlaceholderPage>
  );
}
