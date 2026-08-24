# Stack and hosting recommendation

**Status: PROPOSED — awaiting Greg's approval.** Nothing is built on this yet.

## The recommendation in one paragraph

Build the service in **TypeScript** as a single **Next.js** application
(API endpoints plus the admin screens in one deployable app), hosted on
**Vercel** as its own project, with its own **Supabase** project in the
**London region** providing the database, the isolation rules, and logins for
agents and head office. External uptime monitoring and phone alerts via
**Better Stack** (free tier), watching the service from outside so it can
still alert when the whole service is down. The client package is generated
from the service's OpenAPI contract.

## The main reason: you already run this exact stack

The strongest predictor of whether a non-developer can keep a system alive is
whether they already operate its dashboards. For Travel Xchange you have
already, yourself:

- run SQL migrations in the Supabase SQL editor, phase after phase;
- set environment variables and deployed through Vercel;
- configured Stripe webhooks and domain settings;
- managed users and auth settings in Supabase.

Those are precisely the operations this system needs from its owner. Choosing
a technically prettier stack on a third platform (see alternatives below)
would mean learning a new dashboard, a new billing account, and a new failure
vocabulary — paid for in exactly the self-sufficiency this project exists to
protect. Same family, **separate accounts/projects**, is the sweet spot.

## What each piece is for, in plain English

| Piece | Job | Why this one |
|---|---|---|
| TypeScript | One language everywhere: service, admin, client package | The language AI agents and UK contractors know best; typed end-to-end so contract breaks are caught at build time |
| Next.js (one app) | The API under `/api/v1/...` and the admin area under `/admin` | One thing to deploy, one place to look; same framework as Travel Xchange |
| Hono + Zod inside the API | Every endpoint declares its exact input/output shape once; that one declaration validates every request, generates the OpenAPI contract, and generates the client package | Single source of truth — the documentation cannot drift from reality, which is architecture requirement 5 |
| Supabase (new project, London) | Postgres database, row-level security for the two-axis isolation, logins for agents and admins (with two-factor), daily backups | Data stays in the UK; RLS is the "isolation enforced below application code" requirement; you already drive this dashboard |
| Vercel (new project) | Hosting, deploys from GitHub, encrypted environment settings (where the vault master key and Felloh keys live), scheduled jobs (cron) | Push to GitHub → deployed; rollback is a button; no server to patch — there is no operating system for you to maintain |
| Better Stack | Pings the service's per-supplier health endpoints every minute from outside; phone push alert when one is genuinely down; doubles as the status page | Free tier covers this; being external, it still works when our whole service is down — an internal status page cannot report its own death |
| Felloh sandbox | Practice payments | Self-service — no waiting on anyone |

## The one honest technical compromise

This workload would classically be built as an "always-on" server, because it
does slow things (a cruise search can take 30+ seconds) and background things
(retry queues, refreshing supplier login tokens before they expire, health
checks). Vercel instead runs code on demand.

- Slow supplier calls: fine — function time limits are configurable well past
  the slowest cruise search.
- Background work: there is no permanently running worker, so recurring jobs
  (token refresh, retry sweeps, health checks) run as **scheduled jobs every
  minute** working through a jobs table in the database. At this business's
  volume that is indistinguishable from a real worker.

**What would force a change later:** sustained heavy search volume or a need
for second-by-second background processing. The escape route is contained:
move only the worker part to an always-on host (e.g. Railway, ~£15/month) —
the database, the API contract, and the client package don't change. This is
a documented, bounded risk, not a rewrite risk.

## Alternatives considered, with cost / maintenance / risk

| Option | Cost | Maintenance for you | Risk | Verdict |
|---|---|---|---|---|
| **Recommended:** Next.js + Vercel + Supabase (new projects) | ~£45/month all-in | Dashboards you already know | Serverless compromise above | **Proposed** |
| Always-on Node service (Fastify) on Railway/Render + managed Postgres | ~£25–50/month | A third platform to learn and bill | Technically cleanest for this workload; self-sufficiency cost is real | Runner-up; becomes the worker host later if ever needed |
| AWS / GCP directly | Variable, opaque | High — real infrastructure knowledge required | You'd depend on a developer for routine operations | Rejected |
| Inside Travel Xchange's existing Vercel + Supabase projects | £0 extra | Familiar | **Unacceptable blast radius**: community-platform bugs and credentials vault sharing one database and one set of keys; one compromised key would expose both systems | Rejected firmly |

## Where the code lives — a decision Greg must make

**Recommendation: a new, dedicated repository.** Reasons, plainly:

1. **Blast radius.** Anyone (person, tool, or AI agent) with access to the
   repo can read all of it. The credential-vault service should not share a
   repo with a community platform.
2. **Clarity for the future.** In six months a fresh agent opens the repo
   cold. It should find one product, not two interleaved ones. (This repo's
   README currently — correctly — describes a social platform.)
3. **The relationship is consumer, not sibling.** Travel Xchange may one day
   *install the client package* and become one of the registered sites. Sites
   don't contain the service.

If Greg prefers to keep it in this repository anyway, it works — a
`supplier-layer/` folder deployed as its own Vercel project — but the two
costs above are permanent. Phase 0's documents live here for now either way;
they move if a new repo is created.

## Running costs (rough, monthly, to be checked against current pricing)

| Item | Cost |
|---|---|
| Vercel Pro | ~$20 (~£16) |
| Supabase Pro (daily backups, no project pausing) | ~$25 (~£20) |
| Better Stack | £0 (free tier) |
| Off-site backup storage (second copy of nightly dumps) | ~£1 |
| **Total** | **~£40–50/month** |
| One-off: independent security review at two gates | ~£1,500–£4,000 per gate |

Point-in-time recovery (restoring the database to any minute, not just last
night) is a paid Supabase add-on (~$100+/month). Start without it; the nightly
dump plus each supplier's and Felloh's own records make bookings
reconstructible. Revisit when volume justifies it.

## Data residency

The Supabase project is created in the **London region**, so booking and
passenger data rests in the UK, which keeps UK GDPR simple. Vercel and
Supabase both offer standard data-processing agreements accepted as part of
their terms.
