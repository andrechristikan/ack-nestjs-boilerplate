# Dates and time

## `HelperDateService` owns the clock

Use `HelperDateService` rather than a raw `new Date()` in business logic. It normalizes
consistently and gives one mockable clock; a scattered `new Date()` is untestable and
timezone-fragile. `TZ=UTC` in the test script exists because of this.

The surface, all on `HelperDateService`
(`src/common/helper/services/helper.date.service.ts`), backed by Luxon:

| Need | Method |
|---|---|
| now, or normalize a date | `create(date?, options?)` |
| a Luxon `DateTime` instance | `createInstance(date?)` |
| parse an ISO string / a timestamp | `createFromIso(iso, options?)` · `createFromTimestamp(ts, options?)` |
| move forward / back | `forward(date, duration)` · `backward(date, duration)` |
| set fields | `set(date, units)` |
| build / measure a duration | `createDuration(duration)` · `diff(a, b)` |
| format | `formatToIso` · `formatToIsoDate` · `formatToIsoTime` |
| read | `getTimestamp` · `getZone` · `getZoneOffset` |
| validate | `checkIso` · `checkTimestamp` |
| age | `calculateAge(dateOfBirth, fromYear?)` |

**A hardcoded `new Date()` in a service, guard, util, or repository is a defect.** The
exceptions are a Prisma `@default(now())` in the schema (the database's clock, not ours) and a
spec's own fixture.

## Storage and the wire

- Every persisted timestamp is a Prisma `DateTime` — UTC in the database. Never a string,
  never an epoch number in a column.
- On the wire a date is serialized by the route's response schema. Never format a date by hand
  in a service.
- A date-shaped **request** field is typed as a date on its zod schema (`rules/validation.md`),
  not accepted as a raw string and parsed downstream.

## Durations belong in config, in milliseconds

Every TTL, expiry, window, and backoff is a config key named `*InMs`, valued `ms('<string>')`
(`rules/config.md`). A duration computed inline (`5 * 60 * 1000`) is the defect, and so is a
config field named `InSeconds`. The conversion to whatever unit a third-party package wants
happens at the CALL SITE.

## Comparing and expiring

- Compare `Date` objects, not formatted strings. A string comparison of two ISO values happens
  to work until one of them carries an offset.
- An expiry check reads the clock through `HelperDateService` so a spec can move it. `expiredAt <
  now` written against a bare `new Date()` cannot be tested for either side of the boundary.
- **`updatedAt`, `lastActiveAt`, and any `expiredAt` a resend rewrites are MUTABLE sort keys**
  and are therefore illegal in a cursor route's `availableOrderBy` (`rules/pagination.md`).

## Specs

`TZ=UTC` is set by the test script. **A date fixture written `'…Z'` is a string these columns
never emit** — a spec that supplies the shape the code wants proves nothing about a UTC defect.
Build fixtures as real `Date` objects (`rules/testing.md`).
