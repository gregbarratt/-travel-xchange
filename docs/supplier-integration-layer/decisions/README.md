# Decision record

One short file per significant choice: what was decided, what else was
considered, and why. Written for two readers — Greg, and a future agent or
developer picking the repository up cold with no memory of this build.

Rules:

- A decision file is added **when the decision is made**, not reconstructed
  later from memory.
- Status is one of: **Proposed** (awaiting Greg), **Accepted**, **Rejected**,
  or **Superseded by NNNN**.
- Files are numbered in order and never renumbered or deleted. A reversed
  decision gets a new file superseding the old one — the record shows the
  journey, not just the destination.

## Index

| # | Decision | Status |
|---|---|---|
| 0001 | Stack and hosting | Proposed |
| 0002 | The supplier layer gets its own new repository | Accepted |
| 0003 | Reuse before rebuild; existing repositories are read-only | Accepted |
