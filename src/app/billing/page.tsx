import type { Metadata } from "next";

import { BillingDashboard } from "@/components/billing/billing-dashboard";
import { PublicPageShell } from "@/components/layout/public-page-shell";

export const metadata: Metadata = {
  title: "Billing",
  description: "Travel Xchange billing dashboard and subscription status.",
};

export default function BillingPage() {
  return (
    <PublicPageShell>
      <main className="tx-dashboard-bg px-4 py-14 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-6xl">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-extrabold uppercase text-[var(--tx-accent)]">
              Billing
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-normal text-[var(--tx-text)]">
              Manage your subscription
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--tx-text-muted)]">
              Check your current plan, Stripe customer connection, and invoice
              placeholders.
            </p>
          </div>

          <BillingDashboard />
        </section>
      </main>
    </PublicPageShell>
  );
}
