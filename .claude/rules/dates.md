# Dates and time

## `HelperService` owns the clock

Use `HelperService`'s date helpers rather than a raw `new Date()` in business logic. They
normalize consistently and give one mockable clock; a scattered `new Date()` is untestable and
timezone-fragile. `TZ=UTC` in the test script exists because of this.

The surface, all on `HelperService` (`src/common/helper/services/helper.service.ts`), backed by
Luxon:

| Need | Method |
|---|---|
| now, or normalize a date | `dateCreate(date?, options?)` |
| a Luxon `DateTime` instance | `dateCreateInstance(date?)` |
| parse an ISO string / a timestamp | `dateCreateFromIso(iso, options?)` · `dateCreateFromTimestamp(ts, options?)` |
| move forward / back | `dateForward(date, duration)` · `dateBackward(date, duration)` |
| set fields | `dateSet(date, units)` |
| build / measure a duration | `dateCreateDuration(duration)` · `dateDiff(a, b)` |
| format | `dateFormatToIso` · `dateFormatToIsoDate` · `dateFormatToIsoTime` |
| read | `dateGetTimestamp` · `dateGetZone` · `dateGetZoneOffset` |
| validate | `dateCheckIso` · `dateCheckTimestamp` |
| age | `calculateAge(dateOfBirth, fromYear?)` |

**A hardcoded `new Date()` in a service, guard, util, or repository is a defect.** The
exceptions are a Prisma `@default(now())` in the schema (the database's clock, not ours) and a
spec's own fixture.

## Storage and the wire

- Every persisted timestamp is a Prisma `DateTime` — UTC in the database. Never a string,
  never an epoch number in a column.
- On the wire a date is an ISO 8601 string, produced by the response DTO. Never format a date
  by hand in a service.
- A date-shaped **request** field is validated as a date by `class-validator`
  (`rules/validation.md`), not accepted as a raw string and parsed downstream.

## Durations belong in config, in milliseconds

Every TTL, expiry, window, and backoff is a config key named `*InMs`, valued `ms('<string>')`
(`rules/config.md`). A duration computed inline (`5 * 60 * 1000`) is the defect, and so is a
config field named `InSeconds`. The conversion to whatever unit a third-party package wants
happens at the CALL SITE.

## Comparing and expiring

- Compare `Date` objects, not formatted strings. A string comparison of two ISO values happens
  to work until one of them carries an offset.
- An expiry check reads the clock through `HelperService` so a spec can move it. `expiredAt <
  now` written against a bare `new Date()` cannot be tested for either side of the boundary.
- **`updatedAt`, `lastActiveAt`, and any `expiredAt` a resend rewrites are MUTABLE sort keys**
  and are therefore illegal in a cursor route's `availableOrderBy` (`rules/pagination.md`).

## Specs

`TZ=UTC` is set by the test script. **A date fixture written `'…Z'` is a string these columns
never emit** — a spec that supplies the shape the code wants proves nothing about a UTC defect.
Build fixtures as real `Date` objects (`rules/testing.md`).
