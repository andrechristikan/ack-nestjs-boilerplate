# 0026. Session cache in front of the row

- Status: accepted
- Date: 2026-11-07

## Context

The session entry in Redis is the guard's authority on every JWT route, and a miss means revoked. The `Session` row in MongoDB decides instead.

## Decision

A cached session hit whose `jtiDigest` matches the token's jti digest is trusted, and any other hit or a miss reads the `Session` row, which decides. The entry lives `session.loginCacheTtlInMs`, 15 minutes.

## Considered options

- a hit with a matching `jtiDigest` is trusted, anything else reads the row, TTL 15 minutes (chosen)
- no session cache: rejected, the database would take every JWT request.
- the raw jti stored: rejected, a value only compared is stored as its SHA-256 hash.

## Consequences

- 15 minutes is the longest a stale entry outlives a failed invalidation, shorter than the 1-hour access token.
- A hit with a differing digest deletes the key and reloads the row once.
