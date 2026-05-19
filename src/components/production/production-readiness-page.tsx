"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Rocket,
  ShieldCheck,
} from "lucide-react";

import { AdminStatusBadge } from "@/components/admin/admin-ui";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { productionChecklistSections } from "@/config/production";
import type { ProductionReadinessSummary } from "@/lib/production/readiness";
import { cn } from "@/lib/utils";

type ProductionReadinessPageProps = {
  summary: ProductionReadinessSummary;
};

const levelLabels = {
  later: "Later",
  recommended: "Recommended",
  required: "Required",
};

export function ProductionReadinessPage({
  summary,
}: ProductionReadinessPageProps) {
  return (
    <AdminPageShell
      activeHref="/admin/production-readiness"
      description="Check launch-critical settings, security items, SEO files, payment readiness, and deployment tasks before Travel Xchange goes live."
      title="Production readiness"
    >
      {() => <ProductionReadinessContent summary={summary} />}
    </AdminPageShell>
  );
}

function ProductionReadinessContent({
  summary,
}: ProductionReadinessPageProps) {
  const requiredReady = summary.missingRequiredCount === 0;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="tx-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#4d6b9e]">
                Required environment
              </p>
              <p className="mt-2 text-3xl font-extrabold text-[#061b4f]">
                {summary.configuredRequiredCount}/{summary.requiredCount}
              </p>
            </div>
            <span
              className={cn(
                "flex size-11 items-center justify-center rounded-lg",
                requiredReady
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700",
              )}
            >
              {requiredReady ? (
                <CheckCircle2 className="size-5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="size-5" aria-hidden="true" />
              )}
            </span>
          </div>
        </div>

        <div className="tx-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#4d6b9e]">
                Recommended missing
              </p>
              <p className="mt-2 text-3xl font-extrabold text-[#061b4f]">
                {summary.missingRecommendedCount}
              </p>
            </div>
            <span className="flex size-11 items-center justify-center rounded-lg bg-[#eef5ff] text-[#063b86]">
              <CircleDashed className="size-5" aria-hidden="true" />
            </span>
          </div>
        </div>

        <div className="tx-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#4d6b9e]">
                Launch status
              </p>
              <p className="mt-2 text-xl font-extrabold text-[#061b4f]">
                {requiredReady ? "Ready for preview" : "Needs setup"}
              </p>
            </div>
            <span className="flex size-11 items-center justify-center rounded-lg bg-[#eef5ff] text-[#063b86]">
              <Rocket className="size-5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </section>

      <section className="tx-card p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-[#eef5ff] p-2 text-[#063b86]">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-[#061b4f]">
              Environment variable review
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d6b9e]">
              This checks whether each launch setting exists. It never displays
              secret values, so Stripe and Supabase keys stay private.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {summary.environmentItems.map((item) => (
            <div
              className="rounded-lg border border-[#d9e4f5] bg-white/70 p-4"
              key={item.key}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#061b4f]">{item.key}</p>
                  <p className="mt-1 text-sm leading-6 text-[#4d6b9e]">
                    {item.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminStatusBadge
                    tone={item.isConfigured ? "green" : "amber"}
                  >
                    {item.isConfigured ? "Set" : "Missing"}
                  </AdminStatusBadge>
                  <AdminStatusBadge
                    tone={item.level === "required" ? "red" : "blue"}
                  >
                    {levelLabels[item.level]}
                  </AdminStatusBadge>
                  <AdminStatusBadge tone="slate">{item.scope}</AdminStatusBadge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {productionChecklistSections.map((section) => (
          <div className="tx-card p-5" key={section.title}>
            <h2 className="text-lg font-extrabold text-[#061b4f]">
              {section.title}
            </h2>
            <div className="mt-4 space-y-3">
              {section.items.map((item) => (
                <div
                  className="rounded-lg border border-[#d9e4f5] bg-white/70 p-4"
                  key={item.label}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-[#061b4f]">{item.label}</p>
                    <AdminStatusBadge
                      tone={item.level === "required" ? "amber" : "blue"}
                    >
                      {levelLabels[item.level]}
                    </AdminStatusBadge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
