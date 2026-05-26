"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, ShieldCheck } from "lucide-react";

import { SupplierAccessRequestPanel } from "@/components/company/supplier-access-request-panel";
import { SupplierBrandingForm } from "@/components/company/supplier-branding-form";
import { SupplierRoleManager } from "@/components/company/supplier-role-manager";
import { Button } from "@/components/ui/button";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type SupplierAdminPanelProps = {
  companyId: string;
  initialCoverImageUrl?: string | null;
  initialLogoUrl?: string | null;
  onBrandingSaved?: (branding: {
    cover_image_url: string | null;
    logo_url: string | null;
  }) => void;
};

type SupplierAdminAccessResponse = {
  canManage?: boolean;
  error?: string;
  requests?: unknown[];
};

export function SupplierAdminPanel({
  companyId,
  initialCoverImageUrl,
  initialLogoUrl,
  onBrandingSaved,
}: SupplierAdminPanelProps) {
  const configured = isSupabaseConfigured();
  const [canManage, setCanManage] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadAdminState = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setIsLoading(false);
      return;
    }

    const response = await fetch(
      `/api/supplier-pages/${companyId}/access-requests`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const payload = (await response.json().catch(() => ({}))) as
      SupplierAdminAccessResponse;

    setCanManage(payload.canManage === true);
    setPendingCount(payload.requests?.length ?? 0);
    setError(response.ok ? null : payload.error ?? null);
    setIsLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAdminState();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAdminState]);

  if (!configured || (!isLoading && !canManage)) {
    return null;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-[#c8d7ee] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-[#061b4f] text-white">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Supplier admin panel
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Admin tools are tucked away so this page stays close to the
                agent view.
              </p>
              {pendingCount > 0 ? (
                <p className="mt-2 text-sm font-semibold text-[#f52968]">
                  {pendingCount} access request{pendingCount === 1 ? "" : "s"} to
                  review.
                </p>
              ) : null}
              {error ? (
                <p className="mt-2 text-sm text-amber-700">{error}</p>
              ) : null}
            </div>
          </div>

          <Button
            className="w-fit bg-[#061b4f] text-white hover:bg-[#123b7a]"
            disabled={isLoading}
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : isOpen ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
            {isOpen ? "Hide admin panel" : "Open admin panel"}
          </Button>
        </div>
      </section>

      {isOpen ? (
        <div className="space-y-4">
          <SupplierBrandingForm
            companyId={companyId}
            initialCoverImageUrl={initialCoverImageUrl}
            initialLogoUrl={initialLogoUrl}
            onSaved={onBrandingSaved}
          />
          <SupplierAccessRequestPanel companyId={companyId} managerOnly />
          <SupplierRoleManager companyId={companyId} />
        </div>
      ) : null}
    </div>
  );
}
