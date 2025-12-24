# Two Factor Documentation

## Overview

Two-Factor Authentication (2FA) adds an additional security layer to user authentication using Time-based One-Time Password (TOTP) algorithm. This implementation supports both authenticator apps (Google Authenticator, Authy, etc.) and backup codes for account recovery.

**Key Features:**
- TOTP-based verification (RFC 6238 compliant)
- 8 one-time backup codes for recovery
- Admin-controlled force setup
- AES-256 encryption for secret storage
- Challenge-based verification flow
- Session revocation on security changes
- Account protection with failed attempts tracking
- **2FA protection on sensitive operations** (login, password change, password reset, disable 2FA)

## Related Documents

- [Authentication Documentation][ref-doc-authentication] - JWT token management and login flows
- [Security and Middleware Documentation][ref-doc-security-and-middleware] - Rate limiting and security headers
- [Cache Documentation][ref-doc-cache] - Redis implementation for challenge tokens
- [Activity Log Documentation][ref-doc-activity-log] - Events tracking

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Configuration](#configuration)
    - [Environment Variables](#environment-variables)
    - [Configuration Details](#configuration-details)
- [Security Features](#security-features)
    - [Failed Attempts Protection](#failed-attempts-protection)
    - [Temporary Lock Mechanism](#temporary-lock-mechanism)
- [Where 2FA is Used](#where-2fa-is-used)
    - [Shared Endpoints (User Operations)](#shared-endpoints-user-operations)
    - [Public Endpoints](#public-endpoints)
    - [Admin Endpoints](#admin-endpoints)
- [Authentication Flows](#authentication-flows)
    - [Setup Flow](#setup-flow)
    - [Login Flow (2FA Enabled)](#login-flow-2fa-enabled)
    - [Admin Force Setup Flow](#admin-force-setup-flow)
    - [Backup Code Usage Flow](#backup-code-usage-flow)
    - [Temporary Lock Flow](#temporary-lock-flow)
    - [Admin Reset 2FA Flow](#admin-reset-2fa-flow)
    - [Password Operations with 2FA Flow](#password-operations-with-2fa-flow)
- [Error Handling](#error-handling)
    - [HTTP Status Codes](#http-status-codes)
- [Contribution](#contribution)

## Configuration

### Environment Variables
```env
AUTH_TWO_FACTOR_ISSUER=YourAppName
AUTH_TWO_FACTOR_ENCRYPTION_KEY=your-32-character-encryption-key-here
```

### Configuration Details

Located in `src/configs/auth.config.ts`:

| Setting | Value | Description |
|---------|-------|-------------|
| `issuer` | `YourAppName` | Displayed in authenticator apps |
| `digits` | `6` | TOTP code length (standard) |
| `step` | `30` | Time window in seconds |
| `window` | `1` | Clock skew tolerance (±30 seconds) |
| `secretLength` | `32` | Base32 secret length |
| `challengeTtlInMs` | `300000` | Challenge token TTL (5 minutes) |
| `backupCodes.count` | `8` | Number of backup codes generated |
| `backupCodes.length` | `10` | Characters per backup code (A-Z, 0-9) |
| `maxAttempt` | `5` | Maximum failed verification attempts before lock |
| `lockAttemptDuration` | `120000` | Base lock duration in milliseconds (2 minutes) |

## Security Features

### Failed Attempts Protection

The system tracks failed 2FA verification attempts to protect against brute force attacks:

**How it works:**
- Each failed TOTP code or backup code verification increments the attempt counter
- Counter is stored in the `TwoFactor.attempt` field
- Counter resets to 0 when user successfully verifies with valid code or backup code
- Both TOTP codes and backup codes share the same counter (combined limit)

**Counter tracking:**
```
Attempt 1 (TOTP failed) → attempt = 1
Attempt 2 (Backup code failed) → attempt = 2
Attempt 3 (TOTP failed) → attempt = 3
Attempt 4 (TOTP success) → attempt = 0 (reset)
```

### Temporary Lock Mechanism

When a user reaches the maximum allowed attempts (5 failed verifications), the system temporarily locks 2FA verification with exponential backoff.

**How it works:**
1. Lock check happens **before** verification attempt
2. If locked, return error with `retryAfterSeconds` (HTTP 429)
3. If not locked, proceed with verification
4. If verification fails:
   - Increment attempt counter first
   - **After increment**, check if counter reached max (5)
   - If reached max, set lock in cache with exponential TTL
   - Return invalid code error (HTTP 401)
5. Lock is stored in Redis cache with automatic expiration
6. Lock duration increases exponentially based on attempt count

**Lock timing:**
- Lock is set **after** the 5th failed attempt
- Lock prevents **next** verification attempt
- User receives HTTP 429 on **next** attempt (not the 5th)

**Lock duration calculation:**
- Formula: `TTL = 2^(attempt / maxAttempt) × lockAttemptDuration`
- Base lock duration: 2 minutes (configurable via `lockAttemptDuration`)

**Lock duration examples:**
```
After 5th failed attempt (attempt=5):
  TTL = 2^(5/5) × 2 minutes = 2^1 × 2 = 4 minutes

After 6th failed attempt (attempt=6):
  TTL = 2^(6/5) × 2 minutes = 2^1.2 × 2 ≈ 4.6 minutes

After 7th failed attempt (attempt=7):
  TTL = 2^(7/5) × 2 minutes = 2^1.4 × 2 ≈ 5.3 minutes
```

**User experience flow:**
1. User enters wrong code 5 times → gets HTTP 401 (invalid code)
2. Lock is set in background
3. User tries again (6th attempt) → gets HTTP 429 with `retryAfterSeconds: 240` (4 minutes)
4. User waits 4 minutes
5. Lock expires automatically
6. User can try again
7. If fails again, new lock with longer duration (exponential backoff)

**Recovery process:**
- Lock automatically expires after TTL duration (no admin intervention needed)
- Attempt counter persists in database until successful verification
- Each subsequent lock (after retry) increases duration exponentially
- Counter resets to 0 only on successful verification
- Admin can force reset 2FA to clear both counter and lock

## Where 2FA is Used

### Shared Endpoints (User Operations)
**2FA Management:**
- `GET /shared/user/2fa/status` - Check current 2FA status
- `POST /shared/user/2fa/setup` - Get TOTP secret and otpauthUrl
- `POST /shared/user/2fa/enable` - Enable 2FA with code verification
- `DELETE /shared/user/2fa/disable` - **Disable 2FA (requires 2FA verification)**
- `POST /shared/user/2fa/regenerate-backup-codes` - Regenerate backup codes

**Password Operations (require 2FA if enabled):**
- `PUT /shared/user/password/change` - **Change password (requires 2FA verification if enabled)**

### Public Endpoints
**Login Flow:**
- `POST /public/user/login/credential` - Login with email/password
- `POST /public/user/login/social/google` - Login with Google OAuth
- `POST /public/user/login/social/apple` - Login with Apple Sign In
- `POST /public/user/login/2fa/verify` - Verify TOTP code or backup code
- `POST /public/user/login/2fa/enable` - Complete forced 2FA setup during login

**Password Recovery (require 2FA if enabled):**
- `PUT /public/user/password/reset` - **Reset password (requires 2FA verification if enabled)**

### Admin Endpoints
- `PATCH /admin/user/update/:userId/2fa/reset` - Force reset user's 2FA (clears lock and resets attempts)

**Note:** See Swagger documentation for detailed request/response schemas.

## Authentication Flows

### Setup Flow

User enables 2FA for their account:
```mermaid
sequenceDiagram
    participant User
    participant API
    participant Database

    User->>API: POST /user/2fa/setup
    API->>API: Generate TOTP secret
    API->>API: Encrypt secret (AES-256)
    API->>Database: Save encrypted secret + IV
    API->>User: Return secret + otpauthUrl
    Note over User: Frontend generates QR code from otpauthUrl
    User->>User: Scan QR with authenticator app
    User->>API: POST /user/2fa/enable {code}
    API->>API: Decrypt secret & verify code
    API->>API: Generate 8 backup codes
    API->>Database: Hash & save backup codes
    API->>Database: Set enabled=true, confirmedAt=now
    API->>Database: Set attempt=0
    API->>User: Return backup codes
```

### Login Flow (2FA Enabled)

User logs in with 2FA enabled:
```mermaid
sequenceDiagram
    participant User
    participant API
    participant Cache
    participant Database

    User->>API: POST /user/login/credential
    API->>Database: Verify credentials
    API->>Database: Check twoFactor.enabled
    API->>API: Generate challenge token
    API->>Cache: Store challenge (5min TTL)
    API->>User: Return challengeToken
    User->>API: POST /user/login/2fa/verify {challengeToken, code}
    API->>Cache: Validate challenge
    API->>Cache: Check if user is locked
    alt User Locked
        API->>Cache: Get TTL (remaining lock time)
        API->>User: Error: Temporarily locked (429)<br/>retryAfterSeconds: X
    else Not Locked
        API->>Database: Get & decrypt secret
        API->>API: Verify TOTP code (±30s tolerance)
        alt Code Valid
            API->>Database: Reset attempt to 0
            API->>API: Generate JWT tokens
            API->>Database: Create session
            API->>Cache: Delete challenge
            API->>User: Return access + refresh tokens
        else Code Invalid
            API->>Database: Increment attempt counter
            API->>Database: Get updated attempt count
            alt Updated Attempt >= 5
                Note over API: Calculate exponential TTL<br/>TTL = 2^(attempt/5) × 2 minutes
                API->>Cache: Set lock with TTL
            end
            API->>User: Error: Invalid code (401)
        end
    end
```

### Admin Force Setup Flow

Admin forces user to setup 2FA on next login:
```mermaid
sequenceDiagram
    participant Admin
    participant API
    participant Database
    participant User

    Admin->>API: PATCH /user/update/:userId/2fa/reset
    API->>Database: Set enabled=true, requiredSetup=true
    API->>Database: Revoke all user sessions
    
    Note over User: User Next Login
    User->>API: POST /user/login/credential
    API->>API: Generate TOTP secret
    API->>Database: Save encrypted secret
    API->>User: Return secret + otpauthUrl + challengeToken
    User->>User: Scan QR code
    User->>API: POST /user/login/2fa/enable {challengeToken, code}
    API->>Database: Verify & save backup codes
    API->>Database: Set requiredSetup=false, attempt=0
    API->>User: Return backup codes
    User->>API: POST /user/login/2fa/verify {challengeToken, code}
    API->>User: Return tokens
```

### Backup Code Usage Flow

User uses backup code when authenticator app is unavailable:
```mermaid
sequenceDiagram
    participant User
    participant API
    participant Cache
    participant Database

    User->>API: POST /user/login/2fa/verify {backupCode}
    API->>Cache: Check if user is locked
    alt User Locked
        API->>Cache: Get TTL (remaining lock time)
        API->>User: Error: Temporarily locked (429)<br/>retryAfterSeconds: X
    else Not Locked
        API->>Database: Get hashed backup codes
        API->>API: Hash input & compare
        alt Backup Code Valid
            API->>Database: Remove used backup code
            API->>Database: Reset attempt to 0
            API->>Database: Update lastUsedAt
            API->>User: Return tokens + backupCodesRemaining
            alt No Codes Left
                API->>User: Warning: Regenerate backup codes
            end
        else Backup Code Invalid
            API->>Database: Increment attempt counter
            API->>Database: Get updated attempt count
            alt Updated Attempt >= 5
                Note over API: Calculate exponential TTL<br/>TTL = 2^(attempt/5) × 2 minutes
                API->>Cache: Set lock with TTL
            end
            API->>User: Error: Invalid backup code (401)
        end
    end
```

### Temporary Lock Flow

System behavior when user reaches maximum attempts:
```mermaid
sequenceDiagram
    participant User
    participant API
    participant Cache
    participant Database

    User->>API: POST /user/login/2fa/verify {code}
    API->>Cache: Check if user is locked
    
    alt User Already Locked
        API->>Cache: Get TTL (remaining lock time)
        API->>User: Error: Temporarily locked (429)<br/>retryAfterSeconds: X
    else Not Locked
        API->>API: Verify code
        alt Code Valid
            API->>Database: Reset attempt = 0
            API->>User: Success: Return tokens
        else Code Invalid
            API->>Database: Increment attempt (attempt++)
            API->>Database: Get updated attempt count
            
            alt Updated Attempt >= 5
                Note over API: Calculate exponential TTL<br/>TTL = 2^(attempt/5) × 2 minutes
                API->>Cache: Set lock with TTL
                Note over Cache: Lock will be checked<br/>on next verification attempt
            end
            
            API->>User: Error: Invalid code (401)
        end
    end
    
    Note over User,Cache: Lock expires after TTL
    Note over User: User can retry after lock expires
```

### Admin Reset 2FA Flow

Admin can force reset user's 2FA if needed (optional, user can also wait for lock to expire):
```mermaid
sequenceDiagram
    participant User
    participant Admin
    participant API
    participant Database
    participant Cache

    Note over User: User locked out or lost access
    User->>Admin: Request 2FA reset
    
    Admin->>API: PATCH /admin/user/update/:userId/2fa/reset
    API->>Database: Reset 2FA (set requiredSetup=true)
    API->>Database: Clear attempt counter
    API->>Cache: Clear lock (if exists)
    API->>Database: Revoke all sessions
    API->>Admin: Success confirmation
    
    Admin->>User: 2FA has been reset
    
    Note over User: User must setup 2FA again on next login
    User->>API: POST /user/login/credential
    API->>User: Return secret + otpauthUrl + challengeToken
    User->>API: POST /user/login/2fa/enable {code}
    API->>Database: Complete setup, attempt=0
    User->>API: POST /user/login/2fa/verify {code}
    API->>User: Return tokens
```

### Password Operations with 2FA Flow

When user has 2FA enabled, password operations require additional verification:

**Change Password:**
```mermaid
sequenceDiagram
    participant User
    participant API
    participant Cache
    participant Database

    User->>API: PUT /shared/user/password/change<br/>{oldPassword, newPassword, code/backupCode, method}
    API->>Database: Verify old password
    alt Old Password Invalid
        API->>User: Error: Password not match (400)
    else Old Password Valid
        alt User has 2FA enabled
            API->>Cache: Check if user is locked
            alt User Locked
                API->>User: Error: Temporarily locked (429)
            else Not Locked
                API->>API: Verify 2FA (code or backupCode)
                alt 2FA Invalid
                    API->>Database: Increment attempt
                    alt Attempt >= 5
                        API->>Cache: Set lock
                    end
                    API->>User: Error: Invalid 2FA (401)
                else 2FA Valid
                    API->>Database: Reset attempt to 0
                    API->>Database: Change password
                    API->>Database: Revoke all sessions
                    API->>User: Success
                end
            end
        else 2FA not enabled
            API->>Database: Change password
            API->>Database: Revoke all sessions
            API->>User: Success
        end
    end
```

**Reset Password (Forgot Password):**
```mermaid
sequenceDiagram
    participant User
    participant API
    participant Cache
    participant Database

    User->>API: PUT /public/user/password/reset<br/>{token, newPassword, code/backupCode, method}
    API->>Database: Verify reset token
    alt Token Invalid
        API->>User: Error: Token invalid (404)
    else Token Valid
        alt User has 2FA enabled
            API->>Cache: Check if user is locked
            alt User Locked
                API->>User: Error: Temporarily locked (429)
            else Not Locked
                API->>API: Verify 2FA (code or backupCode)
                alt 2FA Invalid
                    API->>Database: Increment attempt
                    alt Attempt >= 5
                        API->>Cache: Set lock
                    end
                    API->>User: Error: Invalid 2FA (401)
                else 2FA Valid
                    API->>Database: Reset attempt to 0
                    API->>Database: Reset password
                    API->>Database: Revoke all sessions
                    API->>User: Success
                end
            end
        else 2FA not enabled
            API->>Database: Reset password
            API->>Database: Revoke all sessions
            API->>User: Success
        end
    end
```

**Disable 2FA:**
```mermaid
sequenceDiagram
    participant User
    participant API
    participant Cache
    participant Database

    User->>API: DELETE /shared/user/2fa/disable<br/>{code/backupCode, method}
    API->>Cache: Check if user is locked
    alt User Locked
        API->>User: Error: Temporarily locked (429)
    else Not Locked
        API->>API: Verify 2FA (code or backupCode)
        alt 2FA Invalid
            API->>Database: Increment attempt
            alt Attempt >= 5
                API->>Cache: Set lock
            end
            API->>User: Error: Invalid 2FA (401)
        else 2FA Valid
            API->>Database: Reset attempt to 0
            API->>Database: Disable 2FA
            API->>Database: Clear secret, IV, backup codes
            API->>User: Success
        end
    end
```

## Error Handling

### HTTP Status Codes

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `twoFactorNotEnabled` | 2FA not enabled for this user |
| 400 | `twoFactorAlreadyEnabled` | 2FA already active |
| 400 | `twoFactorRequiredSetup` | Must complete setup first |
| 400 | `twoFactorNotRequiredSetup` | Setup already completed |
| 401 | `twoFactorInvalid` | Invalid TOTP code or backup code |
| 401 | `twoFactorChallengeInvalid` | Challenge token expired or invalid |
| 429 | `twoFactorAttemptTemporaryLock` | Too many failed attempts, temporarily locked with `retryAfterSeconds` |
| 403 | `inactiveForbidden` | Account inactive |
| 403 | `emailNotVerified` | Email not verified |
| 404 | `notFound` | User not found |

**Note on `twoFactorAttemptTemporaryLock`:** This error occurs when user tries to verify 2FA while locked. Response includes `retryAfterSeconds` indicating when user can retry. Lock is set automatically after the 5th failed attempt (when attempt counter reaches 5). Lock duration increases exponentially with each subsequent lockout.

## Contribution

Special thanks to [ak2g][ref-contributor-ak2g] for main contributor for this feature.

<!-- REFERENCES -->

<!-- BADGE LINKS -->

[ack-contributors-shield]: https://img.shields.io/github/contributors/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-forks-shield]: https://img.shields.io/github/forks/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-stars-shield]: https://img.shields.io/github/stars/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-issues-shield]: https://img.shields.io/github/issues/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-license-shield]: https://img.shields.io/github/license/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[nestjs-shield]: https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white
[nodejs-shield]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[typescript-shield]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[mongodb-shield]: https://img.shields.io/badge/MongoDB-white?style=for-the-badge&logo=mongodb&logoColor=4EA94B
[jwt-shield]: https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white
[jest-shield]: https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white
[pnpm-shield]: https://img.shields.io/badge/pnpm-%232C8EBB.svg?style=for-the-badge&logo=pnpm&logoColor=white&color=F9AD00
[docker-shield]: https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white
[github-shield]: https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white
[linkedin-shield]: https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white

<!-- CONTACTS -->

[ref-author-linkedin]: https://linkedin.com/in/andrechristikan
[ref-author-email]: mailto:andrechristikan@gmail.com
[ref-author-github]: https://github.com/andrechristikan
[ref-author-paypal]: https://www.paypal.me/andrechristikan
[ref-author-kofi]: https://ko-fi.com/andrechristikan

<!-- Repo LINKS -->

[ref-ack]: https://github.com/andrechristikan/ack-nestjs-boilerplate
[ref-ack-issues]: https://github.com/andrechristikan/ack-nestjs-boilerplate/issues
[ref-ack-stars]: https://github.com/andrechristikan/ack-nestjs-boilerplate/stargazers
[ref-ack-forks]: https://github.com/andrechristikan/ack-nestjs-boilerplate/network/members
[ref-ack-contributors]: https://github.com/andrechristikan/ack-nestjs-boilerplate/graphs/contributors
[ref-ack-license]: LICENSE.md

<!-- THIRD PARTY -->

[ref-nestjs]: http://nestjs.com
[ref-nestjs-swagger]: https://docs.nestjs.com/openapi/introduction
[ref-nestjs-swagger-types]: https://docs.nestjs.com/openapi/types-and-parameters
[ref-prisma]: https://www.prisma.io
[ref-mongodb]: https://docs.mongodb.com/
[ref-redis]: https://redis.io
[ref-bullmq]: https://bullmq.io
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-docker]: https://docs.docker.com
[ref-dockercompose]: https://docs.docker.com/compose/
[ref-pnpm]: https://pnpm.io
[ref-12factor]: https://12factor.net
[ref-commander]: https://nest-commander.jaymcdoniel.dev
[ref-package-json]: package.json
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-git]: https://git-scm.com
[ref-google-console]: https://console.cloud.google.com/
[ref-google-client-secret]: https://developers.google.com/identity/protocols/oauth2

<!-- DOCUMENTS -->

[ref-doc-root]: ../readme.md
[ref-doc-activity-log]: activity-log.md
[ref-doc-authentication]: authentication.md
[ref-doc-authorization]: authorization.md
[ref-doc-cache]: cache.md
[ref-doc-configuration]: configuration.md
[ref-doc-database]: database.md
[ref-doc-environment]: environment.md
[ref-doc-feature-flag]: feature-flag.md
[ref-doc-file-upload]: file-upload.md
[ref-doc-handling-error]: handling-error.md
[ref-doc-installation]: installation.md
[ref-doc-logger]: logger.md
[ref-doc-message]: message.md
[ref-doc-pagination]: pagination.md
[ref-doc-project-structure]: project-structure.md
[ref-doc-queue]: queue.md
[ref-doc-request-validation]: request-validation.md
[ref-doc-response]: response.md
[ref-doc-security-and-middleware]: security-and-middleware.md
[ref-doc-doc]: doc.md
[ref-doc-third-party-integration]: third-party-integration.md
[ref-doc-presign]: presign.md
[ref-doc-term-policy]: term-policy.md
[ref-doc-two-factor]: two-factor.md

<!-- CONTRIBUTOR -->

[ref-contributor-gzerox]: https://github.com/Gzerox
[ref-contributor-ak2g]: https://github.com/ak2g
