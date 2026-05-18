import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 text-slate-950">
      <section className="mx-auto w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-medium uppercase text-cyan-700">
          Phase 0 foundation
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
          {siteConfig.name}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          The starter app is ready for a professional travel industry community
          platform. Features will be added one phase at a time.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
            href="/about"
          >
            View placeholder pages
          </Link>
          <Link
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-full sm:w-auto",
            )}
            href="/pricing"
          >
            Pricing placeholder
          </Link>
        </div>
      </section>
    </main>
  );
}
