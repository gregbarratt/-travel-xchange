"use client";

import { Clock3, Mail, ShieldCheck } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { TravelXchangeLogo } from "@/components/brand/travel-xchange-logo";

export function AccessPendingPanel() {
  return (
    <main className="min-h-screen bg-[var(--tx-surface-hover)] px-4 py-10 text-[var(--tx-text)] sm:px-6 lg:px-8">
      <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="rounded-lg border border-[var(--tx-border)] bg-white p-6 shadow-sm sm:p-8">
          <TravelXchangeLogo
            markClassName="h-9 w-10"
            textClassName="[&>span:first-child]:text-xl [&>span:last-child]:text-[0.62rem]"
          />
          <p className="mt-8 inline-flex rounded-lg border border-[#fed7e2] bg-[#fff1f6] px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-[var(--tx-accent)]">
            Access not yet approved
          </p>
          <h1 className="mt-5 text-3xl font-semibold tracking-normal text-[var(--tx-text)]">
            Your account is pending approval
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--tx-text-muted)]">
            Your login worked, but your Travel Xchange platform access has not
            been approved yet. A Travel Xchange admin or the relevant company
            admin needs to approve your account before you can enter the member
            platform.
          </p>
          <div className="mt-6 rounded-lg border border-[var(--tx-border)] bg-[var(--tx-surface-hover)] p-4 text-sm leading-6 text-[var(--tx-text-muted)]">
            Until approval is complete, dashboard, supplier pages, jobs,
            messages, notifications, workspace, billing, pricing, and admin
            areas stay locked.
          </div>
          <div className="mt-6">
            <LogoutButton />
          </div>
        </div>

        <aside className="overflow-hidden rounded-lg border border-[var(--tx-border)] bg-white shadow-sm">
          <div className="relative isolate bg-[var(--tx-text)] px-6 py-8 text-white sm:px-8">
            <div
              className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(245,41,104,0.45),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,122,47,0.35),transparent_32%)]"
              aria-hidden="true"
            />
            <h2 className="max-w-2xl text-3xl font-black leading-tight tracking-normal">
              What happens next?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
              Travel Xchange uses approval checks to keep the platform focused
              on verified travel trade members and trusted industry partners.
            </p>
          </div>

          <div className="grid gap-4 p-6 sm:p-8">
            <div className="rounded-lg border border-[var(--tx-border)] bg-[var(--tx-surface-hover)] p-4">
              <ShieldCheck className="size-6 text-[var(--tx-accent)]" aria-hidden="true" />
              <h3 className="mt-3 text-base font-extrabold text-[var(--tx-text)]">
                Admin review
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--tx-text-muted)]">
                A platform admin or company page admin checks the account
                details before access is unlocked.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--tx-border)] bg-[var(--tx-surface-hover)] p-4">
              <Clock3 className="size-6 text-[var(--tx-accent)]" aria-hidden="true" />
              <h3 className="mt-3 text-base font-extrabold text-[var(--tx-text)]">
                Private areas stay closed
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--tx-text-muted)]">
                You cannot access member content, supplier pages, jobs,
                messages, or admin tools until approval is complete.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--tx-border)] bg-[var(--tx-surface-hover)] p-4">
              <Mail className="size-6 text-[var(--tx-accent)]" aria-hidden="true" />
              <h3 className="mt-3 text-base font-extrabold text-[var(--tx-text)]">
                We will contact you
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--tx-text-muted)]">
                Once approved, your account can continue into the Travel
                Xchange platform.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
