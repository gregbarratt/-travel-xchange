# Automated trade news ingestion (Phase 31)

Travel Xchange ingests travel-industry news from publisher feeds on a schedule,
classifies it, and delivers it to members based on the topics they follow.

This document is the reference for how that works, what has to be configured
before it produces anything, and what is deliberately left switched off.

## The short version

- Ingestion is **server-side and scheduled**. Members read news from our own
  database and never wait for a remote publisher.
- Every publisher ships **disabled, with no feed URL**. A feed endpoint is a
  fact about a publisher, not something to guess, so a Super Admin verifies one
  with a live fetch before a source can be switched on.
- Travel Xchange **links to the publisher and does not republish them**. A news
  post holds a headline, a short extract, attribution and a canonical link.
- Anything touching collapse, safety, legal risk or regulation **always waits
  for a moderator**, whatever the source settings say.

## Pipeline

```
Vercel Cron (*/15)
  └─ POST /api/news/ingest          claims the single run slot, or exits
       └─ for each enabled + due source
            ├─ conditional GET      ETag / If-Modified-Since, timeout, size cap
            ├─ parse                RSS 2.0 / RSS 1.0 / Atom / JSON Feed
            ├─ deduplicate          feed GUID → canonical URL → title fingerprint
            ├─ classify             deterministic rules, multi-topic, confidence
            ├─ summarise            publisher extract, bounded; never invented
            └─ publish or queue     auto-publish, or hold for moderation
```

One failing publisher never fails the run. Each source is wrapped, its outcome
recorded in `news_ingestion_source_runs`, and its health updated independently.

## Files

| Area | Path |
| --- | --- |
| Migration | `supabase/phase-31-news-ingestion.sql` |
| Local verification shim | `supabase/testing/local-shim.sql` |
| Safe XML reader | `src/lib/news/xml.ts` |
| Feed parser | `src/lib/news/feed-parser.ts` |
| URL canonicalisation + egress safety | `src/lib/news/url.ts` |
| HTTP transport | `src/lib/news/fetch-feed.ts` |
| Text sanitisation | `src/lib/news/sanitize.ts` |
| Classification + moderation policy | `src/lib/news/classify.ts` |
| Copyright-safe summaries | `src/lib/news/summarise.ts` |
| Run orchestration | `src/lib/news/ingest.ts` |
| Storage boundary | `src/lib/news/types.ts`, `src/lib/news/store.ts` |
| Personalised delivery | `src/lib/news/feed-query.ts` |
| Authorisation | `src/lib/news/admin-auth.ts` |

## Routes

| Route | Method | Who |
| --- | --- | --- |
| `/api/news/ingest` | GET, POST | Cron secret, or admin / super admin |
| `/api/news/feed` | GET | Signed-in member |
| `/api/news/follows` | GET, PUT | Signed-in member (own follows only) |
| `/api/admin/news/sources` | GET, POST | Admin / super admin |
| `/api/admin/news/sources/[sourceId]` | PATCH, DELETE | Admin / super admin |
| `/api/admin/news/sources/[sourceId]/test` | POST | Admin / super admin |
| `/api/admin/news/moderation` | GET, POST | Moderator / admin / super admin |

Pages: `/news/latest` (members), `/admin/news-sources` (platform admins). A
compact rail appears on the dashboard feed and on `/news`, so trade news is part
of Travel Xchange rather than a separate microsite.

## Database

`supabase/phase-31-news-ingestion.sql` is additive and idempotent. Run it after
Phase 7.

| Table | Holds |
| --- | --- |
| `news_sources` | Publisher configuration, feed URL, validators, health |
| `news_items` | Raw normalised item as captured from a feed |
| `news_posts` | The Travel Xchange publication of an item |
| `news_topics` | Topic taxonomy |
| `news_post_topics` | Classification, with confidence and how it was assigned |
| `user_topic_follows` / `user_source_follows` | Member personalisation |
| `news_moderation_events` | Audit trail of every moderation decision |
| `news_click_events` | Engagement |
| `news_ingestion_runs` | One row per scheduled run |
| `news_ingestion_source_runs` | Per-source outcome inside a run |

Display fields are denormalised onto `news_posts`, so the member reading path
never touches `news_items` and row level security stays simple.

### Deduplication

Three layers, in order:

1. **Feed GUID** — unique per source (`news_items_source_guid_idx`), used only
   when the publisher does not mark it as a permalink.
2. **Canonical URL** — unique per source (`news_items_source_canonical_idx`).
   URLs are lower-cased, stripped of tracking parameters (`utm_*`, `fbclid`,
   `gclid`, and others), sorted, de-fragmented and de-trailing-slashed first, so
   the newsletter and RSS forms of one story collapse to the same key.
3. **Title fingerprint** — the same headline from a second publisher within 48
   hours is treated as syndication. The record is kept for provenance with
   `duplicate_of_item_id` set, but no second card is published. Outside that
   window it is treated as separate editorial coverage and kept.

### Row level security

- Members read `news_posts` only where `status = 'published'`.
- `news_items` is admin-only: raw publisher metadata never reaches a member.
- Source management requires `admin` or `super_admin` (`is_news_source_admin()`).
- Moderation requires `moderator`, `admin` or `super_admin` (`is_admin_user()`).
- A member can only read and write their own follows.

`news_sources_enabled_requires_feed` makes it impossible to enable a source with
no feed URL, at the database rather than only in the UI.

### Idempotency

`news_ingestion_runs_single_active_idx` is a partial unique index allowing one
row with `status = 'running'`. A second concurrent cron invocation fails to
claim the slot and exits without contacting a single publisher. A run still
marked `running` after 10 minutes is treated as abandoned and released.

## Security

Feeds are untrusted third-party input, and the worker follows URLs a person
configured. Both are handled explicitly:

- **XXE and entity expansion** — a `<!DOCTYPE>` declaration is rejected outright,
  so no entity can be declared. Only the five predefined entities and numeric
  character references resolve.
- **Parser exhaustion** — parsing is iterative over an explicit stack; depth and
  node count are bounded.
- **XSS** — nothing from a feed is stored as HTML. Descriptions are reduced to
  plain text before storage, so `<script>`, event handlers and `javascript:`
  URLs cannot survive as markup.
- **Poisoned images** — an image URL is kept only if it is absolute http/https.
- **SSRF** — non-http(s) schemes, embedded credentials, private, loopback,
  link-local (including `169.254.169.254`), CGNAT and reserved addresses are
  refused. Hostnames are resolved and every resolved address re-checked, which
  catches a public hostname pointing at a private address. Redirects are
  followed by hand and every hop re-validated.
- **Resource limits** — 15s timeout, 5 MB cap enforced while streaming, at most
  3 redirects, retries only on genuinely transient failures.

## Copyright

`buildArticleSummary` stores at most 220 characters of publisher teaser, cut at
a sentence boundary, and stores nothing at all when the feed carries no usable
description — in which case the card shows the headline, the source and the
link. Full article bodies are never stored. Feed images are only used when the
URL is safe; source branding and topic treatment are the fallback.

## Configuration

### Environment variables

| Name | Purpose |
| --- | --- |
| `NEWS_INGESTION_CRON_SECRET` | Shared secret for the scheduled ingestion endpoint. Falls back to `CRON_SECRET`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Already required. Ingestion writes with the service role; it is server-only. |

If neither secret is set, the ingestion endpoint is still reachable only by a
signed-in platform admin — the cron path simply will not authenticate.

### Schedule

`vercel.json` runs `/api/news/ingest` every 15 minutes. Per-source
`polling_interval_minutes` is honoured inside the run, so a publisher asking for
hourly polling gets hourly polling regardless of the cron cadence.

## Enabling a source

1. Open `/admin/news-sources`.
2. Find the publisher's real feed endpoint and confirm their terms permit this
   use. Record anything relevant in **Rights notes**.
3. Paste the endpoint and press **Test source**. This performs a live fetch and
   parse and shows exactly what Travel Xchange would publish — headline, extract,
   topics and whether the story would hold for moderation.
4. If it looks right, press **Test and save**, then **Enable**.
5. Leave **Moderated** on until the source has proved itself. Switch on
   **Allow auto-publish** only for a trusted publisher.

A source that starts failing shows its consecutive failure count and last error,
moves through `warning` to `failing`, and can be switched off from this screen
without a deploy.

## Testing

```
npm test          # 98 tests
npx tsc --noEmit
npx eslint
npm run build
```

The row level security suite (`tests/news-rls.test.mts`) runs against a real
PostgreSQL instance and **skips** when none is reachable, so it never becomes a
false failure. To run it:

```
createdb travel_xchange_verify
psql -d travel_xchange_verify -f supabase/testing/local-shim.sql
psql -d travel_xchange_verify -f supabase/phase-31-news-ingestion.sql
TX_VERIFY_DATABASE_URL=postgres://postgres@127.0.0.1:5432/travel_xchange_verify npm test
```

The shim recreates the parts of Supabase the migrations depend on — the `auth`
schema, `auth.uid()`, `auth.role()`, the `anon` / `authenticated` /
`service_role` roles and their grants — so policies are what actually decides
access during verification.

## Known limitations

- **No source is enabled.** All 15 seeded publishers ship disabled with a null
  feed URL. Feed endpoints could not be verified from the build environment
  (outbound access to publisher domains is blocked there), and inventing one
  would have been worse than leaving it empty. The admin **Test source** flow
  exists to do this verification for real, from a deployment that has egress.
- **Classification is rule-based.** The rules are cheap, auditable and stable.
  If recall becomes the limiting factor, the confidence field is already stored
  and a model could augment — not replace — the rules.
- **Supplier matching is name-based**, against active companies. It is an
  enrichment, and a failure to match never blocks ingestion.
