import Link from "next/link";
import type { ReactNode } from "react";

import { TravelXchangeLogo } from "@/components/brand/travel-xchange-logo";
import { PublicPageShell } from "@/components/layout/public-page-shell";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footerText: string;
  footerHref: string;
  footerLinkText: string;
};

export function AuthCard({
  title,
  description,
  children,
  footerText,
  footerHref,
  footerLinkText,
}: AuthCardProps) {
  return (
    <PublicPageShell>
      <main className="bg-[var(--tx-surface-hover)] px-4 py-12 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-md">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <TravelXchangeLogo
              markClassName="h-9 w-10"
              textClassName="[&>span:first-child]:text-xl [&>span:last-child]:text-[0.62rem]"
            />
            <h1 className="mt-8 text-3xl font-semibold tracking-normal text-slate-950">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {description}
            </p>
            <div className="mt-8">{children}</div>
          </div>
          <p className="mt-6 text-center text-sm text-slate-600">
            {footerText}{" "}
            <Link
              className="font-semibold text-[var(--tx-accent)] hover:text-[var(--tx-accent-hover)]"
              href={footerHref}
            >
              {footerLinkText}
            </Link>
          </p>
        </section>
      </main>
    </PublicPageShell>
  );
}
