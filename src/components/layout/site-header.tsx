import Link from "next/link";

import { TravelXchangeLogo } from "@/components/brand/travel-xchange-logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link aria-label="Travel Xchange login" className="flex items-center" href="/login">
          <TravelXchangeLogo
            markClassName="h-8 w-9 sm:h-10 sm:w-11"
            textClassName="[&>span:first-child]:text-lg sm:[&>span:first-child]:text-[1.35rem] [&>span:last-child]:text-[0.58rem] sm:[&>span:last-child]:text-[0.72rem]"
          />
        </Link>

        <Link
          className="rounded-lg border border-[var(--tx-accent)]/20 bg-[#fff1f6] px-3 py-2 text-sm font-extrabold text-[var(--tx-accent)] hover:bg-[#ffe3ee]"
          href="/login"
        >
          Log in
        </Link>
      </div>
    </header>
  );
}
