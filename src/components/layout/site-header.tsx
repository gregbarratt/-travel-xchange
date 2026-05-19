import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { launchConfig, publicAuthEnabled } from "@/config/launch";
import { landingAnchors, publicRoutes } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-2" href="/">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[#082f49] text-white">
            <Compass className="size-5" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold text-slate-950">
            {siteConfig.name}
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 text-sm font-medium text-slate-600 lg:flex"
          aria-label="Primary"
        >
          {publicAuthEnabled
            ? landingAnchors.map((item) => (
                <Link
                  className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-950"
                  href={`/${item.href}`}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))
            : null}
          {publicRoutes.slice(1).map((item) => (
            <Link
              className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-950"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {publicAuthEnabled ? (
          <div className="flex items-center gap-2">
            <Link
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-950 sm:inline-flex"
              href="/login"
            >
              Log in
            </Link>
            <Link
              className={cn(
                buttonVariants({ size: "lg" }),
                "hidden bg-[#0f766e] hover:bg-[#115e59] sm:inline-flex",
              )}
              href="/register"
            >
              Join now
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="hidden rounded-lg border border-[#f52968]/20 bg-[#fff1f6] px-3 py-2 text-sm font-extrabold text-[#f52968] sm:block">
            {launchConfig.status}
          </div>
        )}
      </div>
    </header>
  );
}
