# Security decisions

Each entry names a choice the rules in `.claude/rules/` carry and gives the reason each plausible alternative was rejected. The rule states what the code does; this page states only why the alternatives lost.

## Standard

### OWASP ASVS 5.0 level 2 is the reference for the auth area and chapters V1 to V5

Rule: `discipline.md`, Normal use.

- ASVS level 3: its hardware-backed factors and extra controls exceed what a general boilerplate ships.
- NIST SP 800-63B alone: it states assurance levels, not checkable application requirements.
- No named standard: each control would be argued with no common bar.
- Level 2 for the auth area alone: the V1 to V5 controls would have no rule bringing them in scope against normal use.
- Level 2 for the whole project: chapters not yet read would bind before any gap read checked them.

## Passwords

### Passwords and backup codes are argon2id from `node:crypto`

Rule: `security.md`, Cryptography.

- bcrypt: it truncates at 72 bytes and is not memory-hard.
- An argon2 package: the pinned Node ships argon2, so a native dependency adds nothing.

### A password the user sets never expires

Rule: `credential-policy.md`, Passwords.

- A 182-day expiry: forced rotation produces predictable passwords, and ASVS 6.2.10 forbids it.

### Common passwords live in an offline table

Rule: `credential-policy.md`, Passwords.

- A live breached-password API: sign-up would depend on an outside service and send password material out.
- An in-memory list checked at sign-up: every API process would hold the whole list.

## Attempts and locks

### An attempt counter counts failures only

Rule: `session.md`, Two-factor.

- Count first, the reset folded into the flow's transaction: a correct password followed by a failing business step raises the counter and can reach a lockout.
- Count first, the reset as a write outside the flow's transaction: a second write per flow breaks the one transaction per flow.

### A spent attempt budget is a temporary lock with an email

Rule: `session.md`, Two-factor.

- Deactivating the account: a stranger switches the account off and signs its owner out.
- A temporary `inactive` status with a delayed reactivation job: it mixes with an admin's deactivation, needs a job that can fail, and still revokes the owner's sessions.
- A timed lock with no email: the owner never learns someone is guessing.

## Two-factor

### The login challenge is a row

Rule: `session.md`, Two-factor.

- The challenge as Redis state read with `GETDEL`: a Redis read error turns into `AuthTwoFactorChallengeInvalidException`, the wrong answer.

### Two-factor stays opt-in

Rule: `session.md`, Two-factor.

- Mandatory two-factor: a product decision the boilerplate leaves to the product built on it.

### TOTP stays on SHA-1 with window 1

Rule: `session.md`, Two-factor.

- SHA-256: Google Authenticator on Android and Microsoft Authenticator compute SHA-1 regardless, so setup fails silently.
- `window` 0: a code typed at the end of its step fails on network delay, against RFC 6238's guidance.

## Sessions

### A device holds one signed-in user

Rule: `session.md`, Session invalidation.

- Several accounts signed in on one device: a crashed or careless client would keep the earlier user's refresh token valid on a device another user now holds.

### Change-password keeps the current session

Rule: `session.md`, Session invalidation.

- Revoke every session: the user who just proved the password is signed out.
- Revoke every session and issue new tokens: the route's response changes for no gain over keeping the session.

### A credential-reset alert snapshots its recipient before the revoke and is mandatory

Rule: `notify.md`.

- Resolving after the revoke: the revoke destroys the live-session set, so the alert would reach nothing.
- Every registered device: a logged-out device's token is already cleared, so no wider set exists.
- Honouring opt-outs on a credential reset: a credential-reset alert is not optional.

### A session cache sits in front of the row, cleared through the purge row

Rule: `session.md`, Session invalidation.

- No session cache: the database would take every JWT request.
- The raw jti stored: a value only compared is stored as its SHA-256 hash.
- A `cache.invalidate` row beside a purge row that clears tokens only: two rows per revoke and a reshaped payload for the same work.
- A `cache.invalidate` row per refresh: one more row and job per refresh for what the mismatch reload already does.

### Sessions end after 7 days idle

Rule: `session.md`, Session invalidation.

- The absolute lifetime alone: a forgotten device stays signed in for a month.

## Authorization

### Policies belong to admin-type roles only

Rule: `role.md`.

- Policies on every role, kept for a future user route: a stored policy that restricts nothing misleads whoever reads the role.

## Re-authentication

### Every sensitive flow re-authenticates fully, with an action-bound email code for an account with nothing else

Rule: `credential-policy.md`, Re-authentication.

- Two-factor alone when it is on: a stolen code alone would change the account.
- A rule per flow: the flows drift apart.
- The session alone for an account with no password and no two-factor: a stolen or unlocked device could change the account.
- The email code replacing the password: the weaker proof would stand in for a stronger one the user holds.
- One code and one window for every action: a two-step flow waits, and a code for one action could serve another.
- A time-boxed re-authenticated session: it adds session state and drops the one-use code.

## Headers and files

### No antivirus scanner

Rule: `file.md`, Upload validation is a pipe.

- A ClamAV container with a scan job and a quarantine state: it adds a container to both compose files, a queue, and a photo state every client must handle, for files that are already signature-checked images and text templates.

### A content security policy on every response, with its own policy on the docs path

Rule: `security.md`, Response headers.

- No policy on the docs path: the docs page would be the one response outside the standard.
- No policy at all on a JSON API: ASVS requires a global policy on every response whatever the body type.

### `*` is refused as a CORS origin in production only

Rule: `config.md`.

- Refused in every environment: every local setup would need an origin list for clients whose origin changes.
- Allowed everywhere: the standard requires an allowlist for sensitive responses.
