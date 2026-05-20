import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { publicAuthEnabled } from "@/config/launch";

type PublicPageShellProps = {
  children: ReactNode;
};

export function PublicPageShell({ children }: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950">
      <SiteHeader />
      {children}
      {publicAuthEnabled ? <SiteFooter /> : null}
    </div>
  );
}
