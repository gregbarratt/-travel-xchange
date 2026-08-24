# Central Supplier Integration Layer — start here

## What this project is

One central service that owns every supplier connection for the travel
business. Each website or booking system we run installs a thin **client
package** (a small piece of pre-built code that knows how to talk to the
service) instead of integrating suppliers itself. Add a fifth supplier to the
service later and every site gets it without being touched.

The four connections:

| Supplier | What it provides | Kind |
|---|---|---|
| Traveltek | Cruise (30+ cruise lines behind one API) | Product feed |
| Travelgenix | Flights + multiple hotel bedbanks | Product feed |
| XS2Event | Sports and event tickets | Product feed |
| Felloh | Payments (links, open banking, card, instalments, trust) | Payment rail — its own lane, never searched for products |

Two axes of access run through everything:

- **Sites** (applications): each website is its own registered client with its
  own revocable API key and its own configuration.
- **Agents** (people): homeworker agents with their own identities and their
  own encrypted supplier credentials. Every booking is attributed to the agent
  who made it — profit is split with agents, so attribution is financial data.

**Every booking carries both: which site it came from, and which agent made
it. A booking with a site but no agent is a normal direct booking, not an
error.**

## Current status

**Phase 0 — proposal stage. Nothing has been built.** The documents in
`phase-0/` are awaiting Greg's review and answers. Do not scaffold or write
implementation code until Greg has answered `phase-0/05-questions-for-greg.md`
and approved the stack and data model.

Note: these documents currently live inside the **Travel Xchange** repository
(a separate product — a community platform for the travel industry). One of
the open Phase 0 questions is whether the supplier layer gets its own
repository, which is the recommendation. If that happens, this folder moves
there.

## Read in this order

1. `phase-0/01-honest-risk-assessment.md` — what must be professionally
   reviewed before it runs, PCI position, secrets handling.
2. `phase-0/02-stack-recommendation.md` — proposed stack and hosting, costs,
   alternatives considered.
3. `phase-0/03-supplier-access-requirements.md` — exactly what documentation
   and credentials are needed for each supplier, and what research found.
4. `phase-0/04-data-model-draft.md` — the proposed canonical data model, for
   review before anything is implemented.
5. `phase-0/05-questions-for-greg.md` — every open decision in one place.
6. `decisions/` — the decision record. One short file per significant choice.

## Standing rules — binding on any future agent or developer

These come from the project owner and are not negotiable without asking him.

1. **Never invent or assume a supplier's schema.** If real API documentation
   for an endpoint is not available, stop and ask. A previous system built on
   assumed data shapes corrupted records. Guessing is worse than waiting.
2. **One phase at a time.** Stop at the end of each phase, show what exists,
   and wait for approval.
3. **Products and payments never share an interface.** Product endpoints
   (search, availability, book, cancel, retrieve) and payment endpoints
   (create payment, payment link, refund, status) join on the booking
   reference and nowhere else.
4. **One adapter per supplier; one canonical model in the middle.** No
   supplier field names, types, or error codes leak past the adapter boundary.
   Adapters map into our objects, never the reverse. Do not flatten different
   product types into one shape, and do not quietly widen the canonical model
   to make an awkward supplier fit — raise it instead.
5. **Both axes on every booking.** Site is required; agent is optional
   (direct bookings are normal). Isolation between agents and between sites is
   enforced at the database level, not just in application code.
6. **The booking reference is the spine.** Minted by us, sent to the product
   supplier and to Felloh, with each supplier's own reference stored in a real
   mapping table.
7. **No link to the trust-account reconciliation system without asking Greg
   first.** That system treats the bank CSV as the single source of truth and
   must never receive pushed data from here as truth. At most, a read-only
   endpoint it could one day pull from as a suggestion — and only after asking.
8. **Tests are written against recorded real supplier responses**, captured
   from sandboxes — never invented ones.
9. **Credentials and secrets never appear in code, logs, error messages, API
   responses, or Git.** This rule exists because a real service key was found
   committed to this repository during Phase 0 (August 2026). It has been
   redacted, but Git history remembers — rotation at the source is the only
   real fix.
10. **No card data ever touches this system.** All card entry happens on
    Felloh-hosted pages.

## Glossary (terms used across these documents)

- **Adapter** — the one module that speaks a given supplier's API and
  translates it into our canonical model.
- **Canonical model** — our own definition of a booking, payment, etc., which
  every adapter maps into.
- **Client package** — the generated library a website installs to call this
  service.
- **OpenAPI** — a machine-readable contract listing every endpoint, its
  inputs and outputs. The client package is generated from it, so a breaking
  change fails at build time instead of silently.
- **Sandbox** — a supplier's practice environment: real API, fake bookings,
  no real money.
- **RLS (row-level security)** — rules attached to database tables themselves
  so the database refuses to return rows outside the requester's scope, even
  if application code forgets a filter.
- **Idempotency** — making a repeated request harmless: the same operation
  submitted twice (retry, double-click) produces one booking and one charge,
  with the second attempt returning the stored result of the first.
- **SAQ A** — the lightest PCI DSS self-assessment questionnaire, available
  when all card handling is fully outsourced to a compliant provider.
- **ADR (architecture decision record)** — a short file stating a decision,
  the options considered, and why.
