# Supplier access requirements — exactly what is needed before adapters are built

The rule this document serves: **no supplier's schema is ever assumed.** No
adapter is built until the real documentation and a sandbox for that supplier
are in hand. Below: what public research (August 2026) found for each
supplier, exactly what Greg needs to obtain, and the questions to put to each
account manager.

A note on why sandboxes matter so much here: the project rule is that tests
are written against **recorded real responses** — we call the sandbox, record
what actually comes back, and the tests hold the system to that reality
forever. No sandbox, no recordings, no adapter.

---

## Traveltek (cruise)

**What research found.** Traveltek markets a modern REST/JSON Cruise API and
also has a GraphQL product called **Cruise Connect** with a public schema
reference at `schema.cruiseconnect.traveltek.net`. Their older, long-serving
product is **FusionAPI** (XML-based). Which one a customer gets depends on
their contract. Full documentation access is provided through their team, not
publicly.

**Greg needs to obtain:**
1. Confirmation from the account manager of **which API product our contract
   includes** (FusionAPI, Cruise API, or Cruise Connect) — this single answer
   shapes the adapter.
2. Full API reference access for that product, covering: searching sailings,
   live availability and cabin pricing for a sailing, holding/booking,
   cancelling, and retrieving a booking.
3. **Sandbox / test agency credentials**, and how credentials work per agency
   or per user (this feeds the house-vs-per-agent question).
4. The list of cruise lines enabled on our account.
5. Rate limits (how many calls per minute we're allowed) and a named
   technical support contact.

---

## Travelgenix (flights + hotel bedbanks)

**What research found.** Travelgenix (Bournemouth, UK) offers an API that can
be used "with their widgets or completely standalone", but the documentation
is **not public** — their own help site says to contact them for API access.

**Greg needs to obtain:**
1. Confirmation that our contract includes **standalone API access** (not
   only the white-label website product).
2. The full API documentation: flight search/book/cancel/retrieve, hotel
   search/book/cancel/retrieve, and how multi-part trips are represented.
3. **Sandbox credentials.**
4. The list of flight sources and hotel bedbanks enabled on our account —
   "Travelgenix" is really several suppliers behind one door, and we should
   know which.
5. How authentication works (keys, tokens, expiry), rate limits, and a named
   technical contact.

---

## XS2Event (sports and event tickets)

**What research found.** Documentation is **fully public** at
`https://docs.xs2event.com/` — REST, JSON, an API key sent as a header, with
resources for tournaments, venues, events, categories, and tickets, plus
e-ticket delivery. An API key comes from the account manager.

**Greg needs to obtain:**
1. An **API key** from our XS2Event account manager, and confirmation of
   whether they issue a separate test key / test environment.
2. Confirmation of how cancellations and refunds work through the API, and
   any ordering rules (e.g. ticket status meanings) the docs leave to the
   account team.
3. Rate limits and a named technical contact.

---

## Felloh (payments)

**What research found.** The best-prepared of the four. Documentation is
fully public at `https://developers.felloh.com/`, and the **sandbox is
self-service** at `https://sandbox.felloh.com` — anyone can create a sandbox
account, generate developer keys, and simulate payments with test card
numbers. No waiting on anyone. Authentication works by exchanging a
public/private key pair for **short-lived tokens** — which confirms the
service must do automatic token refresh (already a requirement). Capabilities
cover payment links (hosted page — the mode that keeps card data entirely off
our systems), embedded ecommerce, open banking, transactions with refunds,
scheduled payments, and webhooks. Felloh's model is booking-centric: payments
hang off a booking reference, which fits this design exactly.

**Greg needs to obtain (needed by Phase 4, not now):**
1. Production organisation access and confirmation of which features are
   enabled on our account: payment links, open banking, instalments/scheduled
   payments, trust account handling.
2. Felloh's PCI compliance documentation, to finalise the SAQ A confirmation.

---

## The Felloh ↔ Travelgenix native connection — what the check found

Greg asked whether Felloh's existing native Travelgenix connection already
covers part of this, so we don't rebuild what exists. Finding:

**The integration is real.** Felloh publicly lists Travelgenix among its
booking-system integrations, and describes it as: payments taken via Felloh
are automatically receipted against the matching booking inside the connected
system — no manual matching.

**What this means for us, honestly:**
- It does **not** replace our Felloh adapter. Cruise (Traveltek) and events
  (XS2Event) bookings still need payments, and our layer mints the booking
  reference that both sides hang off. The payment lane gets built regardless.
- It **might already cover** payment receipting for bookings that exist
  inside Travelgenix's own system — and it creates one risk worth resolving
  before Phase 4: if our layer books via the Travelgenix API *and* takes
  payment via our Felloh integration, could the native connection *also* try
  to receipt that payment against the Travelgenix booking, producing double
  receipting or confused references?

**Questions for the Felloh (and/or Travelgenix) account managers:**
1. Is the native Travelgenix connection enabled on our Felloh organisation?
2. Does it act on bookings created through the Travelgenix **API**, or only
   bookings made through Travelgenix's own hosted checkout?
3. If we create Felloh payments ourselves, referenced to our own booking
   reference, does the native connection interfere or duplicate anything?
4. Can it be switched off per channel if it conflicts?

No design decision is taken on this until those answers arrive.

---

## What unblocks what

| Phase | Needs |
|---|---|
| Phase 1 (skeleton, fake adapter) | Nothing from any supplier — deliberately |
| Phase 2 (first real adapter) | That one supplier's docs + sandbox |
| Phase 4 (Felloh) | Sandbox is self-service now; production org details later |
| Phase 6 (remaining adapters) | Each supplier's docs + sandbox |
