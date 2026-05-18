import Link from "next/link";
import type { ReactNode } from "react";
import { Compass } from "lucide-react";

import { PublicPageShell } from "@/components/layout/public-page-shell";
import { siteConfig } from "@/config/site";

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
      <main className="bg-[#f8fafc] px-4 py-12 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-md">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-2">
              <span className="flex size-10 items-center justify-center rounded-lg bg-[#082f49] text-white">
                <Compass className="size-5" aria-hidden="true" />
              </span>
              <span className="font-semibold text-slate-950">
                {siteConfig.name}
              </span>
            </div>
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
              className="font-semibold text-[#0f766e] hover:text-[#115e59]"
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
