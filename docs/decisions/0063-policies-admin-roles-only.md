# 0063. Policies belong to admin-type roles only

- Status: accepted
- Date: 2026-11-15

## Context

Only admin routes carry `@PolicyProtected`, yet the admin API wrote policies on `user`-type roles, which no route checks.

## Decision

A policy create or update on a `user`-type role answers `PolicyRoleTypeInvalidException` (51104); a role type change to `user` while it holds a policy answers `RoleHasPoliciesException` (50507). `RoleGuard` stores no policy for a `user` role.

## Considered options

- Policies on admin-type roles only (chosen)
- Policies on every role, kept for a future user route: rejected, a stored policy that restricts nothing misleads whoever reads the role.

## Consequences

- A policy delete on a `user` role stays allowed, so a leftover can be removed (`auth.md`, Sign-in and authorization).
