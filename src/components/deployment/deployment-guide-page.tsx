"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Cloud, Database, Globe2 } from "lucide-react";

import { AdminStatusBadge } from "@/components/admin/admin-ui";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import {
  deploymentReferenceLinks,
  deploymentSections,
} from "@/config/deployment";

const statusTone = {
  future: "blue",
  manual: "amber",
  ready: "green",
} as const;

export function DeploymentGuidePage() {
  return (
    <AdminPageShell
      activeHref="/admin/deployment"
      description="Use this deployment guide when moving Travel Xchange from localhost to Vercel, Supabase production settings, Stripe webhooks, and a custom domain."
      title="Deployment guide"
    >
      {() => <DeploymentGuideContent />}
    </AdminPageShell>
  );
}

function DeploymentGuideContent() {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="tx-card p-5">
          <Cloud className="size-6 text-[#063b86]" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-extrabold text-[#061b4f]">
            Vercel first
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
            Import the GitHub repo, add environment variables, and deploy a
            preview before using a custom domain.
          </p>
        </div>
        <div className="tx-card p-5">
          <Database className="size-6 text-[#063b86]" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-extrabold text-[#061b4f]">
            Supabase matched
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
            Production auth redirects and database policies must point at the
            live website, not localhost.
          </p>
        </div>
        <div className="tx-card p-5">
          <Globe2 className="size-6 text-[#063b86]" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-extrabold text-[#061b4f]">
            Domain last
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
            Add the custom domain after the Vercel URL works, then update
            Supabase, Stripe, and NEXT_PUBLIC_APP_URL.
          </p>
        </div>
      </section>

      <section className="tx-card p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-[#061b4f]">
              Deployment order
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d6b9e]">
              Follow these sections in order. Each item is written as a manual
              action so it is clear what needs clicking or checking in Vercel,
              Supabase, Stripe, and the live site.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {deploymentSections.map((section) => (
          <div className="tx-card p-5" key={section.title}>
            <h2 className="text-lg font-extrabold text-[#061b4f]">
              {section.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
              {section.description}
            </p>
            <div className="mt-4 space-y-3">
              {section.steps.map((step) => (
                <div
                  className="rounded-lg border border-[#d9e4f5] bg-white/75 p-4"
                  key={step.label}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[#061b4f]">{step.label}</p>
                      <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
                        {step.detail}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <AdminStatusBadge tone={statusTone[step.status]}>
                        {step.status}
                      </AdminStatusBadge>
                      <AdminStatusBadge tone="slate">{step.owner}</AdminStatusBadge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="tx-card p-5">
        <h2 className="text-lg font-extrabold text-[#061b4f]">
          Official references
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deploymentReferenceLinks.map((link) => (
            <Link
              className="inline-flex items-center justify-between gap-3 rounded-lg border border-[#d9e4f5] bg-white/75 px-4 py-3 text-sm font-bold text-[#063b86] hover:border-[#b8cae8] hover:bg-[#eef5ff]"
              href={link.href}
              key={link.href}
              target="_blank"
            >
              {link.label}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
