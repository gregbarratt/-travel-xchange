# Data model — draft for review

**Status: DRAFT.** This is the canonical model proposed as plain
documentation, exactly as the build brief asked: objects, fields, how sites
and agents attach, and how suppliers map on — for Greg to review **before any
line of implementation**. Nothing here is a supplier's schema; these are *our*
objects. Where a supplier's real documentation is needed to finish a mapping,
that is said openly rather than guessed.

After review, the core of this model is frozen. Changing it later is
expensive; adding to it is cheap. That is why it is reviewed now.

---

## The spine: our booking reference

One reference per booking, **minted by this service**, sent to the product
supplier and to Felloh. Everything joins on it: components, passengers,
payments, audit events. Each supplier's own reference is stored against it in
a real table (see BookingComponent and Payment below), because cancellations
and amendments depend on that mapping.

The exact format (e.g. continuing the existing `OTC-` series) is an open
question for Greg — see the questions document. Whatever is chosen must sit
comfortably alongside the formats the reconciliation system already matches:
`OTC-0135`, OTC with no dash, `LM` prefixes, commercial references.

---

## The objects

### Site — a registered application (axis 1)

| Field | What it is |
|---|---|
| id | Internal identifier |
| name | e.g. "Cruise site", "Travel Xchange" |
| status | active / suspended / revoked |
| branding | Name and logo shown where a site appears in payment flows |
| notes | Free text for head office |
| created_at / revoked_at | Timestamps |

### SiteApiKey — a site's key, individually revocable

| Field | What it is |
|---|---|
| id | Internal identifier |
| site_id | Which site it belongs to |
| label | e.g. "production key, rotated Aug 2026" |
| key_fingerprint | We store only a one-way fingerprint of the key — like keeping a photograph of a key's shape rather than the key. The real key is shown once at creation and never again. If it leaks, revoke and mint a new one |
| scopes | What the key may do (e.g. search-only vs. book) |
| status, created_at, revoked_at, last_used_at | Lifecycle; killing one key touches nothing else |

A site may hold two active keys briefly so rotation needs no downtime.

### Agent — a person (axis 2)

| Field | What it is |
|---|---|
| id | Internal identifier |
| display_name, email | Who they are; login handled by the auth system, with two-factor available |
| status | active / suspended / left — suspension is immediate and reversible |
| profit_split_percent | Their share on their bookings. **Open question:** does this number live here, or does finance keep it elsewhere and this system only attribute? |
| joined_at / left_at, notes | Record-keeping |

Suspending or removing an agent never deletes their booking history —
attribution is financial data and survives them leaving.

### AgentSiteLink — which agents may act through which sites

A small but load-bearing table: a row means "agent A is allowed to transact
via site S". A site can therefore only ever act for agents enrolled on it —
a compromised or buggy site cannot impersonate an arbitrary agent. Direct
bookings (no agent) don't use this table at all.

### SupplierAccount — a stored credential (the vault)

| Field | What it is |
|---|---|
| id | Internal identifier |
| supplier | traveltek / travelgenix / xs2event / felloh |
| scope | **house** (shared) or **agent** (personal) |
| agent_id | Set only when scope is agent |
| label | e.g. "Jane's Traveltek login" |
| sealed_credentials | The encrypted blob — see "How credentials are protected" below |
| status | active / disabled |
| last_verified_at | When the service last confirmed the credential works (feeds the status page) |
| rotated_at, created_at | Lifecycle |

Rule: at most one **active** credential per (supplier, agent) and per
(supplier, house account). Which suppliers are house vs. per-agent is
configuration, not code — both are supported from day one.

### Booking — the spine record

| Field | What it is |
|---|---|
| reference | **Our minted reference. The spine.** Unique forever, never reused |
| site_id | **Required.** Which site it came from |
| agent_id | **Optional.** Empty means a direct booking — a normal case. Never invented, never defaulted |
| status | draft → pending → confirmed → amended → cancelled, or failed. "Pending" means sent to a supplier and awaiting outcome |
| lead_passenger_name | Held directly on the booking (the reconciliation system's world is organised around lead passenger + reference + dates) |
| pax_count | Total travellers |
| departure_date / return_date | Return date matters commercially: it drives reclaim eligibility in the trust-account world |
| currency, gross_amount | What the customer pays |
| net_cost | What the supplier charges us; gross minus net is the margin the profit split applies to |
| created_at, updated_at | Timestamps |

### Passenger — who is travelling

One row per traveller on a booking: name, type (adult/child/infant), date of
birth where a supplier requires it. Flights may require passport (APIS)
details — **what exactly must be held will be set by each supplier's real
documentation, not guessed**. Anything sensitive beyond names is stored
encrypted, and passenger data is deleted or anonymised when the retention
period ends (retention rules are a Phase 5 decision with Greg).

### BookingComponent — one product within a booking

A booking holds **one or more components**. A cruise with a pre-cruise hotel,
or a flight-plus-hotel trip, is one booking, one customer, one payment
story — several components. **This is a genuine design decision Greg should
confirm** (see questions): the alternative — one booking per product — looks
simpler but forces gluing trips together by hand later, which is a rewrite,
not an addition.

| Field | What it is |
|---|---|
| id | Internal identifier |
| booking_reference | The spine |
| product_type | cruise / flight / hotel / event |
| supplier | Which adapter owns it |
| supplier_reference | **The supplier's own reference — the mapping the brief demanded live in a real table. It does, here** |
| status | Component-level: booked / cancelled / failed — a hotel can cancel while the cruise stands |
| currency, gross_amount, net_cost | Per-component money, rolling up to the booking |
| start_date / end_date | Component dates; booking departure/return derive from these |
| details | The product-specific block below — one shape per product type, never flattened |

**Product-specific blocks** (our fields; mappings to each supplier confirmed
against real docs before any adapter is built):

- **CruiseDetails**: cruise line, ship, sail date, nights, itinerary name,
  cabin grade, cabin number, fare code.
- **FlightDetails**: a list of segments (carrier, flight number, from, to,
  departure and arrival times), cabin class, fare type, baggage allowance.
- **HotelDetails**: hotel name, board basis, room type, check-in, check-out,
  which bedbank it came from.
- **EventDetails**: event name, venue, event date, ticket category, quantity,
  delivery method (e-ticket etc.).

A cabin grade has no flight equivalent and a fare class has no cruise
equivalent — that is why these are four blocks, not one.

### Payment — Felloh's lane, joined by reference only

| Field | What it is |
|---|---|
| id | Internal identifier |
| booking_reference | **The only join to the product side** |
| felloh_ids | Felloh's identifiers for the link/transaction (exact field names set by their real docs) |
| kind | payment link / card / open banking / instalment plan |
| direction | money in (payment) or out (refund) |
| amount, currency | Never card numbers — there are deliberately no fields to put one in |
| status | Mirrors Felloh's real statuses once confirmed from their docs |
| site_id, agent_id | For branding and attribution of who took payment |
| idempotency_key, created_at, updated_at | Safety and lifecycle |

### IdempotencyRecord — the double-charge guard

Every write (book, cancel, pay, refund) must carry an idempotency key from
the client. Think of it as a till receipt: the first attempt does the work
and files the receipt under that key; any repeat — a retry after a timeout, a
double-click — gets the filed receipt back instead of doing the work again.

| Field | What it is |
|---|---|
| key | Supplied by the caller per operation |
| site_id | Keys are scoped per site so sites can't collide |
| operation | book / cancel / pay / refund |
| request_fingerprint | Detects the same key being reused for a *different* request, which is rejected |
| status | in-flight / completed / failed |
| stored_response | The receipt |
| created_at, expires_at | Old receipts are cleared after a safe window |

### AuditEvent — who did what, immutable

| Field | What it is |
|---|---|
| id, happened_at | Sequence and time |
| actor | site / agent / admin / system, with the specific id |
| site_id, agent_id | Both axes, always recorded where present |
| supplier | Which connection, where relevant |
| action | e.g. booking.create, credential.rotate, site.revoke |
| target | e.g. the booking reference |
| result | success / denied / error, with a readable category |
| request_id, ip | For tracing |
| detail | A safe summary — **never** credentials, tokens, or card data; scrubbing is enforced in one place before anything is written |

Immutability, plainly: the database login the application uses is granted
permission to **add** audit rows and nothing else — it is physically unable
to edit or delete history. Head office reads it; nobody rewrites it.

### Configuration objects

- **SupplierSettings** — per supplier: enabled globally yes/no, timeout,
  retry policy. Changing these is an admin-screen action, not a deploy.
- **SiteSupplier** — per site × supplier: enabled yes/no, markup rule.
- **AgentSupplier** — per agent × supplier: enabled yes/no, so one agent can
  be switched off one supplier without touching anything else.
- **MarkupRule** — deliberately a placeholder: **how pricing/markup actually
  works in the business is an open question for Greg** before this is shaped.
- **SupplierHealthCheck** — one row per check: supplier, time, up/down,
  response time, readable error class. Feeds the status page and alerting;
  trimmed after 30 days.

---

## How the two axes of isolation are enforced (plain English)

Two independent layers, so a bug in one is caught by the other:

1. **The database refuses out-of-scope rows (RLS).** Every request enters the
   system stamped with who is asking — which site, which agent, or which
   admin. Rules attached to the tables themselves filter every query by that
   stamp. A site key only ever sees that site's rows; an agent only ever sees
   their own. If application code forgets a filter, nothing leaks — the
   filter isn't in application code.

2. **Credentials are sealed to their owner.** Each stored credential is
   encrypted with the owner's identity (supplier + house-or-agent + agent id)
   baked into the seal, using authenticated encryption. Unsealing requires
   restating that identity. If a bug ever fetches agent A's credential for
   agent B's request, the seal simply does not open — the wrong-owner
   credential is cryptographically unusable, not just hidden. Unsealing
   happens only inside the adapter at the moment of the supplier call; the
   open credential is never stored, logged, or returned.

Admin access is a third, separate stamp: admins see everything, every admin
action lands in the audit log, and there is no shared admin login.

---

## How each supplier maps on — status, honestly

| Supplier | Maps into | Mapping status |
|---|---|---|
| Traveltek | BookingComponent(product_type=cruise) + CruiseDetails | **Awaiting real docs** — which API product our contract has is not yet confirmed |
| Travelgenix | Components of type flight and/or hotel + their blocks | **Awaiting real docs** — not public |
| XS2Event | BookingComponent(product_type=event) + EventDetails | Public docs exist; field-level mapping written only when the adapter is built, against recordings |
| Felloh | Payment (never a component) | Public docs exist; statuses/ids finalised at Phase 4 against their docs |

No field-level supplier mapping appears in this document on purpose. Each
adapter's mapping is written when that adapter is built, against the
supplier's real documentation and recorded sandbox responses, and each
mapping decision that involves a judgement call gets a line in the decision
record.

---

## Open questions inside this model (also listed in 05-questions-for-greg.md)

1. Multi-component bookings — confirm, or is one-booking-one-product the
   business reality?
2. How does markup/pricing actually work today (flat %, per supplier, per
   site, per product type)?
3. Does profit_split_percent live here or only attribution?
4. Booking reference format.
5. Which suppliers are house accounts vs. per-agent.
6. Data retention periods for bookings, passengers, and the audit log
   (proposal at Phase 5: booking and payment records ~7 years in line with UK
   financial record-keeping; passenger personal data minimised sooner —
   confirmed with Greg before implementation).
