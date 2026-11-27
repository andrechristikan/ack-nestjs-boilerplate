# Auth decisions

## Standard

### OWASP ASVS 5.0 level 2 is the reference for the auth area and chapters V1 to V5 and V10 to V16

Rule: `discipline.md`, Normal use.

- ASVS level 3: its hardware-backed factors and extra controls exceed what a general boilerplate ships.
- NIST SP 800-63B alone: it states assurance levels, not checkable application requirements.
- No named standard: each control would be argued with no common bar.
- Level 2 for the auth area alone: the V1 to V5 and V10 to V16 controls would have no rule bringing them in scope against normal use.
- Level 2 for the whole project: chapters not yet read would bind before any gap read checked them.

## Passwords

### Passwords and backup codes are argon2id from `node:crypto`

Rule: `security.md`, Cryptography.

- bcrypt: it truncates at 72 bytes and is not memory-hard.
- An argon2 package: the pinned Node ships argon2, so a native dependency adds nothing.

### argon2id hashes and compares over several hashes run concurrently

Rule: `concurrency.md`, Together and alone.

- One hash at a time: each call draws its own salt, so concurrent hashes stay unique, and the libuv threadpool already bounds how many run at once.
- One compare at a time, stopping at the first match: the early stop saves work only on a match (a reused password, a backup code), while the common case, a password not in the history, runs every compare in turn.

### A password the user sets never expires

Rule: `credential-policy.md`, Passwords.

- A 182-day expiry: forced rotation produces predictable passwords, and ASVS 6.2.10 forbids it.

### Common passwords live in an offline table

Rule: `credential-policy.md`, Passwords.

- A live breached-password API: sign-up would depend on an outside service and send password material out.
- An in-memory list checked at sign-up: every API process would hold the whole list.

### A new password is 8 to 64 characters of any composition

Rule: `credential-policy.md`, Passwords.

- A composition rule (an uppercase letter, a lowercase letter, a digit): ASVS 6.2.5 forbids composition rules.
- A 50-character cap: ASVS 6.2.9 requires 64 characters to be permitted.
- A 128-character maximum: longer than a password field needs, and 64 is the shortest ceiling ASVS 6.2.9 allows.

## Sign-up

### The bad-word check matches whole words

Rule: `login.md`.

- Substring matching: a name such as Hassan or Cassandra, or an address at `essex.ac.uk`, could not sign up, and one such row fails a whole import file.

### A user accepts their own term policies on the first guarded request

Rule: `role.md`.

- An admin create or import recording the acceptance for the user: the row names the admin as `createdBy` of an acceptance the user never gave, while the term-policy guard asks the user on their first guarded request.

## Social sign-in

### A social login is matched by the provider subject

Rule: `login.md`.

- Matching by email: a provider can hand an address to another person, who then enters the old account.
- Relinking an account to a new subject: the person who received the address takes the account over.

### The social nonce is a row deleted on use, spent at verification

Rule: `login.md`, and `cache.md` for the two stores.

- Redis state with a TTL: a flush or an eviction would change an answer, where a lost cache entry changes only a speed.
- Writing the nonce to both stores: two sources of truth have to be kept equal.
- A scheduled purge job: the delete on use and the sweep on issue leave no row for a job to purge.
- Spending it inside the login transaction: a login refused before the transaction leaves the token usable again.
- No nonce: a stolen ID token signs in again until it expires.

### The social login body requires sign-up's required fields

Rule: `login.md`.

- Sign-up fields optional, with a typed 400 when a first sign-in lacks them: the social body derives from the normal sign-up API, the one with a password, and takes its fields as that API does; and the body's validity would turn on database state, so a request that passes validation could still fail.

### Apple sign-in takes one client id list

Rule: `config.md`, Names.

- Two keys named for the Services ID and the Bundle ID: the code merges both into one audience list and treats them alike.

## Re-authentication

### Every sensitive flow re-authenticates fully, with an action-bound email code for an account with nothing else

Rule: `credential-policy.md`, Re-authentication.

- MFA alone when it is on: a stolen code alone would change the account.
- A rule per flow: the flows drift apart.
- The session alone for an account with no password and MFA off: a stolen or unlocked device could change the account.
- The email code replacing the password: the weaker proof would stand in for a stronger one the user holds.
- One code and one window for every action: a two-step flow waits, and a code for one action could serve another.
- A time-boxed re-authenticated session: it adds session state and drops the one-use code.
- A passkey standing for the code only: a passkey with user verification proves possession and the user at once, so a password beside it adds nothing.
- Burning the email code on a wrong attempt: no other one-time code in the project burns, and the strict route throttle already bounds guessing.

### A failed re-authentication password records `userReauthenticationFailed`

Rule: `credential-policy.md`, Re-authentication.

- Reusing `userLoginFailed`: the name is wrong for an action that is no login, and the analytic failed-login card would count it.
- No entry below the lock threshold: a failed authentication attempt would leave no record, where ASVS 16.3.1 asks for one.

### TOTP enable proves an enrolled factor when no password was checked

Rule: `credential-policy.md`, Re-authentication.

- The session alone: a stolen or unlocked device could confirm its holder's authenticator on a passwordless account with a passkey.
- A password required before enrollment: a social account would gain a phishable password and a forgot-password path.
- A password or an email code alone when MFA is on: whoever holds the session and the password, or the inbox, could add a passkey that signs in alone.

## Verification

### A mobile-number code requested inside the resend window answers 200

Rule: `login.md`.

- A resend-limit error as the re-authentication code has: the mobile send mirrors email verification, and both verifications answer alike.

## Account deletion

### Self-delete writes `deleted.<id>` to email and username

Rule: `login.md`.

- `deleted-<id>`: it passes the username pattern, so anyone can register it first, and the delete then fails on the unique index.
- An email-shaped value on a reserved domain: it passes the sign-up email check, so sign-up would need a domain block.
- The original value kept after the id: the deleted row still holds both identifiers.

### Self-delete clears the credential and personal columns and the password history

Rule: `login.md`.

- Keeping the hash on the soft-deleted row: nothing reads it, and it outlives the account.

### Self-delete validates in the request and a job deletes

Rule: `login.md`.

- The account scrubbed and its sessions revoked in the request, the rest in a job: the scrub and the job are two transactions, so a failed job leaves the account half deleted (scrubbed and signed out while its workspaces and memberships stay live). The job's one transaction deletes the account and what it owns, and the projects of its deleted workspaces are paged after that commit.

### Self-delete is refused while the user owns a workspace with other members

Rule: `login.md`.

- An automatic transfer to another member: the owner chooses the new owner.

## MFA factors and challenges

### The challenge is a row, one type for every purpose

Rule: `mfa.md`.

- The challenge as Redis state read with `GETDEL`: a Redis read error turns into `MfaChallengeInvalidException`, the wrong answer.
- A model per purpose: the token, the expiry, and the claim would be the same statements five times.

### MFA stays opt-in

Rule: `mfa.md`.

- Mandatory MFA, which ASVS 6.3.3 asks for: a product decision the boilerplate leaves to the product built on it, an accepted difference from the standard.

### TOTP stays on SHA-1 with window 1

Rule: `mfa.md`.

- SHA-256, where ASVS lists SHA-1 as legacy: Google Authenticator on Android and Microsoft Authenticator compute SHA-1 regardless, so setup fails silently.
- `window` 0: a code typed at the end of its step fails on network delay, against RFC 6238's guidance.

### Biometric sign-in is a WebAuthn passkey through `@simplewebauthn/server`

Rule: `mfa.md`.

- A hand-made device key pair on `DeviceOwnership`: a private protocol every client would implement, without WebAuthn's origin binding.
- Biometric and passkey as separate factors: Face ID, a fingerprint, and a security key reach the server as the same WebAuthn assertion.
- WebAuthn on `node:crypto`: CBOR, COSE, and attestation parsing are security code the library already tests.

### SMS is no MFA factor

Rule: `mfa.md`.

- An SMS code on a verified number: a text message is open to SIM swap and interception, and no provider is chosen.

### Several factors enrolled, one picked per challenge

Rule: `mfa.md`.

- Exactly one active factor: adding a passkey would turn TOTP off, and a lost device would leave only the backup codes.

### One attempt budget across every MFA method

Rule: `mfa.md`.

- A budget per method: switching method would hand an attacker a fresh set of tries.

### A flow reads a user's MFA factor rows once and passes the state

Rule: `mfa.md`.

- Each `MfaService` method reading its own rows: a flow that gates MFA, lists the methods, and checks a proof reads the same factor rows two or three times.

### Backup codes are written when none remain and emptied with the last factor

Rule: `mfa.md`.

- Backup codes for TOTP only: a passkey-only user who loses the device has no recovery.

### An admin MFA reset removes every factor without forced enrollment

Rule: `mfa.md`.

- `requiredSetup` and enrollment at the next login: MFA is optional for everyone else, and a reset serves a user who lost the device.

### The `mfa` flag switches enrolled factors off

Rule: `feature-flag.md`, Gating.

- A flag that closes enrollment only: a product that drops MFA would still challenge every enrolled user.
- A switched-off method refused while MFA stays required: a user holding only that method is locked out until an admin reset.
- Two flag keys, one per method: no single switch turns MFA off.
- One passkey flag for every passkey role: switching MFA off would leave the passkey a second factor.
- Passkey registration open when either flag is on: one route would read two flags, and a toggle's effect could not be told without the code.

### A passkey alone signs a user in

Rule: `login.md`.

- TOTP or a backup code after a passkey: every assertion requires user verification, so the passkey is two factors already.

### The passkey relying party is required environment config

Rule: `mfa.md`.

- An optional integration: a passkey has no third party whose credentials may be unset; the values are the deployment's own domain.
- Deriving it from `FRONTEND_BASE_URL` and `REQUEST_CORS_ALLOWED_ORIGINS`: the relying-party id is a bare domain, and a mobile app's origin is in neither key.

### A password reset proves any enrolled MFA method

Rule: `login.md`.

- TOTP or a backup code only: a passkey-only user could not reset.
- No MFA on the reset: a stolen inbox alone would take the account.

## Attempts and locks

### An attempt counter counts failures only

Rule: `mfa.md`.

- Count first, the reset folded into the flow's transaction: a correct password followed by a failing business step raises the counter and can reach a lockout.
- Count first, the reset as a write outside the flow's transaction: a second write per flow breaks the one transaction per flow.

### A spent attempt budget is a temporary lock with an email

Rule: `mfa.md`.

- Deactivating the account: a stranger switches the account off and signs its owner out.
- A temporary `inactive` status with a delayed reactivation job: it mixes with an admin's deactivation, needs a job that can fail, and still revokes the owner's sessions.
- A timed lock with no email: the owner never learns someone is guessing.

## Sessions

### A device holds one signed-in user

Rule: `session.md`, Session invalidation.

- Several accounts signed in on one device: a crashed or careless client would keep the earlier user's refresh token valid on a device another user now holds.

### The device fingerprint is a client value of 32 to 128 characters

Rule: `dto.md`, Shape.

- A per-device secret issued at first login: a schema column and a new contract for every client.
- The eight-character minimum: a short value collides.

### Change-password keeps the current session

Rule: `session.md`, Session invalidation.

- Revoke every session: the user who just proved the password is signed out.
- Revoke every session and issue new tokens: the route's response changes for no gain over keeping the session.
- Revoke every session when a factor is removed (a TOTP disable, a passkey delete): a factor removal is a credential change like change-password, which keeps the caller's session.

### A credential-reset alert snapshots its recipient before the revoke and is mandatory

Rule: `notify.md`.

- Resolving after the revoke: the revoke destroys the live-session set, so the alert would reach nothing.
- Reading the snapshot inside the transaction's callback: a read off `tx` then runs while the transaction is open, beside its writes.
- Every registered device: a device with no live session is signed out of the account, and its stored token is a value no send reads.
- Honoring opt-outs on a credential reset: a credential-reset alert is not optional.

### A session cache sits in front of the row, cleared through the purge row

Rule: `session.md`, Session invalidation.

- No session cache: the database would take every JWT request.
- The raw jti stored: a value only compared is stored as its SHA-256 hash.
- A `cache.invalidate` row per refresh: one more row and job per refresh for what the mismatch reload already does.

### A revoke leaves the stored push token; the token read takes devices with a live session only

Rule: `session.md`, Session invalidation.

- Clearing it in the session cache purge job (`purgeLogins`): a `device` write in a cache purge, left to a queued job.
- Clearing it in each of the fifteen revoking use cases: one more call at every site for a value no send reads.
- A purge row that clears the tokens beside a `cache.invalidate` row for the login keys: two rows per revoke and a reshaped payload, for a token no send reads.

### Sessions end after 7 days idle

Rule: `session.md`, Session invalidation.

- The absolute lifetime alone: a forgotten device stays signed in for a month.

### A token refresh stamps the device's `lastActiveAt`

Rule: `session.md`, Session invalidation.

- A stamp on every request: one write per request.
- A stamp at login and device refresh only: the device list shows the last login as "last active".

### A refresh retried with the old token is reuse

Rule: `session.md`, Session invalidation.

- A grace window in which the old token still answers: it adds rotation state for a rare lost response, and the refresh stays simple at the cost of one more sign-in.
- An idempotent refresh that returns the same new pair: the same added state for the same rare case.

### A refresh token without `exp` is invalid, like one without `jti`

Rule: `session.md`, Session invalidation.

- A missing `exp` read as the epoch: it gives a case no signed token reaches a meaning, and the refresh still succeeds with a dead refresh token.
- The configured refresh lifetime for a missing `exp`: a token with no expiry would earn a fresh `auth.jwt.refreshToken.expiresInSeconds`.

## Retention

### Expired identity rows are purged by one daily job

Rule: `queue.md`, Enqueuing; the delete: `repository.md`, Schema.

- A TTL index created outside Prisma: it lives outside the schema file the no-migration design depends on.
- A purge job per module: five queues and schedules for one statement each.
- Delete on issue or on consume: a row nobody issues after stays for good.
- Soft delete with the unique values rewritten to `deleted.<id>`: the password hashes, IP addresses, user agents, and locations stay forever, which ASVS V14.1.2 and GDPR storage limitation refuse, and the unique values are random, so none is ever reused.
- Scrubbing the sensitive columns and keeping the row: every live read filters `deletedAt`, the collections keep growing, and `ActivityLog` already records when each row was created, changed, or revoked.
