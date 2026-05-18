import type { AdPackageType, AdPlacementKey, AdPricingModel } from "@/types/database";

export const adPlacementOptions: Array<{
  description: string;
  label: string;
  value: AdPlacementKey;
}> = [
  {
    description: "Large homepage sponsor banner for later public monetisation.",
    label: "Homepage hero banner",
    value: "homepage_hero_banner",
  },
  {
    description: "Right sidebar advert on the logged-in feed.",
    label: "Feed right sidebar ad",
    value: "feed_right_sidebar_ad",
  },
  {
    description: "Sponsored post-style card inside the Xchange Feed.",
    label: "Feed sponsored post",
    value: "feed_sponsored_post",
  },
  {
    description: "Featured employer slot on the jobs board.",
    label: "Jobs page featured employer",
    value: "jobs_featured_employer",
  },
  {
    description: "Sponsored article placement for travel trade news.",
    label: "News sponsored article",
    value: "news_sponsored_article",
  },
  {
    description: "Sponsor banner for events and webinars.",
    label: "Events sponsor banner",
    value: "events_sponsor_banner",
  },
  {
    description: "Supplier sponsor placement for training modules.",
    label: "Training course sponsor",
    value: "training_course_sponsor",
  },
  {
    description: "Sponsor slot for a community group.",
    label: "Group sponsor",
    value: "group_sponsor",
  },
  {
    description: "Newsletter sponsorship placeholder.",
    label: "Newsletter sponsor",
    value: "newsletter_sponsor",
  },
  {
    description: "Mobile advert between feed cards.",
    label: "Mobile inter-card advert",
    value: "mobile_inter_card_ad",
  },
  {
    description: "Supplier spotlight card for the feed sidebar.",
    label: "Supplier spotlight card",
    value: "supplier_spotlight_card",
  },
];

export const adPackageOptions: Array<{
  label: string;
  value: AdPackageType;
}> = [
  { label: "Supplier spotlight", value: "supplier_spotlight" },
  { label: "Feed sidebar", value: "feed_sidebar" },
  { label: "Sponsored post", value: "sponsored_post" },
  { label: "Newsletter sponsor", value: "newsletter_sponsor" },
  { label: "Featured supplier", value: "featured_supplier" },
  { label: "Job board package", value: "job_board_package" },
];

export const adPricingOptions: Array<{
  description: string;
  label: string;
  value: AdPricingModel;
}> = [
  {
    description: "Placeholder for charging per thousand impressions.",
    label: "CPM placeholder",
    value: "cpm",
  },
  {
    description: "Placeholder for charging per click.",
    label: "CPC placeholder",
    value: "cpc",
  },
  {
    description: "Simple monthly sponsor package.",
    label: "Fixed monthly sponsorship",
    value: "fixed_monthly",
  },
  {
    description: "Manual sponsorship pricing for MVP testing.",
    label: "Manual sponsorship placeholder",
    value: "sponsorship_placeholder",
  },
];

export function getAdPlacementLabel(value: string) {
  return (
    adPlacementOptions.find((option) => option.value === value)?.label ??
    value.replaceAll("_", " ")
  );
}

export function getAdPackageLabel(value: string) {
  return (
    adPackageOptions.find((option) => option.value === value)?.label ??
    value.replaceAll("_", " ")
  );
}

export function getAdPricingLabel(value: string) {
  return (
    adPricingOptions.find((option) => option.value === value)?.label ??
    value.replaceAll("_", " ")
  );
}
