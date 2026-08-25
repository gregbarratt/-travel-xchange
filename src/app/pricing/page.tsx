import type { Metadata } from "next";

import { PricingPlans } from "@/components/billing/pricing-plans";
import { PublicPageShell } from "@/components/layout/public-page-shell";

export const metadata: Metadata = {
  title: "Internal pricing preview",
  description:
    "Internal Travel Xchange pricing preview for approved admins while Stripe is unfinished.",
  robots: {
    follow: false,
    index: false,
  },
};

export default function PricingPage() {
  return (
    <PublicPageShell>
      <main className="tx-dashboard-bg px-4 py-14 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-7xl">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-extrabold uppercase text-[var(--tx-accent)]">
              Internal pricing preview
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-normal text-[var(--tx-text)]">
              Draft membership and trade partner plans
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--tx-text-muted)]">
              This preview is for Travel Xchange admins only while Stripe
              checkout and plan setup are unfinished. It is not public pricing.
            </p>
          </div>

          <PricingPlans />
        </section>
      </main>
    </PublicPageShell>
  );
}
