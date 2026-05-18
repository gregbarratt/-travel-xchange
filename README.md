# Travel Xchange

Travel Xchange is a professional community platform for the travel industry.
It will be built phase by phase so each part can be tested, saved, and pushed
to GitHub before the next phase begins.

## Current status

Phase 11 adds basic member messaging and notifications. Payments and full admin
features are still intentionally reserved for later phases.

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
13. Copy `.env.example` to `.env.local`.
14. Add your Supabase project URL and anon key to `.env.local`.
15. Restart the local app.

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
