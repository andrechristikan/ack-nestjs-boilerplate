# 0067. Common passwords live in an offline table

- Status: accepted
- Date: 2026-11-15

## Context

ASVS 6.2.4 and 6.2.12 require a new password to be checked against common and breached passwords. The check must not make sign-up depend on an outside service.

## Decision

A `CommonPassword` table, filled once by the `commonPassword` seed from a public breach-frequency list bundled as a TypeScript data file, refuses a listed password, matched case-insensitively.

## Considered options

- an offline `CommonPassword` table (chosen)
- a live breached-password API: rejected, sign-up would depend on an outside service and send password material out.
- an in-memory list checked at sign-up: rejected, every API process would hold the whole list; only the seed command loads the data file.

## Consequences

- The list is collected once when the seed is written; nothing fetches at runtime.
- `seeding.md` carries the bulk-list data file.
