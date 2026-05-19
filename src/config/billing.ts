import type { TravelXchangeRole } from "@/types/database";

export type BillingPlanKey =
  | "free_member"
  | "premium_professional"
  | "supplier_basic"
  | "supplier_pro"
  | "recruiter_plan"
  | "advertiser_plan";

export type BillingPlan = {
  accent: "navy" | "pink" | "blue" | "orange";
  audience: string;
  ctaLabel: string;
  description: string;
  features: string[];
  interval: "month" | "placeholder";
  isFeatured?: boolean;
  key: BillingPlanKey;
  name: string;
  price: string;
  priceEnvVar?: string;
  recommendedRole?: TravelXchangeRole;
};

export const billingPlans: BillingPlan[] = [
  {
    accent: "navy",
    audience: "Individual members",
    ctaLabel: "Start free",
    description:
      "Join the community, complete onboarding, and use the core professional network.",
    features: [
      "Member profile",
      "Xchange Feed access",
      "Groups, jobs, events, news, training, and support",
      "Basic messaging and notifications",
    ],
    interval: "placeholder",
    key: "free_member",
    name: "Free member",
    price: "Free",
  },
  {
    accent: "pink",
    audience: "Travel professionals",
    ctaLabel: "Upgrade to premium",
    description:
      "A paid professional membership placeholder for premium badges and richer tools.",
    features: [
      "Premium member badge",
      "Enhanced profile visibility",
      "Priority community features placeholder",
      "Future CPD and certificate benefits",
    ],
    interval: "month",
    isFeatured: true,
    key: "premium_professional",
    name: "Premium professional",
    price: "£12",
    priceEnvVar: "STRIPE_PRICE_PREMIUM_PROFESSIONAL",
    recommendedRole: "verified_travel_professional",
  },
  {
    accent: "blue",
    audience: "Suppliers",
    ctaLabel: "Choose supplier basic",
    description:
      "Starter supplier access for company visibility and future supplier updates.",
    features: [
      "Supplier profile presence",
      "Supplier update placeholders",
      "Basic company attribution",
      "Upgrade path to supplier campaigns",
    ],
    interval: "month",
    key: "supplier_basic",
    name: "Supplier basic",
    price: "£49",
    priceEnvVar: "STRIPE_PRICE_SUPPLIER_BASIC",
    recommendedRole: "supplier",
  },
  {
    accent: "orange",
    audience: "Growth suppliers",
    ctaLabel: "Choose supplier pro",
    description:
      "Higher visibility supplier package placeholder for campaigns and training sponsorship.",
    features: [
      "Supplier spotlight placeholder",
      "Sponsored content pathway",
      "Training sponsorship pathway",
      "Future analytics upgrades",
    ],
    interval: "month",
    key: "supplier_pro",
    name: "Supplier pro",
    price: "£149",
    priceEnvVar: "STRIPE_PRICE_SUPPLIER_PRO",
    recommendedRole: "supplier",
  },
  {
    accent: "blue",
    audience: "Recruiters",
    ctaLabel: "Choose recruiter plan",
    description:
      "Recruiter subscription placeholder for job posting packages and employer branding.",
    features: [
      "Recruiter account status",
      "Job board package pathway",
      "Featured employer pathway",
      "Candidate interest tracking placeholder",
    ],
    interval: "month",
    key: "recruiter_plan",
    name: "Recruiter plan",
    price: "£99",
    priceEnvVar: "STRIPE_PRICE_RECRUITER",
    recommendedRole: "recruiter",
  },
  {
    accent: "pink",
    audience: "Advertisers",
    ctaLabel: "Choose advertiser plan",
    description:
      "Advertiser subscription placeholder for campaign management and sponsorship inventory.",
    features: [
      "Advertiser account status",
      "Campaign manager pathway",
      "Sponsored placements pathway",
      "Impression and click reporting placeholder",
    ],
    interval: "month",
    key: "advertiser_plan",
    name: "Advertiser plan",
    price: "£199",
    priceEnvVar: "STRIPE_PRICE_ADVERTISER",
    recommendedRole: "advertiser",
  },
];

export function getBillingPlan(key: string | null | undefined) {
  return billingPlans.find((plan) => plan.key === key) ?? null;
}

export function getBillingPlanLabel(key: string | null | undefined) {
  return getBillingPlan(key)?.name ?? "No paid plan";
}

export function getPaidBillingPlans() {
  return billingPlans.filter((plan) => plan.key !== "free_member");
}
