import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";

import { TravelXchangeLogo } from "@/components/brand/travel-xchange-logo";
import { PublicPageShell } from "@/components/layout/public-page-shell";

export const metadata: Metadata = {
  title: "Register",
  description:
    "Travel Xchange registration is paused while private beta access is prepared.",
  robots: {
    follow: false,
    index: false,
  },
};

export default function RegisterPage() {
  return (
    <PublicPageShell>
      <main className="bg-[var(--tx-surface-hover)] px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-3xl">
          <div className="rounded-lg border border-[var(--tx-border)] bg-white p-6 shadow-sm sm:p-8">
            <TravelXchangeLogo
              markClassName="h-9 w-10"
              textClassName="[&>span:first-child]:text-xl [&>span:last-child]:text-[0.62rem]"
            />
            <p className="mt-8 inline-flex rounded-lg border border-[var(--tx-accent)]/20 bg-[#fff1f6] px-3 py-2 text-sm font-extrabold uppercase tracking-wide text-[var(--tx-accent)]">
              Registration paused
            </p>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-normal text-[var(--tx-text)]">
              Travel Xchange access is currently invitation-only.
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--tx-text-muted)]">
              Public registration is temporarily closed while we prepare private
              beta access. Existing owners, admins, and invited testers can log
              in from the secure login page.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--tx-border)] bg-[var(--tx-surface-hover)] p-4">
                <LockKeyhole className="size-5 text-[var(--tx-text)]" aria-hidden="true" />
                <p className="mt-3 text-sm font-extrabold text-[var(--tx-text)]">
                  New account creation is blocked.
                </p>
              </div>
              <div className="rounded-lg border border-[var(--tx-border)] bg-[var(--tx-surface-hover)] p-4">
                <ShieldCheck className="size-5 text-[var(--tx-accent)]" aria-hidden="true" />
                <p className="mt-3 text-sm font-extrabold text-[var(--tx-text)]">
                  Access is reviewed before beta.
                </p>
              </div>
              <div className="rounded-lg border border-[var(--tx-border)] bg-[var(--tx-surface-hover)] p-4">
                <CheckCircle2 className="size-5 text-[var(--tx-accent)]" aria-hidden="true" />
                <p className="mt-3 text-sm font-extrabold text-[var(--tx-text)]">
                  Travel Xchange remains free to access.
                </p>
              </div>
            </div>

            <Link
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--tx-accent)] px-5 py-3 text-sm font-extrabold text-white hover:bg-[var(--tx-accent-hover)]"
              href="/login"
            >
              Go to login
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
