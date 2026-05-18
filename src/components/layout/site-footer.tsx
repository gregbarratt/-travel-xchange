import Link from "next/link";
import { Compass } from "lucide-react";

import { publicRoutes } from "@/config/navigation";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr] lg:px-8">
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

        <nav
          className="grid grid-cols-2 gap-3 text-sm text-slate-600 sm:flex sm:flex-wrap sm:justify-end"
          aria-label="Footer"
        >
          {publicRoutes.map((item) => (
            <Link
              className="rounded-lg px-2 py-1 hover:bg-slate-100 hover:text-slate-950"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500">
        Phase 1 public website preview. Product features will be added in later
        phases.
      </div>
    </footer>
  );
}
