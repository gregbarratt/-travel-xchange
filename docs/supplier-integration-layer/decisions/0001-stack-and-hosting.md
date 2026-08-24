# 0001 — Stack and hosting

**Status: Proposed** — awaiting Greg's approval (Phase 0, August 2026).

## Context

The supplier integration layer must be operable by a non-developer: routine
changes are configuration in an admin screen, failures alert a phone, and the
system recovers from normal supplier hiccups by itself. The owner already
successfully operates Next.js + Supabase + Vercel + Stripe for Travel
Xchange — running SQL migrations, setting environment variables, deploying,
and configuring webhooks himself.

## Decision (proposed)

- **TypeScript** everywhere (service, admin, generated client package).
- **One Next.js application**: the API under `/api/v1`, the admin area under
  `/admin`. Inside the API, **Hono + Zod**: each endpoint's input/output
  shape is declared once and that declaration validates requests, generates
  the OpenAPI contract, and generates the client package.
- **Supabase — a new, separate project in the London region**: Postgres,
  row-level security for two-axis isolation, auth for agents and admins,
  daily backups plus our own nightly dump to separate storage.
- **Vercel — a new, separate project**: hosting, deploys from GitHub,
  encrypted environment settings, scheduled jobs for token refresh, retry
  sweeps, and health checks.
- **Better Stack** (external) for per-supplier uptime monitoring, phone
  alerts, and the public status page.
- **A new dedicated repository** (pending Greg's confirmation).

## Alternatives considered

- **Always-on Node service on Railway/Render** — technically the cleanest
  fit for slow supplier calls and background work, but a third platform the
  owner has never operated. Kept as the documented escape route: if volume
  ever demands a permanent worker, only the worker moves; database, API
  contract, and client package stay.
- **AWS/GCP directly** — rejected: operational burden incompatible with
  self-sufficiency.
- **Reusing Travel Xchange's existing Vercel/Supabase projects** — rejected
  firmly: a credential vault must not share a database, keys, or blast
  radius with a community platform.

## Consequences

- The owner operates dashboards he already knows; no new failure vocabulary.
- Running cost ~£40–50/month; no servers to patch.
- Accepted compromise: background work runs as every-minute scheduled sweeps
  rather than a permanent worker — indistinguishable at current volume, with
  a bounded migration path if that changes.
