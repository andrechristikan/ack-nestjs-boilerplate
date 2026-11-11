# 0039. Audit stamping is top-level only

- Status: accepted
- Date: 2026-11-11

## Context

The audit extension stamps `createdBy` and `updatedBy` from the request actor. Stamping a nested write needs every model's relations listed in the database kit and kept in step with the schema, and no repository relies on it: the one nested write in a repository targets `NotificationDelivery`, which has no audit column, and seeds run with no actor.

## Decision

`DatabaseExtensionFactory` stamps the top-level payload of `create`, `createMany`, `update`, `updateMany`, and `upsert` only. A nested write passes its audit values explicitly.

## Considered options

- top-level stamping only (chosen)
- a hand-written relation map: rejected, every relation added to the schema also needs an edit in the database kit.
- a generated relation map: rejected, it reads the Prisma runtime data model to stamp writes no repository makes.

## Consequences

- A nested write to a model with audit columns sets `createdBy` and `updatedBy` itself (`database.md`, Access).
- A relation added to `prisma/schema.prisma` needs no edit in the database kit.
