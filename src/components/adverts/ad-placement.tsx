"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Megaphone,
  MousePointerClick,
  Plane,
  Sparkles,
} from "lucide-react";
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

function isExternalUrl(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

function mapPlacementsWithCreatives(
  placements: AdPlacement[],
  creatives: AdCreative[],
) {
  const creativeMap = new Map(creatives.map((creative) => [creative.id, creative]));

  return placements
    .map((placement) => {
      const creative = creativeMap.get(placement.creative_id);

      return creative ? { ...placement, creative } : null;
    })
    .filter(Boolean) as AdPlacementWithCreative[];
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

    const rows = mapPlacementsWithCreatives(
      placements,
      (creativeRows ?? []) as AdCreative[],
    );

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
          "tx-card-soft p-4 text-sm text-[#4d6b9e]",
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
          "tx-card-soft p-5",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-[#063b86]" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-[#061b4f]">
            {getAdPlacementLabel(placementKey)}
          </h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#4d6b9e]">
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
  const isExternal = isExternalUrl(href);
  const image = ad.creative.image_url;
  const isBanner = variant === "banner";
  const isFeed = variant === "feed";

  const content = (
    <article
      className={cn(
        "tx-card tx-ad-surface transition hover:shadow-[0_20px_48px_rgba(7,36,91,0.14)]",
        isFeed ? "p-5" : "p-4",
        isBanner ? "p-5" : "",
        variant === "spotlight" ? "border-[#063b86]/30" : "",
        className,
      )}
    >
      <Plane
        className="absolute right-4 top-4 size-8 rotate-[-18deg] text-[#063b86]/85"
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative z-10 flex gap-4",
          isBanner ? "flex-col md:flex-row md:items-center" : "flex-col",
        )}
      >
        {image ? (
          <div
            className={cn(
              "overflow-hidden rounded-lg bg-[#eef5ff]",
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
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#ffe7ed] px-2 py-1 text-xs font-extrabold text-[#f52968]">
              <Sparkles className="size-3" aria-hidden="true" />
              {ad.creative.sponsor_label}
            </span>
            <span className="text-xs font-bold text-[#4d6b9e]">
              {ad.placement_label}
            </span>
          </div>

          <h2
            className={cn(
              "mt-3 font-extrabold tracking-normal text-[#061b4f]",
              isBanner ? "text-xl" : "text-lg",
            )}
          >
            {ad.creative.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#4d6b9e]">
            {ad.creative.body}
          </p>

          <div className="mt-4">
            <span className="tx-action inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-bold transition">
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

export function FeaturedAdCarousel({
  className,
  placementKey = "homepage_hero_banner",
}: {
  className?: string;
  placementKey?: AdPlacementKey;
}) {
  const configured = isSupabaseConfigured();
  const pathname = usePathname();
  const [ads, setAds] = useState<AdPlacementWithCreative[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);
  const loggedImpressions = useRef<Set<string>>(new Set());

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadAds = useCallback(async () => {
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
      .limit(12);

    if (placementError) {
      setError(isMissingAdTable(placementError) ? null : placementError.message);
      setIsLoading(false);
      return;
    }

    const placements = (placementRows ?? []) as AdPlacement[];
    const creativeIds = placements.map((placement) => placement.creative_id);

    if (creativeIds.length === 0) {
      setAds([]);
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

    setAds(
      mapPlacementsWithCreatives(
        placements,
        (creativeRows ?? []) as AdCreative[],
      ),
    );
    setActiveIndex(0);
    setError(null);
    setIsLoading(false);
  }, [placementKey, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAds();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAds]);

  useEffect(() => {
    if (ads.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % ads.length);
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [ads.length]);

  const activeAd = ads[activeIndex] ?? null;

  useEffect(() => {
    if (!supabase || !activeAd || loggedImpressions.current.has(activeAd.id)) {
      return;
    }

    loggedImpressions.current.add(activeAd.id);

    void supabase.from("ad_impressions").insert({
      campaign_id: activeAd.campaign_id,
      creative_id: activeAd.creative_id,
      metadata: { carousel: true },
      page_path: pathname,
      placement_id: activeAd.id,
      user_id: userId,
    });
  }, [activeAd, pathname, supabase, userId]);

  async function handleClick(ad: AdPlacementWithCreative) {
    if (!supabase) {
      return;
    }

    await supabase.from("ad_clicks").insert({
      campaign_id: ad.campaign_id,
      creative_id: ad.creative_id,
      metadata: { carousel: true },
      page_path: pathname,
      placement_id: ad.id,
      target_url: ad.creative.target_url,
      user_id: userId,
    });
  }

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + ads.length) % ads.length);
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % ads.length);
  }

  if (isLoading) {
    return (
      <section
        className={cn(
          "tx-engage-hero min-h-[280px] rounded-lg border border-[#b8cae8]/70 bg-white p-6 text-sm font-semibold text-[#4d6b9e]",
          className,
        )}
      >
        Loading featured adverts...
      </section>
    );
  }

  if (!activeAd) {
    return (
      <section
        className={cn(
          "tx-engage-hero min-h-[280px] overflow-hidden rounded-lg border border-[#b8cae8]/70 bg-white p-6",
          className,
        )}
      >
        <div className="flex h-full min-h-[228px] flex-col justify-center">
          <span className="w-fit rounded-lg bg-[#fff0f5] px-3 py-1 text-xs font-extrabold uppercase text-[#f52968]">
            Featured supplier space
          </span>
          <h2 className="mt-4 max-w-2xl text-3xl font-extrabold text-[#061b4f]">
            Premium supplier adverts will rotate here.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4d6b9e]">
            Create active adverts using the Homepage hero banner placement to
            fill this carousel.
          </p>
          {error ? (
            <p className="mt-3 text-xs leading-5 text-amber-700">{error}</p>
          ) : null}
        </div>
      </section>
    );
  }

  const href = activeAd.creative.target_url || "/admin/adverts";
  const isExternal = isExternalUrl(href);
  const imageUrl = activeAd.creative.image_url;
  const slideContent = (
    <article
      className="relative min-h-[280px] overflow-hidden rounded-lg border border-[#b8cae8]/70 bg-white shadow-[0_18px_48px_rgba(7,36,91,0.12)] transition hover:shadow-[0_22px_60px_rgba(7,36,91,0.16)]"
      style={
        imageUrl
          ? {
              backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.96), rgba(255,255,255,0.78), rgba(255,255,255,0.18)), url(${imageUrl})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      <Plane
        className="absolute right-6 top-6 size-10 rotate-[-18deg] text-[#063b86]/90"
        aria-hidden="true"
      />
      <div className="relative z-10 flex min-h-[280px] max-w-3xl flex-col justify-center p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#ffe7ed] px-3 py-1 text-xs font-extrabold uppercase text-[#f52968]">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {activeAd.creative.sponsor_label}
          </span>
          <span className="rounded-lg bg-[#eef5ff] px-3 py-1 text-xs font-bold text-[#063b86]">
            {activeAd.placement_label}
          </span>
        </div>
        <h2 className="mt-5 max-w-2xl text-3xl font-extrabold leading-tight text-[#061b4f] sm:text-4xl">
          {activeAd.creative.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#29456f] sm:text-base">
          {activeAd.creative.body}
        </p>
        <span className="tx-action mt-6 inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg px-5 text-sm font-extrabold transition">
          <MousePointerClick className="size-4" aria-hidden="true" />
          {activeAd.creative.cta_label}
        </span>
      </div>
    </article>
  );

  return (
    <section className={cn("relative", className)} aria-label="Featured adverts">
      {isExternal ? (
        <a
          className="block"
          href={href}
          onClick={() => void handleClick(activeAd)}
          rel="noreferrer"
          target="_blank"
        >
          {slideContent}
        </a>
      ) : (
        <Link
          className="block"
          href={href}
          onClick={() => void handleClick(activeAd)}
        >
          {slideContent}
        </Link>
      )}

      {ads.length > 1 ? (
        <>
          <button
            aria-label="Previous featured advert"
            className="absolute left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#b8cae8] bg-white/90 text-[#061b4f] shadow-[0_10px_24px_rgba(7,36,91,0.18)] transition hover:bg-white"
            onClick={showPrevious}
            type="button"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            aria-label="Next featured advert"
            className="absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#b8cae8] bg-white/90 text-[#061b4f] shadow-[0_10px_24px_rgba(7,36,91,0.18)] transition hover:bg-white"
            onClick={showNext}
            type="button"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full bg-white/80 px-3 py-2 shadow-[0_10px_24px_rgba(7,36,91,0.14)]">
            {ads.map((ad, index) => (
              <button
                aria-label={`Show featured advert ${index + 1}`}
                className={cn(
                  "size-2.5 rounded-full transition",
                  index === activeIndex ? "bg-[#f52968]" : "bg-[#b8cae8]",
                )}
                key={ad.id}
                onClick={() => setActiveIndex(index)}
                type="button"
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
