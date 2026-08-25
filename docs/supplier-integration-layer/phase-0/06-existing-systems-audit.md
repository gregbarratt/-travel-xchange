# Existing systems audit — what we already have, and what we reuse

**Date: 25 August 2026.** Greg's instruction: the supplier layer gets its own new
repository, but it must be built by *utilising what already exists* across the
company's GitHub repositories rather than recreating it — and **no existing
repository may be edited**, because they are live working systems.

**Conduct:** all 12 repositories were cloned read-only and audited. Nothing was
modified, committed, or pushed in any of them. The only repository written to
is this documentation branch. Two repositories turned out to be empty
(`Test-Site-QMT` — the QMT system's code lives with the digiappx developers,
not in this GitHub; and `otc-onboarding` — superseded by `onboardingportal`).

## The headline

Greg is right that a lot already exists — more than the original brief said:

- **RateHawk** (hotel bedbank): a **full, production-proven booking lifecycle**
  runs today inside Hotel Pass — search, hold, book, status, cancel, refunds —
  including a solved answer to RateHawk's IP-allowlisting problem. This is the
  single most valuable reuse asset in the estate.
- **Felloh**: **three separate implementations** already exist (CRM, head
  office reports, trustrec). The endpoints, authentication, webhooks, and fee
  logic are known in-house. The central layer's job is to consolidate three
  into one.
- **Traveltek**: **two working clients** exist, both against **FusionAPI 0.9**
  (XML) — which answers the "which Traveltek product do we have?" question
  from the supplier-access document. What exists is back-office booking
  *retrieval*; the sell side (search, availability, book, cancel) is still to
  be built and needs docs + sandbox for those operations.
- **Travelgenix and XS2Event**: **no API code anywhere** in the estate.
  Genuinely greenfield. (Travelgenix is a live commercial relationship — its
  invoices and payment alerts flow through the email agent — but nothing
  programmatic.)
- The estate also already contains the **credential-vault pattern**, the
  **commission engine**, the **booking-reference normalisation logic**, and a
  set of hard-won matching rules — all reusable, all listed below.

So the fifth supplier connection is real: **RateHawk joins Traveltek,
Travelgenix, XS2Event and Felloh** (pending Greg's formal confirmation, though
his instruction implies it).

## The estate at a glance

| Repository | What it is | Live? | Supplier/payment code | Relevance to the central layer |
|---|---|---|---|---|
| `thehotelpass` | Corporate travel booking SaaS (thehotelpass.com) | **Yes — transacting, Stripe live** | **RateHawk B2B v3, full lifecycle**; Stripe | The crown jewels: the RateHawk adapter is lifted from here |
| `one-travel-group-360-crm` | The future CRM: enquiry → quote → booking → commission | Not deployed (CI only) | **Felloh client (best engineered)**; **Traveltek FusionAPI client**; credential vault; commission engine | Heavy reuse; the layer must stay compatible with its booking/commission model |
| `headofficereports` | Finance reporting & trust reconciliation | Yes — Render, nightly crons | **Felloh sync in production**; **Traveltek client**; reference normaliser | Production knowledge to merge in |
| `trustrec` | Trust-account reconciliation (the system the brief said to respect) | In hands-on use | Read-only Felloh check | Defines reference formats and the only lawful integration seam |
| `otg-booking-check` | Forensic reconciliation workbench (~26k lines) | Yes — Render | File-ingests exports from SinGS/TravelTek, TAPS, RateHawk, Hotelbeds, TBO, TUI, OTAs | Matching wisdom: merchant map, evidence ladder, identity ladder |
| `email-agent` | Mailbox automation (Microsoft Graph + Claude) on a VPS | Yes | Statement sweeps per supplier; reference harvesting | Supplier-communications map; safety architecture |
| `support-desk` | Agent support ticketing | Active dev, not deployed | None (supplier *contacts* CRM only) | Patterns: tenant RLS, job worker, outbox; future consumer |
| `onboardingportal` | Agent onboarding → approval-to-trade | Yes — Render | Stripe (agent membership billing) | **Agent identity source** (`OTC-NNNNN` agent IDs); the natural gate for issuing supplier credentials |
| `-travel-xchange` | Community platform (this repo) | Launch hold | Stripe scaffold | Future consumer site |
| `market-research-test-platform` | Static quote-journey prototype | Parked | None | Contract sketch only |
| `otc-onboarding` / `Test-Site-QMT` | Empty | — | — | None |

## Supplier by supplier: what exists and what we lift

### RateHawk — lift the adapter from Hotel Pass

What runs in production today (`thehotelpass`): destination search, region/map
search, hotel page and live rates, prebook (hold), booking create/finish,
status polling, cancellation with correctly-sized refunds, a 3.4-million-hotel
content catalogue ingest, per-company markup with tamper-proof signed price
tokens, and a credential-injecting relay server that gives the platform a
fixed internet address so RateHawk's IP allowlist can be satisfied from any
hosting. Maturity 4/5 — proven by real bookings.

Portable almost as-is (the audit rated most of these 90–100% portable, with
file-level detail): the transport core
(`src/domains/stays/infrastructure/ratehawk/*` — contracts, config, client,
gateway, errors), the pure mappers and domain logic (view models, occupancy,
cancellation, price-markup, price-token), and the whole relay
(`infra/ratehawk-gateway/*`). Entangled and to be re-implemented behind
interfaces: the booking orchestration (it mixes in Hotel Pass's corporate
approval policy and Stripe), the markup lookup, and the app's route handlers.

Known gaps to fix in the central version: no supplier webhook (status is
polled by 5-minute sweeps), the order-info endpoint is declared but never
implemented, a failed prebook currently leaves no trace row, and the transport
has no automatic retry (recovery is sweep-driven). None of these gaps gets
fixed in the Hotel Pass repo — they get fixed in the central layer's copy.

Open question for Greg (no action now): should Hotel Pass itself one day
become a consumer site of the central layer, or keep its direct integration?
Either answer is fine; extraction is valuable regardless — and Hotel Pass
keeps running untouched throughout.

### Felloh — consolidate three implementations into one

1. **CRM** (`one-travel-group-360-crm/src/lib/integrations/felloh-client.ts`
   and friends): the best-engineered — timeouts, retry with backoff,
   webhook signature verification before parsing, sandbox/production
   credential slots. Knows the real endpoints: token exchange, payment links,
   transactions, refunds, ledger. Never yet run against live keys.
2. **Head office reports** (`backend/app/services/sings_service.py`): the one
   with production mileage — a nightly transaction sync has been running for
   months, with real status classification and actual-vs-estimated fee logic.
3. **trustrec** (`felloh.js`): a deliberately read-only checker.

The central layer's Felloh adapter starts from the CRM's client shape and
folds in head office reports' production status/fee knowledge. A naming note:
"SinGS" is used inconsistently across the estate — in the reconciliation tools
it means the TravelTek back-office's receipt ledger, while head office reports
uses it as a legacy label for its *Felloh* client. The central layer should
retire the name entirely to stop the confusion spreading.

### Traveltek — the product question is answered; the sell side is the gap

Both the CRM and head office reports talk to **FusionAPI 0.9** (XML), with
credentials of the form username + password + sitename, using the
booking-retrieval operations (`getbookings`, portfolio detail). Between them
they know FusionAPI's rate-limit behaviour (error 165; call budgeting per
run). The TravelTek back-office is also the current booking system of record,
whose exports feed the reconciliation tools.

What does not exist anywhere: the **sell-side lifecycle** — cruise search,
availability, book, cancel. The request to the Traveltek account manager is
therefore refined from "which product do we have?" to: **documentation and
sandbox credentials for the sell-side operations of FusionAPI 0.9** (and
whether they'd steer new sell-side work to a newer product, in which case
docs + sandbox for that).

### Travelgenix and XS2Event — greenfield, requests unchanged

No API code anywhere in the estate. The requests in
`03-supplier-access-requirements.md` stand as written.

### Stripe (context only)

Live in Hotel Pass (customer payments) and the onboarding portal (agent
membership billing). Stripe is **not** part of the central layer's payment
lane — Felloh is — but the estate's Stripe work sets the house standard the
Felloh adapter must match: webhook signature verification, an event-dedupe
table, idempotency keys on refunds.

## The booking-reference reality (from code, not memory)

| System | Format(s) in code | Where |
|---|---|---|
| trustrec | Accepts `OTC`/`TTAS`/`LM` + 2–10 digits after stripping all punctuation; collapses zero-padding so `OTC-5056` = `OTC05056`; auto-corrects the `OCT`→`OTC` typo | `server.js:1541,1545,1000,981` |
| otg-booking-check | Strict `OTC-` + 4–6 digits at import; recognises `TTAS`/`OCT`/`OTG`/`LM` and bare numbers elsewhere | `src/csv.js:111`, `src/server.js:1141` |
| headofficereports | Normaliser: legacy 7+-digit refs starting "1" become `OTC1234567` (no hyphen); everything else becomes zero-padded `OTC-NNNNN` | `master_booking_import.py` |
| CRM | `OTC-NNNNNN` (six digits); quotes `OTC-Q…` | fixtures/migrations |
| onboardingportal | **Agent IDs** are `OTC-NNNNN` — people, not bookings, in the same visual namespace | `services/agent_ids.py` |
| Hotel Pass | Its own scheme: `HP-XXXX-YYY` plus an internal UUID per supplier order | `booking-orchestration-service.ts` |

Consequences: (1) the central service ships **one canonicalisation module**,
lifted from trustrec + head office reports, and the client package uses it
everywhere; (2) the minting decision is still Greg's, now better informed —
note the agent-ID vs booking-ref prefix collision to resolve; (3) whatever is
minted must survive trustrec's canonicaliser unchanged.

## Rules the estate already enforces — binding on the central layer

1. **trustrec never accepts booking data as truth.** Its only lawful inbound
   surface is suggestion-only reference uploads (`POST /api/refdata`,
   `/sings`, `/taps`, `/passengers`, `/felloh-history`) plus an export ZIP. If
   a link is ever approved, the central layer produces suggestion files in the
   `refdata` shape it already accepts — nothing else. (Not being built now.)
2. **"A reference agreeing is a candidate, never a match."** The email agent's
   harvesting found 760 of 768 reference-only matches were coincidence.
3. **A missing rate returns "unavailable", never a number.** The CRM's
   commission engine adopted this after an audit found agents being underpaid;
   Hotel Pass's markup resolver has the same property. Our markup and pricing
   lookups behave identically.
4. **Money is integer pence end-to-end** (CRM, Hotel Pass). Head office
   reports' decimals convert at its own boundary.
5. **No return date → money stays in trust.** Enforced independently in
   trustrec and otg-booking-check. `return_date` stays first-class in our
   model.
6. **Fabricated success is the house failure mode to guard against** — the
   CRM's own audit history records endpoints that reported success and did
   nothing. Adapters must never invent success; tests run against recorded
   real responses.
7. **Dangerous capabilities are absent by construction, not switched off** —
   the email agent has no general "send" function at all, only two hard-coded
   narrow paths. The same architecture applies to anything in the central
   layer that moves money or books with suppliers.

## What this changes in the Phase 0 plan

1. **Five supplier connections**, not four (RateHawk added, pending Greg's
   formal nod).
2. **Phase 2's first adapter should be RateHawk, by extraction** — replacing
   the earlier "whichever sandbox arrives first" recommendation. The code is
   proven, the sandbox base URL is already known, and it forces the canonical
   model to fit a real, live integration from day one. XS2Event (public docs)
   becomes the natural second.
3. **The Traveltek ask is refined** (sell-side FusionAPI docs + sandbox — see
   above).
4. **The stack recommendation is reinforced by the estate itself**: Hotel Pass
   runs Supabase + RLS + Next.js with 5-minute cron sweeps against a real
   supplier in production — exactly the pattern proposed in
   `02-stack-recommendation.md`. The CRM's `integration_credentials` ×
   environment vault (secret half in Supabase Vault) is the seed of our
   credential vault, extended with per-agent scope and identity-sealed
   encryption.
5. **A standard adapter contract**, taken from the estate's best practice:
   results are explicit success-or-classified-failure values (never thrown
   surprises), retry only on transport errors/429/5xx and never on a
   well-formed provider refusal, one trace row per supplier call (fixing Hotel
   Pass's failed-prebook blind spot), and signed price tokens wherever a quote
   crosses the client boundary.
6. **Data-model updates** to fold into `04-data-model-draft.md` after Greg's
   review: money in integer pence; a supplier-call trace table (modelled on
   `supplier_booking_attempts`); multi-component bookings validated by
   precedent (`supplier_bookings` in the CRM, per-element payloads in its
   Traveltek client); **commission calculation stays in the CRM** — the layer
   stores faithful gross/net/markup and the agent attribution, and never
   computes splits; the canonical reference module above.
7. **A fixed-egress relay is a required infrastructure piece** (RateHawk
   IP-allowlists partners; others may too). The Hotel Pass relay design is
   reused for the central service.

## Security and hygiene observations — reported, not fixed

Per Greg's instruction nothing was changed anywhere. These are observations
for him to act on (or delegate), listed most-important first:

1. **CRM**: its own gate document (`docs/PHASE-0-GATE.md`) records that a
   hosted Supabase URL + anon key were committed in an earlier commit
   (`.env.local.bak`). History is squashed, so rotation can't be verified from
   the repo. **Confirm that key was rotated.**
2. **otg-booking-check** runs on a public URL protected by a single shared
   4-digit PIN, in front of customer names and financial records — its own
   code comments flag this as inadequate. Worth an upgrade (stronger secret,
   per-user logins, or IP restriction) when convenient.
3. **Personal data inside source code**: real customer names appear in code
   comments in trustrec and otg-booking-check; real staff names are seeded in
   trustrec's source; scratch scripts in email-agent embed customer first
   names and booking refs in filenames; email-agent's config notes a personal
   Gmail address that also receives identity documents. A cleanup pass in
   those repos (by Greg or with his explicit permission) is worthwhile.
4. **headofficereports** runs on one shared super-admin login, no MFA.
5. **thehotelpass repo hygiene**: the README describes the system as far less
   finished than it is (dangerous for anyone assessing it); docs publish the
   gateway server's IP, the RateHawk partner key ID and an SSH key
   fingerprint. The new central repo starts clean of all such.
6. Previously reported and still outstanding: the **digiappx/QMT Supabase
   service-role key** committed in this repo's notes file (see
   `01-honest-risk-assessment.md`).
