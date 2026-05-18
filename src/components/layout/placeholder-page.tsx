import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { PublicPageShell } from "@/components/layout/public-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  children,
}: PlaceholderPageProps) {
  return (
    <PublicPageShell>
      <main className="bg-[#f8fafc]">
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
              <p className="text-sm font-semibold uppercase text-[#0f766e]">
                {eyebrow}
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
                {title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                {description}
              </p>
              {children ? <div className="mt-8">{children}</div> : null}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className={cn(buttonVariants({ size: "lg" }), "sm:w-auto")}
                  href="/"
                >
                  Back to home
                </Link>
                <Link
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "sm:w-auto",
                  )}
                  href="/contact"
                >
                  Contact placeholder
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
