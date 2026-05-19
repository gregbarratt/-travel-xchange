export type DeploymentStep = {
  detail: string;
  label: string;
  owner: "Greg" | "Codex" | "Vercel" | "Supabase" | "Stripe";
  status: "manual" | "ready" | "future";
};

export type DeploymentSection = {
  description: string;
  steps: DeploymentStep[];
  title: string;
};

export const deploymentSections: DeploymentSection[] = [
  {
    description:
      "Connect the GitHub repository to Vercel so every push to main can create a new deployment.",
    title: "Vercel project setup",
    steps: [
      {
        detail:
          "Create or sign in to a Vercel account, choose New Project, connect GitHub, and import the Travel Xchange repository.",
        label: "Import GitHub repository",
        owner: "Greg",
        status: "manual",
      },
      {
        detail:
          "Use the default Next.js settings. Vercel should detect the framework automatically.",
        label: "Confirm Next.js build settings",
        owner: "Vercel",
        status: "ready",
      },
      {
        detail:
          "Keep the production branch as main so pushes to main become production deployments.",
        label: "Confirm production branch",
        owner: "Greg",
        status: "manual",
      },
    ],
  },
  {
    description:
      "Add production values in Vercel Project Settings. Do not put real secrets in GitHub.",
    title: "Environment variables",
    steps: [
      {
        detail:
          "Add NEXT_PUBLIC_APP_URL, Supabase keys, Stripe keys, and Stripe price IDs to Vercel for Production and Preview where needed.",
        label: "Copy required environment variables into Vercel",
        owner: "Greg",
        status: "manual",
      },
      {
        detail:
          "Use the live Vercel or custom domain URL for NEXT_PUBLIC_APP_URL before final production testing.",
        label: "Set the live app URL",
        owner: "Greg",
        status: "manual",
      },
      {
        detail:
          "Redeploy after adding or changing environment variables so the app can read them.",
        label: "Redeploy after env changes",
        owner: "Vercel",
        status: "manual",
      },
    ],
  },
  {
    description:
      "Make sure the database and authentication settings match the deployed website.",
    title: "Supabase production setup",
    steps: [
      {
        detail:
          "Run all phase SQL files in order on the production Supabase project if this is a fresh production database.",
        label: "Install production database schema",
        owner: "Supabase",
        status: "manual",
      },
      {
        detail:
          "Set Supabase Auth Site URL to the live domain and add localhost plus Vercel preview URLs to the additional redirect list.",
        label: "Update auth redirect URLs",
        owner: "Supabase",
        status: "manual",
      },
      {
        detail:
          "Create or confirm the owner admin account and keep admin access limited.",
        label: "Confirm owner admin access",
        owner: "Greg",
        status: "manual",
      },
    ],
  },
  {
    description:
      "Stripe must know where to send billing events after the site has a real deployment URL.",
    title: "Stripe production setup",
    steps: [
      {
        detail:
          "Create the production webhook endpoint using the deployed URL plus /api/stripe/webhook.",
        label: "Create Stripe webhook endpoint",
        owner: "Stripe",
        status: "manual",
      },
      {
        detail:
          "Copy the webhook signing secret into Vercel as STRIPE_WEBHOOK_SECRET, then redeploy.",
        label: "Save webhook secret in Vercel",
        owner: "Greg",
        status: "manual",
      },
      {
        detail:
          "Run a test checkout and confirm subscription status updates in the app.",
        label: "Test checkout and billing portal",
        owner: "Greg",
        status: "manual",
      },
    ],
  },
  {
    description:
      "The custom domain can be added after the first Vercel deployment works.",
    title: "Domain setup",
    steps: [
      {
        detail:
          "In Vercel Project Settings, open Domains and add the chosen Travel Xchange domain.",
        label: "Add custom domain",
        owner: "Greg",
        status: "manual",
      },
      {
        detail:
          "Follow Vercel's DNS instructions. Apex domains usually need an A record; subdomains usually need a CNAME.",
        label: "Update DNS records",
        owner: "Greg",
        status: "manual",
      },
      {
        detail:
          "After the domain works, update NEXT_PUBLIC_APP_URL, Supabase redirect URLs, and Stripe webhook URLs to the custom domain.",
        label: "Update services to final domain",
        owner: "Greg",
        status: "manual",
      },
    ],
  },
  {
    description:
      "Use this after every deployment to make sure the live app is healthy.",
    title: "Final smoke test",
    steps: [
      {
        detail:
          "Open the live homepage, login, dashboard, search, profile, messages, admin, pricing, legal pages, sitemap, and robots file.",
        label: "Check main live routes",
        owner: "Greg",
        status: "manual",
      },
      {
        detail:
          "Create a post, comment, group post, job, event, article, support question, and test message if using a safe test account.",
        label: "Check core member actions",
        owner: "Greg",
        status: "manual",
      },
      {
        detail:
          "Check the browser console and Vercel deployment logs for errors.",
        label: "Review live errors",
        owner: "Greg",
        status: "manual",
      },
    ],
  },
];

export const deploymentReferenceLinks = [
  {
    href: "https://vercel.com/docs/getting-started-with-vercel",
    label: "Vercel getting started",
  },
  {
    href: "https://vercel.com/docs/environment-variables",
    label: "Vercel environment variables",
  },
  {
    href: "https://vercel.com/docs/domains/working-with-domains/add-a-domain",
    label: "Vercel custom domains",
  },
  {
    href: "https://supabase.com/docs/guides/auth/redirect-urls",
    label: "Supabase redirect URLs",
  },
  {
    href: "https://vercel.com/docs/cli/deploy",
    label: "Vercel CLI deploy",
  },
];
