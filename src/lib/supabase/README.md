# Supabase

Phase 13 uses the browser Supabase client for registration, login, onboarding,
the member dashboard, the Xchange Feed, post likes, comments, profile pages,
company pages, supplier pages, groups, group discussions, jobs, applications,
bookmarks, news articles, supplier updates, article tags, categories, and
events, event registrations, training courses, lessons, enrolments, lesson
progress, support questions, answers, support votes, conversations, messages,
notifications, advertisers, ad campaigns, ad creatives, ad placements,
impressions, clicks, subscription status, invoices, and follow data.

Phase 13 also adds a server Supabase helper for Stripe checkout, billing portal,
and webhook routes. The server helper uses `SUPABASE_SERVICE_ROLE_KEY`, which
must stay in `.env.local` only.

Use `.env.local` for real Supabase keys. Do not commit `.env.local`.
