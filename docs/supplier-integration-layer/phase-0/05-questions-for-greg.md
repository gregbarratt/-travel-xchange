# Phase 0 — every open question in one place

Nothing gets built until the **Decisions** section below is answered. The
**Requests** section can run in parallel — most items are emails to account
managers with lead times outside our control, so starting them early matters.

## Do today (independent of this project)

- [ ] **Rotate the exposed Supabase service-role key** for project
  `hgrycpubsmopnydgvnbn` (the `uat-qmt.digiappx.com` system). It was
  committed to this Git repository in a notes file and must be treated as
  leaked. Whoever owns that Supabase project rotates it in: Supabase
  dashboard → Project Settings → API. I have redacted the file, but Git
  history retains old versions — rotation is the only real fix.

## Decisions needed from Greg

1. **Repository.** New dedicated repository for the supplier layer
   (recommended — reasons in `02-stack-recommendation.md`), or build inside
   this Travel Xchange repo? If new: create it and grant this tool access.

2. **Stack and hosting.** Approve or challenge: TypeScript + Next.js on
   Vercel (own project) + Supabase (own project, London) + Better Stack
   alerts. Full reasoning and costs in `02-stack-recommendation.md`.

3. **House vs. per-agent, for each of the four.** For Traveltek, Travelgenix,
   and XS2Event: do homeworker agents use their own supplier logins, a shared
   house account, or both (e.g. agents their own, house for direct
   bookings)? Where per-agent: does *every* agent hold their own, or a mix?
   For Felloh: assumed **one house organisation** (payments land in the
   business's accounts, agents attributed by data, not by separate Felloh
   logins) — confirm.

4. **Booking reference format.** Recommendation: this service becomes the
   single minter going forward, issuing one central sequence in the existing
   style (e.g. `OTC-` + number). Needed: (a) the format you want minted,
   (b) where the current OTC sequence stands, (c) whether anything else still
   mints references (collision risk), (d) whether direct-sale sites should be
   distinguishable in the reference or only in the data.

5. **Data model.** Review `04-data-model-draft.md`. Specifically:
   (a) multi-component bookings — right for the business? (b) how markup
   actually works today; (c) does the agent profit-split percentage live in
   this system or just the attribution; (d) anything the model gets wrong
   about how you actually trade.

6. **First real adapter (Phase 2).** Which supplier goes first? Sensible
   default: whichever returns sandbox credentials first (XS2Event's docs are
   already public; Traveltek and Travelgenix need account-manager responses).
   Commercial priority may override.

7. **Security review budget.** Two independent review gates
   (~£1,500–£4,000 each): before real agent credentials enter the vault, and
   before live money. Reasoning in `01-honest-risk-assessment.md`. Confirm
   the budget exists in principle, or say no and we discuss what that means.

## Requests to send (account managers)

- **Traveltek**: which API product our contract includes (FusionAPI / Cruise
  API / Cruise Connect); docs access; sandbox credentials; enabled cruise
  lines; rate limits; technical contact. *(Details: `03-supplier-access-requirements.md`.)*
- **Travelgenix**: standalone API confirmation; docs; sandbox; enabled flight
  sources and bedbanks; auth details; technical contact.
- **XS2Event**: API key (test + production); refund/cancellation mechanics;
  rate limits; technical contact.
- **Felloh**: whether the native Travelgenix connection is enabled on our
  organisation; whether it acts on API-created bookings or only their hosted
  checkout; whether it interferes with payments we create against our own
  references. *(Sandbox needs nothing — it's self-service.)*

## What unblocks what

- **Phase 1** (skeleton with fake adapter, both axes proven) needs only
  decisions **1, 2, 4** and the model review **5** — no supplier documents.
- **Phase 2** needs decision **6** plus that supplier's docs and sandbox.
- **Phase 4** needs the Felloh↔Travelgenix answers.
- The security review (**7**) gates real credentials and real money, not
  development.

---

## Update — 25 August 2026, after the estate audit

Full detail in `06-existing-systems-audit.md`. What changed here:

- **Decision 1 (repository): ANSWERED — new dedicated repository** (decision
  record 0002). Now waiting on the practical step: **create the new repo and
  grant this tool access to it** (or tell me the name to request). Phase 1
  cannot scaffold until then.
- **Decision 3 (house vs per-agent)**: still open. For context, everything in
  the estate today runs on house credentials — one RateHawk company key
  behind the gateway, one Traveltek username/sitename, one set of Felloh
  organisation keys. The question is what the *future* model should be for
  homeworker agents, per supplier.
- **Decision 4 (booking reference)**: still open, now informed by the real
  formats found in code (see the reference table in 06) — including a
  namespace collision to resolve: agent IDs from the onboarding portal are
  `OTC-NNNNN`, visually identical to booking references.
- **Decision 6 (first adapter)**: recommendation changed to **RateHawk, by
  extraction from Hotel Pass** — proven code, known sandbox, and it forces
  the canonical model to fit a real integration first.
- **The Traveltek request is refined**: the estate shows the contract is
  **FusionAPI 0.9** (two working clients). The account-manager ask is now
  "sell-side (search / availability / book / cancel) documentation and
  sandbox for FusionAPI 0.9" — not "which product do we have".
- **New questions for Greg:**
  - (a) Confirm **RateHawk is officially the fifth connection** in scope.
  - (b) Confirm the **CRM's historically committed Supabase anon key was
    rotated** (its own `docs/PHASE-0-GATE.md` records the incident; squashed
    history means it can't be verified from the repo).
  - (c) Longer-term and no action now: should **Hotel Pass eventually become
    a consumer site** of the central layer, or keep its direct RateHawk
    integration?
