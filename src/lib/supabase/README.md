# Supabase

Phase 16 uses the browser Supabase client for registration, login, onboarding,
the member dashboard, the Xchange Feed, post likes, comments, profile pages,
company pages, supplier pages, groups, group discussions, jobs, applications,
bookmarks, news articles, supplier updates, article tags, categories, and
events, event registrations, training courses, lessons, enrolments, lesson
progress, support questions, answers, support votes, conversations, messages,
notifications, advertisers, ad campaigns, ad creatives, ad placements,
impressions, clicks, subscription status, invoices, reports, moderation
actions, audit logs, verification requests, global search, analytics events,
dashboard metrics, launch waitlist signups, and follow data.

Supplier page role access starts in `supabase/phase-22-supplier-access-phase-1.sql`.
It adds public/private supplier page visibility, baseline page roles, and
permission toggles that page admins can control.

Phase 2 uses `supabase/phase-23-supplier-custom-roles.sql` to add the latest
supplier page sections to the permission catalogue. Custom role create, update,
delete, and permission changes are handled through protected API routes.

The launch waitlist stores public "follow for launch" interest in
`launch_signups`. It does not create Supabase Auth users, so people can register
their interest before public member accounts are switched back on.

Phase 18 does not add Supabase tables. It prepares shared mobile-ready types and
API service helpers so a future Expo app can use the same platform structure.

Phase 16 keeps analytics lightweight inside PostgreSQL. It records starter
events and reads aggregate counts from existing MVP tables so the owner can see
early platform activity without adding a separate analytics warehouse yet.

Phase 15 keeps search inside PostgreSQL using existing tables and trigram
indexes. Algolia or another hosted search service can be added later when the
MVP needs faster ranking, typo tolerance, and richer faceting.

Phase 13 also adds a server Supabase helper for Stripe checkout, billing portal,
and webhook routes. The server helper uses `SUPABASE_SERVICE_ROLE_KEY`, which
must stay in `.env.local` only.

Use `.env.local` for real Supabase keys. Do not commit `.env.local`.
