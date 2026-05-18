"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Megaphone, MousePointerClick, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

import { getAdPlacementLabel } from "@/config/adverts";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  AdCreative,
  AdPlacement,
  AdPlacementKey,
  AdPlacementWithCreative,
} from "@/types/database";

type AdPlacementProps = {
  className?: string;
  fallback?: "compact" | "none";
  placementKey: AdPlacementKey;
  variant?: "sidebar" | "feed" | "banner" | "spotlight";
};

function isMissingAdTable(error: { code?: string; message?: string }) {
  return isMissingTableError(error, [
    "advertisers",
    "ad_campaigns",
    "ad_creatives",
    "ad_placements",
    "ad_impressions",
    "ad_clicks",
  ]);
}

function choosePlacement(rows: AdPlacementWithCreative[]) {
  return rows.sort((a, b) => b.weight - a.weight)[0] ?? null;
}

export function AdPlacementSlot({
  className,
  fallback = "compact",
  placementKey,
  variant = "sidebar",
}: AdPlacementProps) {
  const configured = isSupabaseConfigured();
  const pathname = usePathname();
  const [ad, setAd] = useState<AdPlacementWithCreative | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);
  const loggedImpressionId = useRef<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadAd = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    setUserId(userData.user?.id ?? null);

    const { data: placementRows, error: placementError } = await supabase
      .from("ad_placements")
      .select("*")
      .eq("placement_key", placementKey)
      .eq("status", "active")
      .order("weight", { ascending: false })
      .limit(6);

    if (placementError) {
      setError(isMissingAdTable(placementError) ? null : placementError.message);
      setIsLoading(false);
      return;
    }

    const placements = (placementRows ?? []) as AdPlacement[];
    const creativeIds = placements.map((placement) => placement.creative_id);

    if (creativeIds.length === 0) {
      setAd(null);
      setIsLoading(false);
      return;
    }

    const { data: creativeRows, error: creativeError } = await supabase
      .from("ad_creatives")
      .select("*")
      .in("id", creativeIds)
      .eq("status", "active");

    if (creativeError) {
      setError(isMissingAdTable(creativeError) ? null : creativeError.message);
      setIsLoading(false);
      return;
    }

    const creativeMap = new Map(
      ((creativeRows ?? []) as AdCreative[]).map((creative) => [
        creative.id,
        creative,
      ]),
    );
    const rows = placements
      .map((placement) => {
        const creative = creativeMap.get(placement.creative_id);

        return creative ? { ...placement, creative } : null;
      })
      .filter(Boolean) as AdPlacementWithCreative[];

    setAd(choosePlacement(rows));
    setError(null);
    setIsLoading(false);
  }, [placementKey, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAd();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAd]);

  useEffect(() => {
    if (!supabase || !ad || loggedImpressionId.current === ad.id) {
      return;
    }

    loggedImpressionId.current = ad.id;

    void supabase.from("ad_impressions").insert({
      campaign_id: ad.campaign_id,
      creative_id: ad.creative_id,
      page_path: pathname,
      placement_id: ad.id,
      user_id: userId,
    });
  }, [ad, pathname, supabase, userId]);

  async function handleClick() {
    if (!supabase || !ad) {
      return;
    }

    await supabase.from("ad_clicks").insert({
      campaign_id: ad.campaign_id,
      creative_id: ad.creative_id,
      page_path: pathname,
      placement_id: ad.id,
      target_url: ad.creative.target_url,
      user_id: userId,
    });
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm",
          className,
        )}
      >
        Loading sponsor placement...
      </div>
    );
  }

  if (!ad) {
    if (fallback === "none") {
      return null;
    }

    return (
      <section
        className={cn(
          "rounded-md border border-dashed border-slate-300 bg-white p-4 shadow-sm",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-[#0f766e]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-950">
            {getAdPlacementLabel(placementKey)}
          </h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Sponsor inventory is ready. Create an active placement in the advert
          manager to fill this slot.
        </p>
        {error ? (
          <p className="mt-3 text-xs leading-5 text-amber-700">{error}</p>
        ) : null}
      </section>
    );
  }

  const href = ad.creative.target_url || "/admin/adverts";
  const isExternal = href.startsWith("http://") || href.startsWith("https://");
  const image = ad.creative.image_url;
  const isBanner = variant === "banner";
  const isFeed = variant === "feed";

  const content = (
    <article
      className={cn(
        "rounded-md border border-slate-200 bg-white shadow-sm transition hover:shadow-md",
        isFeed ? "p-5" : "p-4",
        isBanner ? "p-5" : "",
        variant === "spotlight" ? "border-[#0f766e]/30" : "",
        className,
      )}
    >
      <div
        className={cn(
          "flex gap-4",
          isBanner ? "flex-col md:flex-row md:items-center" : "flex-col",
        )}
      >
        {image ? (
          <div
            className={cn(
              "overflow-hidden rounded-md bg-slate-100",
              isBanner ? "md:w-56" : "",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              className="aspect-[16/9] w-full object-cover"
              src={image}
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#e0f2f1] px-2 py-1 text-xs font-semibold text-[#0f766e]">
              <Sparkles className="size-3" aria-hidden="true" />
              {ad.creative.sponsor_label}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {ad.placement_label}
            </span>
          </div>

          <h2
            className={cn(
              "mt-3 font-semibold tracking-normal text-slate-950",
              isBanner ? "text-xl" : "text-lg",
            )}
          >
            {ad.creative.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {ad.creative.body}
          </p>

          <div className="mt-4">
            <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0f766e] px-3 text-sm font-medium text-white transition group-hover:bg-[#115e59]">
              <MousePointerClick className="size-4" aria-hidden="true" />
              {ad.creative.cta_label}
            </span>
          </div>
        </div>
      </div>
    </article>
  );

  if (isExternal) {
    return (
      <a
        className="group block"
        href={href}
        onClick={() => void handleClick()}
        rel="noreferrer"
        target="_blank"
      >
        {content}
      </a>
    );
  }

  return (
    <Link className="group block" href={href} onClick={() => void handleClick()}>
      {content}
    </Link>
  );
}
