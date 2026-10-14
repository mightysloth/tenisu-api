---
name: tenisu-nestjs
description: Implement, review or refactor this NestJS tennis API while preserving its REST contracts, calculations and small scope. Use for backend changes, not frontend or unrelated infrastructure.
---

# Review the tennis API

Read the [project conventions](../../../.github/instructions/nestjs.instructions.md) and the owning code before changing behavior.

Compare each proposed change with the exercise: sorted list, lookup by ID, three statistics, player creation and cloud deployment. Explain the concrete defect or simplification it addresses. Retain code that performs necessary validation, authorization or persistence work.

For calculations, use fixtures that distinguish the intended formula from plausible incorrect formulas. For storage, check missing IDs, duplicate writes, concurrent creation and paginated queries. For HTTP, check status codes, request validation and the creation `Location` header.

Prefer native NestJS components and the current SDK. An extra abstraction or dependency must provide a benefit beyond renaming existing operations. Run focused tests, then `npm run check` for the final change.

Use [the pinned sources](../../SOURCES.md) as reference material. Official documentation and the installed package signatures take precedence over community examples.
