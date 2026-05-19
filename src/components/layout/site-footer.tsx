import Link from "next/link";
import { Compass } from "lucide-react";

import { legalRoutes } from "@/config/legal";
import { publicRoutes } from "@/config/navigation";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#082f49] text-white">
              <Compass className="size-5" aria-hidden="true" />
            </span>
            <span className="font-semibold text-slate-950">
              {siteConfig.name}
            </span>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
            {siteConfig.description}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-950">Platform</h2>
          <nav
            className="mt-3 grid gap-2 text-sm text-slate-600"
            aria-label="Footer platform"
          >
            {publicRoutes.map((item) => (
              <Link
                className="rounded-lg py-1 hover:text-slate-950"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            Legal and trust
          </h2>
          <nav
            className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 md:grid-cols-1"
            aria-label="Footer legal"
          >
            {legalRoutes.map((item) => (
              <Link
                className="rounded-lg py-1 hover:text-slate-950"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500">
        Phase 17 trust pages are starter policy drafts and should be legally
        reviewed before production launch.
      </div>
    </footer>
  );
}
