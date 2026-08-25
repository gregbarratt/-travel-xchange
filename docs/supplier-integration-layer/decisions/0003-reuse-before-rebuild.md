# 0003 — Reuse before rebuild; existing repositories are read-only

**Status: Accepted** — instructed by Greg, 25 August 2026.

## Context

The company's GitHub estate already contains working supplier integrations
and hard-won domain logic: a production RateHawk lifecycle (Hotel Pass),
three Felloh implementations, two Traveltek FusionAPI clients, a credential
vault pattern, a commission engine, and booking-reference normalisation.
Rebuilding these from scratch would waste proven work and re-learn old
lessons. At the same time, every one of those repositories is a live or
working system.

## Decision

1. The central layer is built by **extracting and adapting existing code**
   wherever working code exists (see the audit in
   `phase-0/06-existing-systems-audit.md` for the lift list), and built fresh
   only where nothing exists (Travelgenix, XS2Event, and the Traveltek sell
   side).
2. **No existing repository is ever modified** by this project — no edits, no
   commits, no pushes. Code moves by copy, into the new repository, with a
   provenance note (which repo and file it came from) and tests before use.
3. Where multiple implementations of the same integration exist (Felloh ×3,
   Traveltek ×2), the central layer consolidates them into one adapter,
   merging the lessons of each; the originals are left untouched.

## Consequences

- Phase 2 changes from "first adapter, greenfield" to "first adapter by
  extraction" — RateHawk is the recommended candidate.
- Fixes to known gaps in lifted code (e.g. Hotel Pass's missing supplier
  webhook and failed-prebook trace) are made in the central layer's copy
  only.
- Divergence risk is accepted knowingly: once code is copied, the original
  and the copy can drift apart. The decision record and provenance notes are
  the mitigation, and consolidation into the central layer is the long-term
  answer.
