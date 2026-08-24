# Honest risk assessment — read before anything is built

Greg asked for a plain answer to one question before any code: *which parts of
this system should not run without a technical person reviewing them, and
which parts can we safely handle ourselves?* This is that answer.

## The blunt version

This system will hold **other people's supplier credentials** and sit next to
**real customer payments**. An AI agent wrote it and a non-developer operates
it. That combination is workable, but only if two specific moments get an
independent human security review. Everything else can be self-run.

**Gate 1 — before any real agent credential enters the vault** (end of
Phase 2). A reviewer checks the credential vault, the login and API-key
system, and the database isolation rules.

**Gate 2 — before real money moves** (end of Phase 4). A reviewer checks the
Felloh integration: payment creation, refunds, webhook verification, and
idempotency.

A review is an independent security engineer for roughly 2–4 days per gate
(ballpark £1,500–£4,000 each at UK contractor rates). I will prepare a focused
checklist for them so the time is spent on the dangerous parts, not on
reading everything. **My honest advice: this is not optional.** Skipping it
means encryption and payment code that no human has ever checked is guarding
other people's logins and money. Until Gate 1 has happened, the system runs
with sandbox and test credentials only.

## What needs review vs. what we self-run

| Part of the system | If it's wrong, what happens | Verdict |
|---|---|---|
| Credential vault (encryption of agents' supplier logins) | Someone else's credentials leak; they can be used to make bookings as that agent | **Review at Gate 1** |
| Site API keys, agent identity, admin login | One site or agent can act as another | **Review at Gate 1** |
| Database isolation rules (RLS) between agents and sites | An agent sees another agent's bookings and commercial data | **Review at Gate 1** |
| Felloh integration: payments, refunds, webhooks | Money charged twice, refunded wrongly, or a forged "payment received" accepted | **Review at Gate 2** |
| Idempotency on book / cancel / pay / refund | Double bookings or double charges under retries | **Review at Gate 2** |
| Backups and tested restore | Booking and payment records lost | Self-run, following a written runbook; reviewer glances at it during Gate 1 |
| Supplier adapters' data mapping | A booking has wrong details — bad, but visible and fixable, not a breach | Self-run, defended by tests against recorded real responses |
| Admin screens, status page, alerting, search plumbing | Inconvenience, not breach | Self-run |
| Routine operations: adding agents, rotating credentials, enabling suppliers, registering sites | Designed to be safe switches in the admin area | Self-run — this is the point of the system |

## PCI DSS position — confirmed in writing, with one honest caveat

**The design targets SAQ A**, the lightest self-assessment level, because all
card-data functions are fully outsourced to Felloh:

- Every card entry happens on a Felloh-hosted payment page or payment link.
- Our service, our database, our admin area, and the client package contain
  **no card fields and never receive, transmit, or store card numbers**. We
  hold only booking references, amounts, statuses, and Felloh's own
  identifiers.
- Refunds are instructions to Felloh referencing their transaction ID — the
  card number never passes through us.

The caveat, stated plainly: I am not a PCI assessor, and the final SAQ level
depends on the exact integration mode chosen in Phase 4. Payment **links and
redirects to Felloh-hosted pages keep us at SAQ A**. Embedding card fields
into our own pages via a JavaScript SDK can shift a business to SAQ A-EP, a
heavier questionnaire. **Recommendation: use links and hosted pages only.**
At Phase 4 we confirm the position against Felloh's own compliance
documentation and record it in the decision log.

## Secrets handling — where secrets live and what happens when things go wrong

- **Where they live.** Service secrets (the vault master key, Felloh API
  keys, database connection) live in the hosting platform's encrypted
  environment settings. Agents' supplier credentials live in the database,
  encrypted, and are readable only by the running service at the moment of
  use. Nothing secret lives in the code, in Git, or on anyone's laptop.
- **Who can see them.** Whoever holds the hosting and database dashboard
  logins — which should be Greg plus at most one other named person, both
  with two-factor authentication switched on. There is no shared admin login
  anywhere in the design.
- **A laptop is lost.** Nothing to lose — no secrets are stored locally.
  Rotate the dashboard passwords as a precaution and sign out other sessions.
- **An agent leaves.** Suspend them in the admin area: their login stops
  working, their stored credentials are deactivated, and their booking
  history and attribution remain intact for the profit-split record. If they
  had access to any shared house account, rotate that supplier password.
- **A site is compromised.** Revoke that one site's API key in the admin
  area. No other site is affected.

## Incident already found during Phase 0 (August 2026)

While reading the repository, I found a **live Supabase service-role key
committed to Git** in a notes file about `uat-qmt.digiappx.com` (project
reference `hgrycpubsmopnydgvnbn`). A service-role key bypasses every row-level
security rule on its project — full read and write on that database. I have
redacted it from the file, but **redaction does not fix it**: Git history
keeps every old version, and anyone who has ever cloned the repository may
have it. The key must be **rotated at the source** (Supabase dashboard →
project settings → API keys) by whoever owns that project. This incident is
recorded here because it is exactly the class of mistake this project's rules
exist to prevent.
