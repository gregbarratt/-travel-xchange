import type { Metadata } from "next";

import { AuthDisabledCard } from "@/components/auth/auth-disabled-card";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import { publicAuthEnabled } from "@/config/launch";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Choose your Travel Xchange role and create your starter profile.",
};

export default function OnboardingPage() {
  if (!publicAuthEnabled) {
    return <AuthDisabledCard mode="onboarding" />;
  }

  return (
    <PublicPageShell>
      <main className="bg-[#f8fafc] px-4 py-12 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-5xl">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-semibold uppercase text-[#0f766e]">
              Onboarding
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal text-slate-950">
              Set up your Travel Xchange profile
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Choose the role that best matches you today. Verification, badges,
              and richer profile sections will be added in later phases.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <OnboardingForm />
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
