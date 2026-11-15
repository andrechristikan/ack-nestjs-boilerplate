# 0070. Every sensitive flow re-authenticates fully

- Status: accepted
- Date: 2026-11-15

## Context

Re-authentication differed per flow: some took the password, some a code, some nothing. ASVS 7.5.1 and 7.5.2 require it before a sensitive change and before ending a session.

## Decision

Eleven sensitive flows take one rule through `UserAuthService.assertReauthentication`: the current password when the account has one, plus a two-factor proof when two-factor is on.

## Considered options

- one full rule on every sensitive flow (chosen)
- two-factor alone when it is on: rejected, a stolen code alone would change the account.
- a rule per flow: rejected, the flows drift apart, as they had.

## Consequences

- `EnumUserReauthenticationAction` names the flows.
- Logout of the current session takes none.
