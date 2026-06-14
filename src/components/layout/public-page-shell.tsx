import type { ReactNode } from "react";

import { SiteHeader } from "@/components/layout/site-header";

type PublicPageShellProps = {
  children: ReactNode;
};

export function PublicPageShell({ children }: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950">
      <SiteHeader />
      {children}
    </div>
  );
}
