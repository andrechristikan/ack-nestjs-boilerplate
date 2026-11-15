# 0066. SMS is no MFA factor

- Status: accepted
- Date: 2026-11-15

## Context

Mobile numbers gained verification, which made an SMS one-time code a candidate factor. SMS codes are exposed to SIM swap and interception, and the SMS provider is still a placeholder.

## Decision

MFA factors are TOTP and passkey. A mobile number is verified in the user module and is not used for sign-in.

## Considered options

- SMS outside MFA (chosen)
- an SMS OTP factor on a verified number: rejected, SMS is the weakest factor and its adapter sends nothing yet.

## Consequences

- `NotificationSmsDeliveryService` serves number verification only.
- Nothing in `mfa` reads `UserMobileNumber`.
