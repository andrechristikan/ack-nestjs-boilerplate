# Two-Factor Authentication (TOTP)

This document describes the TOTP-based 2FA feature, configuration, endpoints, and expected request/response shapes.

## Overview
- Adds a second factor after primary login (credential or social).
- TOTP secrets are AES-encrypted (key/IV from env). Backup codes are SHA-256 hashed.
- Login issues a `challengeToken` when 2FA is enabled; JWTs are only issued after successful 2FA verification.
- Challenges are cached with TTL; sessions continue to be stored in Redis + Mongo as with the core auth flow.

## Related Documents
- [Authentication](./authentication.md)
- [Environment](./environment.md)
- [Security and Middleware](./security-and-middleware.md)

## Configuration
Location: `src/configs/auth.config.ts` under `twoFactor`.

Environment variables (see `docs/environment.md` for defaults and descriptions):
- `AUTH_TWO_FACTOR_ISSUER`, `AUTH_TWO_FACTOR_LABEL`
- `AUTH_TWO_FACTOR_DIGITS`, `AUTH_TWO_FACTOR_STEP`, `AUTH_TWO_FACTOR_WINDOW`, `AUTH_TWO_FACTOR_SECRET_LENGTH`
- `AUTH_TWO_FACTOR_CHALLENGE_TTL_MS`, `AUTH_TWO_FACTOR_CACHE_PREFIX_KEY`
- `AUTH_TWO_FACTOR_BACKUP_CODES_COUNT`, `AUTH_TWO_FACTOR_BACKUP_CODES_LENGTH`
- `AUTH_TWO_FACTOR_ENCRYPTION_KEY`, `AUTH_TWO_FACTOR_ENCRYPTION_IV` (required to encrypt secrets)

## Flow
1) User submits primary login (credential or social).
2) If 2FA disabled → issue access/refresh tokens and create session (Redis + DB).
3) If 2FA enabled → respond with `challengeToken` + TTL (no tokens yet).
4) User posts `challengeToken` + TOTP code (or backup code) to complete login.
5) On success → issue tokens, persist session, mark 2FA usage; backup codes are consumed on use.

## Endpoints
### Public
- `POST /v1/user/login/credential`  
  Body: `{ email, password, from }`  
  Response:
  - 2FA off → `{ isTwoFactorRequired: false, tokens }`
  - 2FA on → `{ isTwoFactorRequired: true, challengeToken, challengeExpiresIn, backupCodesRemaining }`

- `POST /v1/user/login/social/google|apple`  
  Body: social DTO + `Authorization: Bearer <social_id_token>` header  
  Response matches credential login (may return `challengeToken`).

- `POST /v1/user/login/2fa`  
  Body: `{ challengeToken, code? | backupCode? }`  
  Response: `{ isTwoFactorRequired: false, tokens }`

### Authenticated (user role)
- `POST /v1/user/2fa/setup` → returns `{ secret, otpauthUrl }`
- `POST /v1/user/2fa/confirm` with body `{ code }` → enables 2FA and returns `{ backupCodes: [] }`
- `POST /v1/user/2fa/backup/regenerate` → rotates backup codes
- `DELETE /v1/user/2fa` with body `{ code? , backupCode? }` → disables 2FA

## Response/DTO Notes
- Login responses now use `UserLoginResponseDto`:
  - `isTwoFactorRequired: boolean`
  - `tokens?: UserTokenResponseDto`
  - `challengeToken?: string`
  - `challengeExpiresIn?: number`
  - `backupCodesRemaining?: number`
- Challenge verification uses `UserTwoFactorVerifyLoginRequestDto` (`challengeToken` + `code` or `backupCode`).

## Security Notes
- Secrets encrypted via `HelperService.aes256Encrypt` using `AUTH_TWO_FACTOR_ENCRYPTION_KEY/IV`.
- Backup codes stored hashed (SHA-256) and consumed on use.
- Challenges cached with TTL (`AUTH_TWO_FACTOR_CHALLENGE_TTL_MS`) to prevent reuse.
- Sessions still validated via jti match (Redis + DB) on every request; 2FA does not bypass session checks.

## Operational Tips
- When running locally without JWKS, set `AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY`/`AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY` for token verification, or point JWKS URIs to `http://localhost:3011/.well-known/...` with Docker compose running.
- Ensure `AUTH_TWO_FACTOR_ENCRYPTION_KEY` (32 chars) and `AUTH_TWO_FACTOR_ENCRYPTION_IV` (16 chars) are set before enabling 2FA; otherwise secret encryption will fail.
