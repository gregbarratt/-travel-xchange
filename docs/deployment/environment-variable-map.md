# Production Environment Variable Map

These variables are needed for deployment. Do not commit real values to GitHub.

| Variable | Where it is used | Required for launch |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | SEO, sitemap, redirects, Stripe return URLs | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser Supabase client | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser Supabase client | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Stripe and admin operations | Yes |
| `STRIPE_SECRET_KEY` | Stripe checkout and portal routes | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Future client billing widgets | Recommended |
| `STRIPE_PRICE_PREMIUM_PROFESSIONAL` | Premium plan checkout | Yes |
| `STRIPE_PRICE_SUPPLIER_BASIC` | Supplier Basic checkout | Yes |
| `STRIPE_PRICE_SUPPLIER_PRO` | Supplier Pro checkout | Yes |
| `STRIPE_PRICE_RECRUITER` | Recruiter plan checkout | Yes |
| `STRIPE_PRICE_ADVERTISER` | Advertiser plan checkout | Yes |
| `EMAIL_FROM` | Future email sending | Recommended |
| `NOTIFICATION_PROVIDER` | Future push notification setup | Later |

Use Vercel Project Settings for production values. Use `.env.local` only for
local testing.
