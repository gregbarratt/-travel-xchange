# Phase 20 Deployment Guide

This guide is the first live deployment plan for Travel Xchange.

Phase 20 does not put real secrets in GitHub. Keep Supabase, Stripe, and email
keys in `.env.local` locally and in Vercel Project Settings for deployment.

## 1. Prepare GitHub

1. Confirm the latest code is pushed to GitHub.
2. Confirm the production branch is `main`.
3. Do not commit `.env.local`.

## 2. Create the Vercel project

1. Go to Vercel.
2. Choose New Project.
3. Connect GitHub if it is not already connected.
4. Import the Travel Xchange repository.
5. Keep the default Next.js build settings unless Vercel shows a warning.
6. Add environment variables before the production deployment when possible.

Vercel can also deploy from the command line with `vercel`, and production can
be deployed with `vercel --prod`, but the dashboard flow is simpler for a first
launch.

## 3. Add Vercel environment variables

Add these in Vercel Project Settings, under Environment Variables:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_PREMIUM_PROFESSIONAL`
- `STRIPE_PRICE_SUPPLIER_BASIC`
- `STRIPE_PRICE_SUPPLIER_PRO`
- `STRIPE_PRICE_RECRUITER`
- `STRIPE_PRICE_ADVERTISER`
- `EMAIL_FROM`
- `NOTIFICATION_PROVIDER`

For the first preview, `NEXT_PUBLIC_APP_URL` can use the Vercel preview URL.
Before real launch, change it to the final production domain.

## 4. Set up Supabase production settings

1. Open the production Supabase project.
2. Run all phase SQL files in order if this is a fresh production database.
3. Open Authentication settings.
4. Set Site URL to the live Travel Xchange URL.
5. Add redirect URLs:
   - `http://localhost:3000/**`
   - The Vercel preview URL pattern
   - The final production domain
6. Confirm Row Level Security remains enabled.
7. Confirm the owner account has the correct admin or super admin role.

## 5. Set up Stripe production webhooks

1. Deploy the app first so there is a live URL.
2. In Stripe, create a webhook endpoint:
   - `https://your-live-domain.com/api/stripe/webhook`
3. Listen for the events already listed in the README.
4. Copy the Stripe webhook signing secret into Vercel as
   `STRIPE_WEBHOOK_SECRET`.
5. Redeploy after saving the secret.

## 6. Add the custom domain

1. Open the Vercel project.
2. Go to Settings, then Domains.
3. Add the chosen domain.
4. Follow Vercel's DNS instructions.
5. After the domain works, update:
   - `NEXT_PUBLIC_APP_URL` in Vercel
   - Supabase Site URL and redirect URLs
   - Stripe webhook endpoint

## 7. Final smoke test

Use `docs/deployment/final-smoke-test.md` after every deployment.

## Official references

- Vercel getting started: https://vercel.com/docs/getting-started-with-vercel
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel custom domains: https://vercel.com/docs/domains/working-with-domains/add-a-domain
- Vercel deploy CLI: https://vercel.com/docs/cli/deploy
- Supabase redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
