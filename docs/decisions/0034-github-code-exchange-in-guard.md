# 0034. GitHub sign-in exchanges a body-carried code in the guard

- Status: accepted
- Date: 2026-11-11

## Context

Google and Apple sign-in verify an ID token inside a guard. GitHub issues no ID token: the client holds a single-use authorization code, and the backend exchanges it with the client secret and reads the account email. The route had to keep the guard shape of the other providers and fix where the code travels.

## Decision

The client sends `code`, `redirectUri`, and `codeVerifier` (PKCE, RFC 7636) in the request body. `AuthSocialGithubGuard` exchanges the code once, before body validation, and reads the primary verified email. The access token is discarded after that read.

## Considered options

- Body-carried code, exchanged in the guard, token discarded (chosen)
- The code in the `Authorization` header: rejected, a later PKCE addition would move it to the body and change the route contract.
- Validating the full social body in the guard first: rejected, that schema belongs to the user module, above auth in the dependency order, and a taken username would still spend the code.
- The exchange in the use case: rejected, the route would stop matching the Google and Apple guard shape.
- Revoking the token best-effort: rejected, it adds a GitHub call per login against the token-request rate limit and a failure path, for a token never stored.

## Consequences

- A request that fails after the guard (a taken username, a malformed field) has spent the code, so the client needs a new GitHub redirect before retrying.
- Clients request the `user:email` scope.
- Accounts link by the verified email only.
