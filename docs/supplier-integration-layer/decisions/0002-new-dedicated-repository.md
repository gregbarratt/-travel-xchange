# 0002 — The supplier layer gets its own new repository

**Status: Accepted** — decided by Greg, 25 August 2026.

## Context

Phase 0 asked whether the central supplier integration layer should live in a
new repository or inside an existing one (these documents were drafted inside
the Travel Xchange repo). The recommendation was a new repository: a
credential vault should not share a repo, keys, or blast radius with any other
product, and future agents picking the project up cold should find one product
per repository.

## Decision

A **new, completely separate repository** for the supplier layer. Greg
creates it and grants access; these Phase 0 documents migrate there at
Phase 1.

## Consequences

- Phase 1 scaffolding happens only in the new repository.
- No existing repository is modified — confirmed as a standing instruction
  (see decision 0003).
- This documentation branch in Travel Xchange becomes a historical record
  once the move happens.
