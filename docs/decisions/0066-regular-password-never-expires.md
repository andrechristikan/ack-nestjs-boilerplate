# 0066. A regular password never expires

- Status: accepted
- Date: 2026-11-15

## Context

A regular password expired after 182 days and refused the login. ASVS 6.2.10 keeps a password valid until the user changes it or it is known compromised.

## Decision

A password the user sets has no expiry; only an admin-issued temporary password expires, after 3 days.

## Considered options

- no expiry for a regular password (chosen)
- the 182-day expiry: rejected, forced rotation produces predictable passwords and ASVS 6.2.10 forbids it.

## Consequences

- The password history and its reuse period stay.
- The analytic password-expiry read is removed.
