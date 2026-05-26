"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminStatusBadge } from "@/components/admin/admin-ui";
import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button } from "@/components/ui/button";
import { getCompanyTypeLabel } from "@/config/roles";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { Company, Profile } from "@/types/database";

type ManagedPage = Pick<
  Company,
  | "company_type"
  | "cover_image_url"
  | "id"
  | "logo_url"
  | "name"
  | "page_visibility"
  | "status"
  | "verification_tier"
> & {
  href: string;
  managementReason: "owner" | "page_admin" | "platform_admin";
};

type ManagedPagesResponse = {
  error?: string;
  pages?: ManagedPage[];
  viewerProfile?: Profile;
};

const managementReasonLabels: Record<ManagedPage["managementReason"], string> = {
  owner: "Owner",
  page_admin: "Page admin",
  platform_admin: "Admin/moderator",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function ManagedPagesPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [pages, setPages] = useState<ManagedPage[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadPages = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      router.replace("/login");
      return;
    }

    const response = await fetch("/api/workspace/managed-pages", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as
      ManagedPagesResponse;

    setIsLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Managed pages could not be loaded.");
      return;
    }

    setViewerProfile(payload.viewerProfile ?? null);
    setPages(payload.pages ?? []);
    setError(null);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPages();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPages]);

  return (
    <MemberPageShell
      activeLabel="Managed pages"
      eyebrow="My workspace"
      title="Managed pages"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so managed pages cannot load.
        </div>
      ) : null}

      {isLoading ? (
        <div className="tx-card flex items-center gap-2 p-6 text-sm text-[#4d6b9e]">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading managed pages...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </div>
      ) : null}

      {!isLoading && !error && pages.length === 0 ? (
        <section className="tx-card p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-[#eef5ff] text-[#063b86]">
            <Building2 className="size-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-xl font-extrabold text-[#061b4f]">
            No managed pages yet
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#4d6b9e]">
            Supplier and company pages will appear here when you own them, are
            assigned as page admin, or have platform admin/moderator access.
          </p>
        </section>
      ) : null}

      {pages.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <article
              className="tx-card overflow-hidden"
              key={`${page.id}-${page.managementReason}`}
            >
              <div
                className="h-24 bg-[linear-gradient(120deg,#061b4f,#0f766e)] bg-cover bg-center"
                style={
                  page.cover_image_url
                    ? { backgroundImage: `url(${page.cover_image_url})` }
                    : undefined
                }
              />
              <div className="p-5">
                <div className="-mt-12 flex items-end gap-3">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border-4 border-white bg-[#e0f2f1] text-lg font-extrabold text-[#0f766e] shadow-sm">
                    {page.logo_url ? (
                      <span
                        aria-label={`${page.name} logo`}
                        className="size-full bg-cover bg-center"
                        role="img"
                        style={{ backgroundImage: `url(${page.logo_url})` }}
                      />
                    ) : (
                      initials(page.name)
                    )}
                  </div>
                  <div className="translate-y-3">
                    <h2 className="text-lg font-extrabold text-[#061b4f]">
                      {page.name}
                    </h2>
                    <p className="mt-1 text-sm text-[#4d6b9e]">
                      {getCompanyTypeLabel(page.company_type)}
                    </p>
                  </div>
                </div>

                <div className="mt-7 flex flex-wrap gap-2">
                  <AdminStatusBadge tone="blue">
                    {managementReasonLabels[page.managementReason]}
                  </AdminStatusBadge>
                  <AdminStatusBadge
                    tone={page.page_visibility === "private" ? "amber" : "green"}
                  >
                    {page.page_visibility}
                  </AdminStatusBadge>
                  <AdminStatusBadge tone={page.status === "active" ? "green" : "amber"}>
                    {page.status}
                  </AdminStatusBadge>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={page.href}>
                    <Button
                      className="bg-[#061b4f] text-white hover:bg-[#123b7a]"
                      type="button"
                    >
                      <ShieldCheck className="size-4" aria-hidden="true" />
                      Manage page
                    </Button>
                  </Link>
                  <Link
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#b8cae8] bg-white px-3 text-sm font-bold text-[#061b4f] hover:bg-[#eef5ff]"
                    href="/admin/supplier-access"
                  >
                    Access
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </MemberPageShell>
  );
}
