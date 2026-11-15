# 0065. Passwords and backup codes are argon2id from `node:crypto`

- Status: accepted
- Date: 2026-11-15

## Context

bcrypt reads at most 72 bytes, which truncates a long multibyte password, and backup codes were unsalted SHA-256 hashes of about 52 bits, which ASVS 6.5.2 permits only at 112 bits or more.

## Decision

`HelperHashService.argon2Hash` and `argon2Compare` over `node:crypto` argon2id (19 MiB, 2 passes, parallelism 1) hash passwords, password history, and backup codes.

## Considered options

- argon2id from `node:crypto` (chosen)
- bcrypt: rejected, it truncates at 72 bytes and is not memory-hard.
- an argon2 package: rejected, the pinned Node ships argon2, so a native dependency adds nothing.

## Consequences

- `bcryptjs` is removed.
- Each hash or compare runs one at a time (`concurrency.md`).
