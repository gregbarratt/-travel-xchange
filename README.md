# Travel Xchange

Travel Xchange is a professional community platform for the travel industry.
It will be built phase by phase so each part can be tested, saved, and pushed
to GitHub before the next phase begins.

## Current status

Phase 5 adds community groups and group discussions. Jobs, news, events,
training, support, messaging, payments, and full admin features are still
intentionally reserved for later phases.

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
7. Copy `.env.example` to `.env.local`.
8. Add your Supabase project URL and anon key to `.env.local`.
9. Restart the local app.

Do not put the service role key in browser code. Keep real keys out of Git.

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
