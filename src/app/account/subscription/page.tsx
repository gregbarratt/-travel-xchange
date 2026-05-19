import type { Metadata } from "next";

import { BillingDashboard } from "@/components/billing/billing-dashboard";
import { PublicPageShell } from "@/components/layout/public-page-shell";

export const metadata: Metadata = {
  title: "Subscription",
  description: "Travel Xchange account subscription status.",
};

export default function AccountSubscriptionPage() {
  return (
    <PublicPageShell>
      <main className="tx-dashboard-bg px-4 py-14 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-6xl">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-extrabold uppercase text-[#063b86]">
              Account subscription
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-normal text-[#061b4f]">
              Your Travel Xchange plan
            </h1>
            <p className="mt-4 text-base leading-7 text-[#4d6b9e]">
              Stripe checkout returns here after payment. Webhooks then update
              the saved subscription status.
            </p>
          </div>

          <BillingDashboard />
        </section>
      </main>
    </PublicPageShell>
  );
}
