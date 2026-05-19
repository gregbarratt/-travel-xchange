export type ReadinessLevel = "required" | "recommended" | "later";

export type EnvironmentVariableDefinition = {
  description: string;
  key: string;
  level: ReadinessLevel;
  scope: "public" | "server";
};

export type ProductionChecklistItem = {
  detail: string;
  label: string;
  level: ReadinessLevel;
};

export type ProductionChecklistSection = {
  items: ProductionChecklistItem[];
  title: string;
};

export const environmentVariableDefinitions: EnvironmentVariableDefinition[] = [
  {
    description: "Public website URL used for SEO, Stripe redirects, sitemap, and robots.txt.",
    key: "NEXT_PUBLIC_APP_URL",
    level: "required",
    scope: "public",
  },
  {
    description: "Supabase project URL for browser and server database access.",
    key: "NEXT_PUBLIC_SUPABASE_URL",
    level: "required",
    scope: "public",
  },
  {
    description: "Supabase public anon key for browser authentication and member features.",
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    level: "required",
    scope: "public",
  },
  {
    description: "Server-only Supabase key for secure billing, webhook, and admin-side operations.",
    key: "SUPABASE_SERVICE_ROLE_KEY",
    level: "required",
    scope: "server",
  },
  {
    description: "Stripe secret or restricted key for creating checkout and portal sessions.",
    key: "STRIPE_SECRET_KEY",
    level: "required",
    scope: "server",
  },
  {
    description: "Stripe webhook signing secret for confirming Stripe events are genuine.",
    key: "STRIPE_WEBHOOK_SECRET",
    level: "required",
    scope: "server",
  },
  {
    description: "Stripe publishable key for future client-side billing widgets.",
    key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    level: "recommended",
    scope: "public",
  },
  {
    description: "Stripe price ID for the Premium Professional plan.",
    key: "STRIPE_PRICE_PREMIUM_PROFESSIONAL",
    level: "required",
    scope: "server",
  },
  {
    description: "Stripe price ID for the Supplier Basic plan.",
    key: "STRIPE_PRICE_SUPPLIER_BASIC",
    level: "required",
    scope: "server",
  },
  {
    description: "Stripe price ID for the Supplier Pro plan.",
    key: "STRIPE_PRICE_SUPPLIER_PRO",
    level: "required",
    scope: "server",
  },
  {
    description: "Stripe price ID for the Recruiter plan.",
    key: "STRIPE_PRICE_RECRUITER",
    level: "required",
    scope: "server",
  },
  {
    description: "Stripe price ID for the Advertiser plan.",
    key: "STRIPE_PRICE_ADVERTISER",
    level: "required",
    scope: "server",
  },
  {
    description: "Verified sending address for future system emails.",
    key: "EMAIL_FROM",
    level: "recommended",
    scope: "server",
  },
  {
    description: "Name of the future notification provider, such as OneSignal.",
    key: "NOTIFICATION_PROVIDER",
    level: "later",
    scope: "server",
  },
];

export const productionChecklistSections: ProductionChecklistSection[] = [
  {
    title: "Environment and secrets",
    items: [
      {
        detail:
          "Set all required environment variables in Vercel and keep server-only keys out of browser code.",
        label: "Production environment variables are complete",
        level: "required",
      },
      {
        detail:
          "Use the live website URL for NEXT_PUBLIC_APP_URL before creating live Stripe redirects.",
        label: "Production app URL is correct",
        level: "required",
      },
      {
        detail:
          "Confirm .env.local is not committed to GitHub and real keys are only stored in deployment settings.",
        label: "Private keys are not in GitHub",
        level: "required",
      },
    ],
  },
  {
    title: "Supabase and security",
    items: [
      {
        detail:
          "Run every phase SQL file in order and confirm row level security remains enabled on member tables.",
        label: "Supabase schema and RLS policies are installed",
        level: "required",
      },
      {
        detail:
          "Confirm users can only edit their own profiles and content unless they are admins.",
        label: "Member permission checks are tested",
        level: "required",
      },
      {
        detail:
          "Review admin accounts and remove temporary test admins before launch.",
        label: "Admin access is restricted",
        level: "required",
      },
    ],
  },
  {
    title: "Payments",
    items: [
      {
        detail:
          "Complete Stripe test checkout, portal, and webhook tests before switching to live mode.",
        label: "Stripe test mode works end to end",
        level: "required",
      },
      {
        detail:
          "Create live products and price IDs only after the final packages and terms are approved.",
        label: "Live Stripe plans are approved",
        level: "recommended",
      },
    ],
  },
  {
    title: "Trust, legal, and content",
    items: [
      {
        detail:
          "Have the legal pages reviewed before inviting real users or taking payments.",
        label: "Legal pages are reviewed",
        level: "required",
      },
      {
        detail:
          "Check moderation, reporting, user blocking, and data request processes with real test accounts.",
        label: "Trust and safety flows are tested",
        level: "required",
      },
      {
        detail:
          "Replace placeholder copy, placeholder adverts, and test content before public launch.",
        label: "Placeholder content is removed",
        level: "recommended",
      },
    ],
  },
  {
    title: "Quality and accessibility",
    items: [
      {
        detail:
          "Run lint, TypeScript, and a production build before every production deployment.",
        label: "Code checks pass",
        level: "required",
      },
      {
        detail:
          "Check main workflows on desktop and mobile widths, including sign-up, onboarding, posting, messaging, and billing.",
        label: "Main journeys are tested on mobile and desktop",
        level: "required",
      },
      {
        detail:
          "Check keyboard navigation, visible focus styles, readable colour contrast, and useful form labels.",
        label: "Accessibility smoke test is complete",
        level: "recommended",
      },
    ],
  },
  {
    title: "Deployment",
    items: [
      {
        detail:
          "Connect GitHub to Vercel, add environment variables, deploy a preview, and run a smoke test.",
        label: "Vercel preview deployment is tested",
        level: "required",
      },
      {
        detail:
          "Set the production domain, update DNS, and confirm sitemap and robots.txt use the live URL.",
        label: "Domain and SEO files are ready",
        level: "recommended",
      },
    ],
  },
];
