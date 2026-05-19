"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  ExternalLink,
  Megaphone,
  Plus,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { MemberPageShell } from "@/components/member/member-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import { isAdminRole } from "@/config/admin";
import {
  adPackageOptions,
  adPlacementOptions,
  adPricingOptions,
  getAdPackageLabel,
  getAdPlacementLabel,
  getAdPricingLabel,
} from "@/config/adverts";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { normalizeWebsiteUrl } from "@/lib/urls";
import type {
  AdCampaign,
  AdClick,
  AdCreative,
  AdImpression,
  AdPackageType,
  AdPlacement,
  AdPlacementKey,
  AdPricingModel,
  Advertiser,
  Profile,
} from "@/types/database";

const phase12SetupMessage =
  "The Phase 12 advertising tables are not installed yet. Run supabase/phase-12-adverts.sql in Supabase, then refresh this page.";

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

function numberOrNull(value: FormDataEntryValue | null) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatMoney(value: number | null) {
  if (!value) {
    return "Manual pricing";
  }

  return new Intl.NumberFormat("en-GB", {
    currency: "GBP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function AdvertManager() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [creatives, setCreatives] = useState<AdCreative[]>([]);
  const [placements, setPlacements] = useState<AdPlacement[]>([]);
  const [impressions, setImpressions] = useState<AdImpression[]>([]);
  const [clicks, setClicks] = useState<AdClick[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const loadManager = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/login");
      return;
    }

    setUserId(userData.user.id);
    setEmail(userData.user.email ?? null);

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();

    setViewerProfile(profileData);

    if (profileError) {
      setError(profileError.message);
      setIsLoading(false);
      return;
    }

    if (!profileData || !isAdminRole(profileData.role)) {
      setError(
        "Admin access is required for the advert manager. Set this account as an admin in Supabase during Phase 14 testing.",
      );
      setIsLoading(false);
      return;
    }

    const advertiserResult = await supabase
      .from("advertisers")
      .select("*")
      .order("created_at", { ascending: false });

    if (advertiserResult.error) {
      setError(
        isMissingAdTable(advertiserResult.error)
          ? phase12SetupMessage
          : advertiserResult.error.message,
      );
      setIsLoading(false);
      return;
    }

    const advertiserRows = (advertiserResult.data ?? []) as Advertiser[];
    const advertiserIds = advertiserRows.map((advertiser) => advertiser.id);
    setAdvertisers(advertiserRows);

    if (advertiserIds.length === 0) {
      setCampaigns([]);
      setCreatives([]);
      setPlacements([]);
      setImpressions([]);
      setClicks([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const campaignResult = await supabase
      .from("ad_campaigns")
      .select("*")
      .in("advertiser_id", advertiserIds)
      .order("created_at", { ascending: false });

    if (campaignResult.error) {
      setError(campaignResult.error.message);
      setIsLoading(false);
      return;
    }

    const campaignRows = (campaignResult.data ?? []) as AdCampaign[];
    const campaignIds = campaignRows.map((campaign) => campaign.id);
    setCampaigns(campaignRows);

    if (campaignIds.length === 0) {
      setCreatives([]);
      setPlacements([]);
      setImpressions([]);
      setClicks([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const [creativeResult, placementResult, impressionResult, clickResult] =
      await Promise.all([
        supabase
          .from("ad_creatives")
          .select("*")
          .in("campaign_id", campaignIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("ad_placements")
          .select("*")
          .in("campaign_id", campaignIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("ad_impressions")
          .select("*")
          .in("campaign_id", campaignIds)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("ad_clicks")
          .select("*")
          .in("campaign_id", campaignIds)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

    const issue =
      creativeResult.error ??
      placementResult.error ??
      impressionResult.error ??
      clickResult.error;

    if (issue) {
      setError(issue.message);
      setIsLoading(false);
      return;
    }

    setCreatives((creativeResult.data ?? []) as AdCreative[]);
    setPlacements((placementResult.data ?? []) as AdPlacement[]);
    setImpressions((impressionResult.data ?? []) as AdImpression[]);
    setClicks((clickResult.data ?? []) as AdClick[]);
    setError(null);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadManager();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadManager]);

  async function handleCreateAdvert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !userId) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const advertiserName = String(formData.get("advertiser_name") ?? "").trim();
    const campaignName = String(formData.get("campaign_name") ?? "").trim();
    const creativeTitle = String(formData.get("creative_title") ?? "").trim();
    const creativeBody = String(formData.get("creative_body") ?? "").trim();
    const ctaLabel =
      String(formData.get("cta_label") ?? "").trim() || "Learn more";
    const packageType = String(
      formData.get("package_type") ?? "supplier_spotlight",
    ) as AdPackageType;
    const pricingModel = String(
      formData.get("pricing_model") ?? "fixed_monthly",
    ) as AdPricingModel;
    const placementKey = String(
      formData.get("placement_key") ?? "feed_right_sidebar_ad",
    ) as AdPlacementKey;

    if (!advertiserName || !campaignName || !creativeTitle || !creativeBody) {
      setError("Please add advertiser, campaign, title, and advert copy.");
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    const { data: advertiserData, error: advertiserError } = await supabase
      .from("advertisers")
      .insert({
        contact_email: String(formData.get("contact_email") ?? "").trim() || email,
        created_by: userId,
        name: advertiserName,
        status: "active",
        website_url: normalizeWebsiteUrl(
          String(formData.get("website_url") ?? ""),
        ),
      })
      .select("id")
      .single();

    if (advertiserError) {
      setError(
        isMissingAdTable(advertiserError)
          ? phase12SetupMessage
          : advertiserError.message,
      );
      setIsSaving(false);
      return;
    }

    const { data: campaignData, error: campaignError } = await supabase
      .from("ad_campaigns")
      .insert({
        advertiser_id: advertiserData.id,
        budget_amount: numberOrNull(formData.get("budget_amount")),
        created_by: userId,
        name: campaignName,
        package_type: packageType,
        pricing_model: pricingModel,
        status: "active",
      })
      .select("id")
      .single();

    if (campaignError) {
      setError(campaignError.message);
      setIsSaving(false);
      return;
    }

    const { data: creativeData, error: creativeError } = await supabase
      .from("ad_creatives")
      .insert({
        body: creativeBody,
        campaign_id: campaignData.id,
        created_by: userId,
        cta_label: ctaLabel,
        image_url: normalizeWebsiteUrl(String(formData.get("image_url") ?? "")),
        sponsor_label:
          String(formData.get("sponsor_label") ?? "").trim() || "Sponsored",
        status: "active",
        target_url: normalizeWebsiteUrl(
          String(formData.get("target_url") ?? ""),
        ),
        title: creativeTitle,
      })
      .select("id")
      .single();

    if (creativeError) {
      setError(creativeError.message);
      setIsSaving(false);
      return;
    }

    const { error: placementError } = await supabase
      .from("ad_placements")
      .insert({
        campaign_id: campaignData.id,
        creative_id: creativeData.id,
        created_by: userId,
        placement_key: placementKey,
        placement_label: getAdPlacementLabel(placementKey),
        status: "active",
        weight: 1,
      });

    if (placementError) {
      setError(placementError.message);
      setIsSaving(false);
      return;
    }

    form.reset();
    setMessage(
      `Advert created for ${getAdPlacementLabel(placementKey)}. Refresh the matching page to see it.`,
    );
    setIsSaving(false);
    await loadManager();
  }

  const activeCampaigns = campaigns.filter(
    (campaign) => campaign.status === "active",
  );
  const activePlacements = placements.filter(
    (placement) => placement.status === "active",
  );
  const creativeMap = new Map(creatives.map((creative) => [creative.id, creative]));

  return (
    <MemberPageShell
      activeLabel="Admin"
      actions={
        <Link
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          href="/dashboard"
        >
          Feed
        </Link>
      }
      eyebrow="Advertising"
      title="Advert manager"
      viewerProfile={viewerProfile}
    >
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not connected yet, so adverts cannot save.
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-[#0f766e]">
              Phase 12 revenue system
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
              Create sponsored placements for the travel trade
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              This manager creates a starter advertiser, campaign, creative, and
              placement. Payments, approvals, and full admin permissions come in
              later phases.
            </p>
          </div>
          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-[#0f766e] text-white hover:bg-[#115e59]",
            )}
            href="/dashboard"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            View feed ads
          </Link>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-5">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">
              {message}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading advert manager...
            </div>
          ) : null}

          <form
            className="space-y-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm"
            onSubmit={handleCreateAdvert}
          >
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness
                  className="size-5 text-[#0f766e]"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-semibold text-slate-950">
                  Advertiser and campaign
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Advertiser name"
                  name="advertiser_name"
                  placeholder="Example Travel Supplier"
                  required
                />
                <TextField
                  label="Advertiser website"
                  name="website_url"
                  placeholder="www.example-supplier.com"
                />
                <TextField
                  defaultValue={email ?? ""}
                  label="Contact email"
                  name="contact_email"
                  placeholder="marketing@example.com"
                  type="email"
                />
                <TextField
                  label="Campaign name"
                  name="campaign_name"
                  placeholder="Summer agent incentive"
                  required
                />
                <SelectField
                  label="Package"
                  name="package_type"
                  options={adPackageOptions}
                />
                <SelectField
                  label="Pricing"
                  name="pricing_model"
                  options={adPricingOptions.map((option) => ({
                    label: `${option.label} - ${option.description}`,
                    value: option.value,
                  }))}
                />
                <TextField
                  label="Budget placeholder"
                  min={0}
                  name="budget_amount"
                  placeholder="500"
                  type="number"
                />
                <SelectField
                  defaultValue="feed_right_sidebar_ad"
                  label="Placement"
                  name="placement_key"
                  options={adPlacementOptions.map((option) => ({
                    label: `${option.label} - ${option.description}`,
                    value: option.value,
                  }))}
                />
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-[#0f766e]" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950">
                  Creative
                </h2>
              </div>
              <TextField
                label="Advert title"
                name="creative_title"
                placeholder="Win more cruise enquiries this month"
                required
              />
              <TextareaField
                className="min-h-32"
                label="Advert copy"
                name="creative_body"
                placeholder="Promote a supplier offer, training module, incentive, webinar, or destination campaign."
                required
              />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  defaultValue="Sponsored"
                  label="Sponsor label"
                  name="sponsor_label"
                  placeholder="Sponsored"
                />
                <TextField
                  defaultValue="Learn more"
                  label="Button text"
                  name="cta_label"
                  placeholder="Learn more"
                />
                <TextField
                  hint="Optional. Travel Xchange will add https:// if needed."
                  label="Target URL"
                  name="target_url"
                  placeholder="www.example-supplier.com/campaign"
                />
                <TextField
                  hint="Optional image URL for banner or supplier cards."
                  label="Image URL"
                  name="image_url"
                  placeholder="https://example.com/ad-image.jpg"
                />
              </div>
            </section>

            <div className="flex justify-end border-t border-slate-100 pt-5">
              <Button
                className="h-11 bg-[#0f766e] px-5 text-white hover:bg-[#115e59]"
                disabled={!configured || isSaving}
                type="submit"
              >
                <Plus className="size-4" aria-hidden="true" />
                {isSaving ? "Creating..." : "Create advert placement"}
              </Button>
            </div>
          </form>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Megaphone className="size-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                Active placements
              </h2>
            </div>
            {activePlacements.length > 0 ? (
              <div className="mt-4 space-y-3">
                {activePlacements.map((placement) => {
                  const creative = creativeMap.get(placement.creative_id);

                  return (
                    <article
                      className="rounded-md border border-slate-200 p-4"
                      key={placement.id}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {creative?.title ?? placement.placement_label}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {getAdPlacementLabel(placement.placement_key)}
                          </p>
                        </div>
                        <span className="rounded-md bg-[#e0f2f1] px-2 py-1 text-xs font-semibold text-[#0f766e]">
                          Active
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                No placements yet. Create one above, then open the matching page
                to view it.
              </p>
            )}
          </section>
        </main>

        <aside className="space-y-5">
          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                Advertising summary
              </h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Advertisers
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {advertisers.length}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Campaigns
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {activeCampaigns.length}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Impressions
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {impressions.length}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Clicks
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {clicks.length}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Pricing placeholders
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {campaigns.slice(0, 5).map((campaign) => (
                <div
                  className="rounded-md border border-slate-100 p-3"
                  key={campaign.id}
                >
                  <p className="font-semibold text-slate-950">
                    {campaign.name}
                  </p>
                  <p>{getAdPackageLabel(campaign.package_type)}</p>
                  <p>{getAdPricingLabel(campaign.pricing_model)}</p>
                  <p>{formatMoney(campaign.budget_amount)}</p>
                </div>
              ))}
              {campaigns.length === 0 ? (
                <p>
                  CPM, CPC, fixed monthly sponsorship, featured supplier, and
                  job board packages are ready as placeholders.
                </p>
              ) : null}
            </div>
          </article>
        </aside>
      </div>
    </MemberPageShell>
  );
}
