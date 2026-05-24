# Travel Xchange

Travel Xchange is a professional community platform for the travel industry.
It will be built phase by phase so each part can be tested, saved, and pushed
to GitHub before the next phase begins.

## Current status

Supplier page access, Phase 2:

- Supplier page admins can create custom page roles.
- Page admins can edit or delete custom roles.
- Page admins can toggle section permissions for baseline and custom roles.
- Supplier role changes are handled through protected API routes, so users
  cannot bypass the screen by calling the app directly.
- Run `supabase/phase-23-supplier-custom-roles.sql` after Phase 1 SQL.

Supplier page access, Phase 1:

- Supplier/company pages now have a database-level `page_visibility` foundation
  for public or private pages.
- Baseline supplier page roles are defined: Page admin, BDM, and Marketer.
- Page admins have full control, while BDM and Marketer permissions start off
  optional and can be toggled by permission.
- Run `supabase/phase-22-supplier-access-phase-1.sql` before using this access
  model in Supabase.

Post-deployment launch hold:

- Public homepage now shows a Travel Xchange "Something new is coming" page.
- Public login, registration, and onboarding are paused while the live site is
  prepared.
- The homepage collects pre-launch interest through a waitlist form without
  activating member accounts.
- Admins can review the waitlist at `/admin/launch-signups`.
- Run `supabase/phase-21-launch-signups.sql` before using the waitlist form on
  the live site.
- Set `NEXT_PUBLIC_PUBLIC_AUTH_ENABLED=true` when public member access should
  reopen.

Phase 20 adds the first deployment guide for Vercel, Supabase production
settings, Stripe webhooks, domain setup, and final smoke testing. The live
deployment still needs to be completed manually in Vercel with the project
owner's accounts and real environment variables.

Built by Phase 20:

- Admin deployment guide page at `/admin/deployment`
- Vercel deployment steps
- Supabase production setup notes
- Stripe webhook setup notes
- Custom domain setup notes
- Final smoke test checklist
- Environment variable map
- Deployment notes in `docs/deployment`
- No Supabase SQL required for this phase

Built by Phase 19:

Phase 19 adds production readiness foundations before deployment. It improves
error handling, loading states, SEO files, security headers, environment review,
and the owner launch checklist.


- Production readiness admin page at `/admin/production-readiness`
- Environment variable review that shows set or missing without exposing values
- Launch checklist for security, Supabase, Stripe, content, accessibility, and
  deployment
- Friendly app error page
- Friendly global error page
- Friendly not-found page
- Root loading skeleton
- Sitemap at `/sitemap.xml`
- Robots file at `/robots.txt`
- SEO metadata base, Open Graph, and Twitter metadata
- Basic production security headers in `next.config.ts`
- Updated `.env.example`
- No Supabase SQL required for this phase

Built by Phase 18:

Phase 18 prepares the project for a future mobile app without building the
mobile app yet. It adds shared definitions, a mobile navigation plan, and a
starter API service layer that can be reused when Expo is introduced later.


- Shared package at `packages/shared`
- Shared role, verification, navigation, and API result definitions
- Mobile preparation folder at `apps/mobile`
- Mobile authentication flow notes
- Example Expo app configuration
- Mobile tab and drawer navigation plan
- API client layer in `src/lib/api`
- No Supabase SQL required for this phase

Built by Phase 17:

Phase 17 adds the first legal and compliance layer for the public MVP. These
pages are starter drafts and should be reviewed by a qualified legal adviser
before a production launch.


- Terms and Conditions at `/legal/terms`
- Privacy Policy at `/legal/privacy`
- Cookie Policy at `/legal/cookies`
- Community Guidelines at `/legal/community-guidelines`
- Acceptable Use Policy at `/legal/acceptable-use`
- Advertiser Terms at `/legal/advertiser-terms`
- Job Posting Terms at `/legal/job-posting-terms`
- Data deletion and privacy request page at `/legal/data-request`
- Cookie consent banner with accept, reject, and manage options
- Legal links in the public footer
- No Supabase SQL required for this phase

Built by Phase 16:

Phase 16 adds the first owner analytics dashboard. More advanced product
analytics, revenue reporting, and warehouse-style reporting are still
intentionally reserved for later phases.

- Admin analytics page at `/admin/analytics`
- Member growth and active-user metric cards
- Popular posts panel using likes and comments
- Jobs, news, training, adverts, and revenue placeholder metrics
- Latest analytics events list
- Safe test event recorder
- Phase 16 Supabase SQL schema in `supabase/phase-16-analytics.sql`
- Database types for `analytics_events` and `dashboard_metrics`

Built by Phase 15:

Phase 15 adds global search and discovery across the MVP areas we have built so
far.

- Search page at `/search`
- Global dashboard search box
- Search category filters for people, companies, suppliers, posts, groups,
  jobs, events, news, training, and questions
- Trending topic shortcuts
- Recommended discovery placeholder cards
- Sidebar Search navigation
- PostgreSQL trigram search indexes in `supabase/phase-15-search.sql`

Built by Phase 14:

Phase 14 adds the first admin dashboard, moderation queues, verification
review, and owner controls.

- Admin dashboard at `/admin`
- User management page at `/admin/users`
- Post moderation page at `/admin/posts`
- Report queue at `/admin/reports`
- Verification review page at `/admin/verification`
- Jobs admin page at `/admin/jobs`
- Articles admin page at `/admin/articles`
- Admin-only navigation visibility
- Audit log and moderation action recording
- Phase 14 Supabase SQL schema in `supabase/phase-14-admin.sql`
- Database types for `reports`, `moderation_actions`, `audit_logs`, and
  `verification_requests`

Built by Phase 13:

Phase 13 adds the first Stripe Billing subscription foundation.

- Pricing page at `/pricing`
- Billing dashboard at `/billing`
- Account subscription page at `/account/subscription`
- Stripe Checkout server route at `/api/stripe/checkout`
- Stripe customer portal server route at `/api/stripe/portal`
- Stripe webhook route at `/api/stripe/webhook`
- Subscription status and premium member badge placeholder
- Invoice record placeholders
- Phase 13 Supabase SQL schema in `supabase/phase-13-payments.sql`
- Database types for `payment_customers`, `subscriptions`, and `invoices`

Built by Phase 12:

- Advert manager page at `/admin/adverts`
- Advertiser creation
- Campaign creation
- Creative creation
- Placement creation
- Reusable ad placement component
- Feed sponsored post placement
- Feed right sidebar advert placement
- Supplier spotlight card placement
- Impression and click tracking tables
- Advertising pricing placeholders for CPM, CPC, fixed monthly sponsorship, and
  manual sponsorship packages
- Phase 12 Supabase SQL schema in `supabase/phase-12-adverts.sql`
- Database types for `advertisers`, `ad_campaigns`, `ad_creatives`,
  `ad_placements`, `ad_impressions`, and `ad_clicks`

Built by Phase 11:

- Messages page at `/messages`
- New conversation form
- Conversation list
- Message thread view
- Send message form
- Notifications page at `/notifications`
- Mark notification as read
- Mark all notifications as read
- Phase 11 Supabase SQL schema in `supabase/phase-11-messaging.sql`
- Database types for `conversations`, `conversation_members`, `messages`, and
  `notifications`

Built by Phase 10:

- Support homepage at `/support`
- Ask a question page at `/support/ask`
- Question detail page at `/support/[id]`
- Answer posting
- Mark best answer flow for the person who asked the question
- Category filters for travel trade support topics
- Search questions
- Question upvotes and answer helpful votes
- Phase 10 Supabase SQL schema in `supabase/phase-10-support.sql`
- Database types for `questions`, `answers`, and `question_votes`

Built by Phase 9:

- Training library page at `/training`
- Course detail page at `/training/[courseId]`
- Lesson page at `/training/[courseId]/lesson/[lessonId]`
- Starter course library seeded through Supabase SQL
- Course categories and level filters
- Course enrolment placeholder
- Lesson progress tracking
- Supplier training module placeholder
- Certificate placeholder
- Phase 9 Supabase SQL schema in `supabase/phase-9-training.sql`
- Database types for `courses`, `lessons`, `course_enrolments`, and
  `lesson_progress`

Built by Phase 8:

- Events listing page at `/events`
- Event detail page at `/events/[id]`
- Create event page at `/events/create`
- Event type and format filters
- Search by title, description, venue, or location
- Event registration placeholder
- Calendar style sidebar placeholder
- Featured event placeholder
- Phase 8 Supabase SQL schema in `supabase/phase-8-events.sql`
- Database types for `events` and `event_registrations`

Built by Phase 7:

- News homepage at `/news`
- Article detail page at `/news/[slug]`
- Create article page at `/news/create`
- Supplier updates page at `/supplier-updates`
- Article categories and type filters
- Tags and trending tag placeholder
- Featured article placement
- CMS-style publishing form for MVP testing
- Phase 7 Supabase SQL schema in `supabase/phase-7-news.sql`
- Database types for `articles`, `article_categories`, and `article_tags`

Built by Phase 6:

- Jobs listing page at `/jobs`
- Job detail page at `/jobs/[id]`
- Post a job page at `/jobs/post`
- Job categories
- Location and remote filters
- Featured job placeholder
- Recruiter/company attribution
- Bookmark job
- Register interest/application placeholder
- Monetisation placeholders for basic, featured, sponsored employer, and
  recruiter subscription packages
- Phase 6 Supabase SQL schema in `supabase/phase-6-jobs.sql`
- Database types for `jobs`, `job_applications`, and `job_bookmarks`

Built by Phase 5:

- Groups directory at `/groups`
- Create group page at `/groups/create`
- Group detail page at `/groups/[id]`
- Join and leave groups
- Group discussion posts
- Group category filters
- Starter example groups such as Cruise Sellers, Luxury Travel, Homeworkers,
  Supplier Updates, and Travel Compliance
- Phase 5 Supabase SQL schema in `supabase/phase-5-groups.sql`
- Database types for `groups`, `group_members`, and `group_posts`

Built by Phase 4:

- Member profile page at `/profile/[id]`
- Edit profile page at `/profile/edit`
- Company profile page at `/companies/[id]`
- Supplier profile page at `/suppliers/[id]`
- Profile experience section
- Profile specialisms section
- Verification badge placeholder
- Profile connect/follow action
- Company follow action
- Phase 4 Supabase SQL schema in `supabase/phase-4-profiles.sql`
- Database types for `profile_experience`, `profile_specialisms`, and
  `company_followers`

Built by Phase 3:

- Logged-in app shell at `/dashboard`
- Left navigation for the future member areas
- Central Xchange Feed
- Right sidebar with advertising, jobs, trending, and follow placeholders
- Create post form
- Post cards
- Like posts
- Comment on posts
- Basic topic filtering
- Follow user data support
- Phase 3 Supabase SQL schema in `supabase/phase-3-feed.sql`
- Database types for `posts`, `comments`, `post_likes`, and `follows`

Built by Phase 2:

- Supabase browser client setup
- Sign up page at `/register`
- Login page at `/login`
- Forgot password placeholder
- Onboarding page at `/onboarding`
- Role selection and starter profile/company form
- Starter dashboard at `/dashboard`, now upgraded by Phase 3
- Phase 2 Supabase SQL schema in `supabase/schema.sql`
- Database types for `profiles`, `companies`, and `user_roles`

## Supabase setup

1. Create a Supabase project.
2. In Supabase, open the SQL editor.
3. Run the SQL from `supabase/schema.sql` for a fresh project.
4. If Phase 2 is already installed, run `supabase/phase-3-feed.sql` to add the
   feed tables.
5. If Phase 3 is already installed, run `supabase/phase-4-profiles.sql` to add
   the profile and company page tables.
6. If Phase 4 is already installed, run `supabase/phase-5-groups.sql` to add
   the groups and discussions tables.
7. If Phase 5 is already installed, run `supabase/phase-6-jobs.sql` to add the
   jobs board tables.
8. If Phase 6 is already installed, run `supabase/phase-7-news.sql` to add the
   news and supplier update tables.
9. If Phase 7 is already installed, run `supabase/phase-8-events.sql` to add
   the events and registrations tables.
10. If Phase 8 is already installed, run `supabase/phase-9-training.sql` to add
    the training academy tables and starter courses.
11. If Phase 9 is already installed, run `supabase/phase-10-support.sql` to add
    the support and Q&A tables.
12. If Phase 10 is already installed, run `supabase/phase-11-messaging.sql` to
    add the messages and notifications tables.
13. If Phase 11 is already installed, run `supabase/phase-12-adverts.sql` to add
    the advertising and sponsorship tables.
14. If Phase 12 is already installed, run `supabase/phase-13-payments.sql` to
    add the Stripe Billing tables.
15. If Phase 13 is already installed, run `supabase/phase-14-admin.sql` to add
    the admin dashboard, moderation, audit, and verification tables.
16. If Phase 14 is already installed, run `supabase/phase-15-search.sql` to add
    PostgreSQL search indexes.
17. If Phase 15 is already installed, run `supabase/phase-16-analytics.sql` to
    add analytics event and dashboard metric tables.
18. Phase 17 has no Supabase SQL. It adds public legal pages and a browser-only
    cookie preference banner.
19. Phase 18 has no Supabase SQL. It prepares shared mobile-ready structure and
    API service helpers.
20. Phase 19 has no Supabase SQL. It adds production readiness checks, SEO
    files, security headers, and fallback pages.
21. Phase 20 has no Supabase SQL. It adds deployment notes and smoke-test
    guidance for Vercel, Supabase, Stripe, and domains.
22. Post-launch waitlist signups use `supabase/phase-21-launch-signups.sql`.
    Run it to store launch interest without creating active user accounts.
23. Copy `.env.example` to `.env.local`.
24. Add your Supabase project URL, anon key, and service role key to
    `.env.local`.
25. Restart the local app.

Do not put the service role key in browser code. Keep real keys out of Git.

## Stripe setup

Phase 13 is designed for Stripe test mode first.

1. Create Stripe Products and recurring monthly Prices for each paid plan.
2. Add the matching Price IDs to `.env.local`:
   - `STRIPE_PRICE_PREMIUM_PROFESSIONAL`
   - `STRIPE_PRICE_SUPPLIER_BASIC`
   - `STRIPE_PRICE_SUPPLIER_PRO`
   - `STRIPE_PRICE_RECRUITER`
   - `STRIPE_PRICE_ADVERTISER`
3. Add `STRIPE_SECRET_KEY` from Stripe test mode.
4. Add `STRIPE_WEBHOOK_SECRET` after creating a webhook endpoint for
   `/api/stripe/webhook`.
5. Listen for these webhook events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `invoice.finalized`

## Phase 1 status

Phase 1 adds the first public brand, layout, and landing page.

Built by Phase 1:

- Public homepage at `/`
- Public header and footer
- Hero section
- Platform feature cards
- Audience section
- Monetisation preview section
- Placeholder pages for `/about`, `/pricing`, and `/contact`

## Phase 0 status

Phase 0 creates the project foundation only. It does not include real product
features yet.

Built in this phase:

- Next.js app with TypeScript
- Tailwind CSS
- shadcn/ui foundation
- Basic public homepage
- Public placeholder routes for `/about`, `/pricing`, and `/contact`
- Starter folders for shared components, future features, Supabase helpers, and
  shared types
- `.env.example` for future private settings

## Main tools

- Node.js runs the app locally.
- Git tracks each phase as a saved checkpoint.
- GitHub stores the project online.
- Vercel will host the web app later.
- Supabase will provide login, database, and storage later.
- Stripe will provide subscriptions and payments later.

## Project folders

- `src/app` contains website routes and pages.
- `src/components` contains reusable interface pieces.
- `src/config` contains shared site and navigation settings.
- `src/features` is reserved for product features added in later phases.
- `src/lib` contains helper code and future service connections.
- `src/types` contains shared TypeScript types.
- `packages/shared` contains mobile-ready shared definitions.
- `apps/mobile` contains the future mobile app preparation notes.
- `public` contains public files such as icons and images.

## Local setup

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

On Windows PowerShell, if `npm` is blocked by script permissions, use:

```bash
npm.cmd run dev
```

## Environment settings

Copy `.env.example` to `.env.local` when real service keys are needed.

Do not commit `.env.local` to GitHub. It is for private keys only.

## GitHub workflow

At the end of every phase:

1. Test the app locally.
2. Fix any errors.
3. Save the phase with Git.
4. Push the phase to GitHub.
5. Start the next phase only after the push is complete.
