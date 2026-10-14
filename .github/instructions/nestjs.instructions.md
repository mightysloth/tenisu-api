---
applyTo: 'src/**/*.ts, test/**/*.ts'
description: 'NestJS conventions scoped to the Tenisu technical exercise'
---

# NestJS implementation

- Keep the four requested endpoints and their documented contracts as the scope. Prefer a smaller change when two designs satisfy the exercise.
- Organize by feature, inject dependencies through constructors, and export only the providers another feature uses. Use Nest CLI generators when adding a Nest component.
- Keep controllers focused on HTTP, validation in DTOs, calculations in pure functions, and AWS commands in the concrete repository. Add another layer only when it solves an observed problem.
- Use the existing `ValidationPipe`, native parsing pipes and HTTP exceptions. Reject unknown input fields and preserve nested validation.
- Map transformed DTOs to plain objects before passing them to the DynamoDB document client. Preserve conditional writes, consistent reads and traversal of all query pages.
- Keep rank ascending, weights in grams and heights in centimetres. Calculate country ratios from total wins and matches, average individual BMIs, and average the two central heights for an even population.
- Keep reads public and authorize writes with the existing guard. Do not expose keys or storage errors to clients.
- Verify examples against the installed NestJS 12 packages and official documentation. Do not introduce TypeORM, JWT, Redis, queues or custom filters merely because a community example uses them.
- Test observable behavior with the existing Node test runner, Supertest and isolated local DynamoDB. Do not replace working tests solely to match an upstream template.

Sources and pinned revisions: [.agents/SOURCES.md](../../.agents/SOURCES.md).
