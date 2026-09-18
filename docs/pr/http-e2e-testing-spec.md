# HTTP E2E Testing Implementation Spec

## Summary

The HTTP E2E suite runs the real Nest application in-process through Vitest and Supertest. It
uses a dedicated Docker Compose PostgreSQL and Redis environment, deterministic fixtures, and a
test configuration with no AWS, Firebase, Sentry, or notification delivery side effects.

The suite is delivered in vertical slices. The route matrix below is the coverage contract for
all 228 controller methods. Each method receives a behavioral test, not only a route-mounted
smoke assertion.

## Current Implementation

- `vitest.e2e.config.mts` isolates `*.e2e-spec.ts` files from the unit suite.
- `test/e2e/setup.ts` loads `.env.e2e` and selects the `test` application environment.
- `test/e2e/support/app.ts` creates and closes an in-process Nest application with the configured
  global prefix and URI versioning.
- `test/e2e/public/hello.e2e-spec.ts` proves the first public route and standard response envelope.
- `docker-compose.e2e.yml` provides isolated PostgreSQL, Redis, and JWKS services.
- `package.json` provides E2E environment start, stop, database reset, and test commands.
- `test:e2e:db:reset` applies the migration history with `prisma migrate reset --force --skip-seed`.
  Baseline records and endpoint fixtures belong to the E2E support layer described below.

### Vitest Config Module Format

The Vitest configuration files use the `.mts` extension, which is the TypeScript equivalent of
an `.mjs` configuration file. This makes the files explicitly ESM to Vite while keeping the
configuration itself type-checked and written in TypeScript. The extension is intentional: the
application and package currently use CommonJS (`.swcrc` sets the module type to `commonjs`, and
the nearest `package.json` does not declare `type: module`). Renaming the configs back to plain
`.ts` while leaving the repository in that mixed state causes Vite's config loader to interpret
ESM syntax as CommonJS and emit the warning seen during E2E discovery.

The long-term preferred state is native ESM for the application and package. Once that migration
is complete, these files can return to `.ts` because the package/module configuration will make
their ESM mode unambiguous. Until then, `.mts` keeps the E2E runner isolated without changing the
module semantics of the application, build output, or unrelated tooling.

The application environment includes `test` as a valid environment. Empty AWS and Firebase
credentials keep the current client services disabled during the starter slice. Later slices
add recording test adapters where an endpoint needs to assert an external call or returned
presign value.

## Runtime And Isolation

The E2E commands are:

```text
cp .env.e2e.example .env.e2e
pnpm test:e2e:env:up
pnpm test:e2e:db:reset
pnpm test:e2e
pnpm test:e2e:env:down
```

The test Compose project uses host ports `55432` for PostgreSQL, `56379` for Redis, and `5311`
for JWKS. Its volumes and network are separate from the development Compose project.

The database reset applies the committed Prisma migration history and skips the application
seeder. The fixture layer owns baseline roles, policies, feature flags, countries, term policies,
API keys, and endpoint-specific records. State-changing cases verify database state through the
real Prisma client.

HTTP requests use the same global prefix, URI versioning, request validation, response
serialization, filters, middleware, authentication, authorization, and workspace context as the
running application.

The main suite does not bind a TCP port. A later smoke command may start the compiled API on an
ephemeral port to validate the production bootstrap path separately.

## External Boundaries

- SES calls are disabled in the test profile. Notification-producing tests later replace the
  delivery boundary with a recording adapter and assert that no real network call occurs.
- S3 calls are disabled in the test profile. Presign tests later use a recording adapter that
  returns deterministic URLs and records only logical bucket, key, size, and accessibility data.
- Firebase calls are disabled in the test profile. Push tests assert queue and delivery intent
  without contacting Firebase.
- Sentry is disabled by an empty test DSN.
- BullMQ uses the isolated test Redis namespace. Workers are not allowed to deliver external
  notifications during HTTP tests.
- File upload tests use Supertest multipart requests and deterministic in-memory test data.
  CSV tests cover row parsing, row validation, row limits, and response errors.

No credential, presign URL, file body, or notification secret is written to logs or test reports.

## Shared E2E Support

The shared support layer under `test/e2e/support/` contains:

- application creation and teardown;
- Supertest request builders;
- bearer authorization, `x-api-key`, `x-workspace-id`, language, and correlation headers;
- deterministic user, role, API key, workspace, project, session, device, policy, term-policy,
  invite, join-request, notification, activity-log, and analytics fixtures;
- database reset, fixture cleanup, and Redis cache cleanup;
- response-envelope, pagination, validation, and exception assertions;
- multipart upload and CSV request builders;
- recording adapters for SES, S3, Firebase, queue dispatch, and Sentry.

Helpers remain explicitly imported. Endpoint-specific request bodies, state transitions, and
assertions remain in module E2E specs.

## Test Case Policy

Each route receives one representative success case plus every material authentication,
authorization, workspace, feature-flag, term-policy, validation, business-rule, and external
boundary failure. Boundary cases cover UUIDs, pagination, dates, file size/count, and CSV row
limits where the behavior changes.

Analytics routes cover explicit and default date ranges, range boundaries, empty aggregates,
pagination, workspace scoping, risk-score composition, anomaly and fraud thresholds, and cache
invalidation after fixture changes.

State-changing routes assert both the HTTP response and the persisted state. Workflow tests reuse
the shared fixture factories but do not share mutable state between test cases.

## HTTP Endpoint Matrix

The application global prefix is `/api`. Router scopes are `/public`, `/system`, `/admin`,
`/user`, and `/shared`. Versioned controllers use `/v1`; neutral hello and health controllers
use the global prefix without a version segment.

### Public

- `GET /api/public/hello` - `HelloPublicController.hello`
- `GET /api/v1/public/country/list` - `CountryPublicController.list`
- `GET /api/v1/public/term-policy/list` - `TermPolicyPublicController.list`
- `POST /api/v1/public/user/login/credential` - `UserPublicController.loginWithCredential`
- `POST /api/v1/public/user/login/social/google` - `UserPublicController.loginWithGoogle`
- `POST /api/v1/public/user/login/social/apple` - `UserPublicController.loginWithApple`
- `POST /api/v1/public/user/sign-up` - `UserPublicController.signUp`
- `PATCH /api/v1/public/user/email/verify` - `UserPublicController.verifyEmail`
- `POST /api/v1/public/user/email/send` - `UserPublicController.sendEmailVerification`
- `POST /api/v1/public/user/password/forgot` - `UserPublicController.forgotPassword`
- `PATCH /api/v1/public/user/password/reset` - `UserPublicController.reset`
- `PATCH /api/v1/public/user/login/2fa/verify` - `UserPublicController.loginVerifyTwoFactor`
- `POST /api/v1/public/user/login/2fa/enable` - `UserPublicController.verifyLoginTwoFactor`
- `GET /api/v1/public/workspace/invite/:inviteToken/preview` - `WorkspacePublicController.invitePreview`
- `GET /api/v1/public/workspace/preview/:slug` - `WorkspacePublicController.preview`

### System

- `GET /api/health/aws` - `HealthSystemController.checkAws`
- `GET /api/health/database` - `HealthSystemController.checkDatabase`
- `GET /api/health/third-party` - `HealthSystemController.checkThirdParty`
- `GET /api/health/instance` - `HealthSystemController.checkInstance`
- `GET /api/v1/system/feature-flag/list` - `FeatureFlagSystemController.list`
- `GET /api/v1/system/role/list` - `RoleSystemController.list`
- `GET /api/v1/system/role/:roleId/policy/list` - `PolicySystemController.listByRole`
- `POST /api/v1/system/user/username/check` - `UserSystemController.checkUsername`
- `POST /api/v1/system/user/email/check` - `UserSystemController.checkEmail`

### Admin

- `GET /api/v1/admin/analytic/users/registrations` - `AnalyticDashboardAdminController.usersRegistrations`
- `GET /api/v1/admin/analytic/users/churn` - `AnalyticDashboardAdminController.usersChurn`
- `GET /api/v1/admin/analytic/users/blocked` - `AnalyticDashboardAdminController.usersBlocked`
- `GET /api/v1/admin/analytic/users/sign-up-with` - `AnalyticDashboardAdminController.usersSignUpWith`
- `GET /api/v1/admin/analytic/users/sign-up-from` - `AnalyticDashboardAdminController.usersSignUpFrom`
- `GET /api/v1/admin/analytic/users/email-verification` - `AnalyticDashboardAdminController.usersEmailVerification`
- `GET /api/v1/admin/analytic/users/mobile-verification` - `AnalyticDashboardAdminController.usersMobileVerification`
- `GET /api/v1/admin/analytic/users/status-distribution` - `AnalyticDashboardAdminController.usersStatusDistribution`
- `GET /api/v1/admin/analytic/users/country-distribution` - `AnalyticDashboardAdminController.usersCountryDistribution`
- `GET /api/v1/admin/analytic/users/role-distribution` - `AnalyticDashboardAdminController.usersRoleDistribution`
- `GET /api/v1/admin/analytic/users/self-delete` - `AnalyticDashboardAdminController.usersSelfDelete`
- `GET /api/v1/admin/analytic/users/claim-username` - `AnalyticDashboardAdminController.usersClaimUsername`
- `GET /api/v1/admin/analytic/users/mobile-churn` - `AnalyticDashboardAdminController.usersMobileChurn`
- `GET /api/v1/admin/analytic/auth/login-frequency` - `AnalyticDashboardAdminController.authLoginFrequency`
- `GET /api/v1/admin/analytic/auth/login-method` - `AnalyticDashboardAdminController.authLoginMethod`
- `GET /api/v1/admin/analytic/auth/login-source` - `AnalyticDashboardAdminController.authLoginSource`
- `GET /api/v1/admin/analytic/auth/lockout` - `AnalyticDashboardAdminController.authLockout`
- `GET /api/v1/admin/analytic/auth/session-revoke` - `AnalyticDashboardAdminController.authSessionRevoke`
- `GET /api/v1/admin/analytic/auth/concurrent-sessions` - `AnalyticDashboardAdminController.authConcurrentSessions`
- `GET /api/v1/admin/analytic/auth/sessions-geo` - `AnalyticDashboardAdminController.authSessionsGeo`
- `GET /api/v1/admin/analytic/auth/sessions-user-agent` - `AnalyticDashboardAdminController.authSessionsUserAgent`
- `GET /api/v1/admin/analytic/auth/refresh-token-volume` - `AnalyticDashboardAdminController.authRefreshTokenVolume`
- `GET /api/v1/admin/analytic/auth/logout-rate` - `AnalyticDashboardAdminController.authLogoutRate`
- `GET /api/v1/admin/analytic/auth/verification-funnel` - `AnalyticDashboardAdminController.authVerificationFunnel`
- `GET /api/v1/admin/analytic/auth/password-expiry` - `AnalyticDashboardAdminController.authPasswordExpiry`
- `GET /api/v1/admin/analytic/auth/password-change` - `AnalyticDashboardAdminController.authPasswordChange`
- `GET /api/v1/admin/analytic/auth/forgot-password-conversion` - `AnalyticDashboardAdminController.authForgotPasswordConversion`
- `GET /api/v1/admin/analytic/auth/admin-force-password` - `AnalyticDashboardAdminController.authAdminForcePassword`
- `GET /api/v1/admin/analytic/auth/two-factor-adoption` - `AnalyticDashboardAdminController.authTwoFactorAdoption`
- `GET /api/v1/admin/analytic/auth/two-factor-admin-reset` - `AnalyticDashboardAdminController.authTwoFactorAdminReset`
- `GET /api/v1/admin/analytic/auth/two-factor-verify-success` - `AnalyticDashboardAdminController.authTwoFactorVerifySuccess`
- `GET /api/v1/admin/analytic/auth/backup-code-regen` - `AnalyticDashboardAdminController.authBackupCodeRegen`
- `GET /api/v1/admin/analytic/auth/two-factor-attempt` - `AnalyticDashboardAdminController.authTwoFactorAttempt`
- `GET /api/v1/admin/analytic/devices/registration` - `AnalyticDashboardAdminController.devicesRegistration`
- `GET /api/v1/admin/analytic/devices/platform` - `AnalyticDashboardAdminController.devicesPlatform`
- `GET /api/v1/admin/analytic/devices/push-token` - `AnalyticDashboardAdminController.devicesPushToken`
- `GET /api/v1/admin/analytic/devices/info-refresh` - `AnalyticDashboardAdminController.devicesInfoRefresh`
- `GET /api/v1/admin/analytic/devices/session-ratio` - `AnalyticDashboardAdminController.devicesSessionRatio`
- `GET /api/v1/admin/analytic/devices/per-user` - `AnalyticDashboardAdminController.devicesPerUser`
- `GET /api/v1/admin/analytic/devices/inactivity` - `AnalyticDashboardAdminController.devicesInactivity`
- `GET /api/v1/admin/analytic/api-keys/lifecycle` - `AnalyticDashboardAdminController.apiKeysLifecycle`
- `GET /api/v1/admin/analytic/api-keys/active-expired` - `AnalyticDashboardAdminController.apiKeysActiveExpired`
- `GET /api/v1/admin/analytic/api-keys/type-mix` - `AnalyticDashboardAdminController.apiKeysTypeMix`
- `GET /api/v1/admin/analytic/term-policies/acceptance-rate` - `AnalyticDashboardAdminController.termPoliciesAcceptanceRate`
- `GET /api/v1/admin/analytic/term-policies/time-to-accept` - `AnalyticDashboardAdminController.termPoliciesTimeToAccept`
- `GET /api/v1/admin/analytic/workspaces/creation` - `AnalyticDashboardAdminController.workspacesCreation`
- `GET /api/v1/admin/analytic/workspaces/visibility` - `AnalyticDashboardAdminController.workspacesVisibility`
- `GET /api/v1/admin/analytic/workspaces/invite-funnel` - `AnalyticDashboardAdminController.workspacesInviteFunnel`
- `GET /api/v1/admin/analytic/workspaces/join-outcomes` - `AnalyticDashboardAdminController.workspacesJoinOutcomes`
- `GET /api/v1/admin/analytic/workspaces/membership` - `AnalyticDashboardAdminController.workspacesMembership`
- `GET /api/v1/admin/analytic/workspaces/activity-volume` - `AnalyticDashboardAdminController.workspacesActivityVolume`
- `GET /api/v1/admin/analytic/projects/creation` - `AnalyticDashboardAdminController.projectsCreation`
- `GET /api/v1/admin/analytic/projects/membership` - `AnalyticDashboardAdminController.projectsMembership`
- `GET /api/v1/admin/analytic/anomaly/impossible-travel` - `AnalyticAnomalyAdminController.impossibleTravel`
- `GET /api/v1/admin/analytic/anomaly/impossible-travel/list` - `AnalyticAnomalyAdminController.impossibleTravelList`
- `GET /api/v1/admin/analytic/anomaly/login-spike-ip` - `AnalyticAnomalyAdminController.loginSpikeIp`
- `GET /api/v1/admin/analytic/anomaly/login-spike-ip/list` - `AnalyticAnomalyAdminController.loginSpikeIpList`
- `GET /api/v1/admin/analytic/anomaly/failed-login-spike` - `AnalyticAnomalyAdminController.failedLoginSpike`
- `GET /api/v1/admin/analytic/anomaly/failed-login-spike/list` - `AnalyticAnomalyAdminController.failedLoginSpikeList`
- `GET /api/v1/admin/analytic/anomaly/device-proliferation` - `AnalyticAnomalyAdminController.deviceProliferation`
- `GET /api/v1/admin/analytic/anomaly/device-proliferation/list` - `AnalyticAnomalyAdminController.deviceProliferationList`
- `GET /api/v1/admin/analytic/anomaly/login-time` - `AnalyticAnomalyAdminController.loginTime`
- `GET /api/v1/admin/analytic/anomaly/login-time/list` - `AnalyticAnomalyAdminController.loginTimeList`
- `GET /api/v1/admin/analytic/fraud/credential-stuffing` - `AnalyticFraudAdminController.credentialStuffing`
- `GET /api/v1/admin/analytic/fraud/credential-stuffing/list` - `AnalyticFraudAdminController.credentialStuffingList`
- `GET /api/v1/admin/analytic/fraud/account-takeover` - `AnalyticFraudAdminController.accountTakeover`
- `GET /api/v1/admin/analytic/fraud/account-takeover/list` - `AnalyticFraudAdminController.accountTakeoverList`
- `GET /api/v1/admin/analytic/fraud/mass-registration` - `AnalyticFraudAdminController.massRegistration`
- `GET /api/v1/admin/analytic/fraud/mass-registration/list` - `AnalyticFraudAdminController.massRegistrationList`
- `GET /api/v1/admin/analytic/fraud/password-reset-enumeration` - `AnalyticFraudAdminController.passwordResetEnumeration`
- `GET /api/v1/admin/analytic/fraud/password-reset-enumeration/list` - `AnalyticFraudAdminController.passwordResetEnumerationList`
- `GET /api/v1/admin/analytic/fraud/shared-fingerprint` - `AnalyticFraudAdminController.sharedFingerprint`
- `GET /api/v1/admin/analytic/fraud/shared-fingerprint/list` - `AnalyticFraudAdminController.sharedFingerprintList`
- `GET /api/v1/admin/analytic/fraud/session-after-admin` - `AnalyticFraudAdminController.sessionAfterAdmin`
- `GET /api/v1/admin/analytic/fraud/session-after-admin/list` - `AnalyticFraudAdminController.sessionAfterAdminList`
- `GET /api/v1/admin/analytic/fraud/forgot-password-token-abuse` - `AnalyticFraudAdminController.forgotPasswordTokenAbuse`
- `GET /api/v1/admin/analytic/fraud/forgot-password-token-abuse/list` - `AnalyticFraudAdminController.forgotPasswordTokenAbuseList`
- `GET /api/v1/admin/analytic/fraud/refresh-spike` - `AnalyticFraudAdminController.refreshSpike`
- `GET /api/v1/admin/analytic/fraud/refresh-spike/list` - `AnalyticFraudAdminController.refreshSpikeList`
- `GET /api/v1/admin/analytic/fraud/backup-code-new-device` - `AnalyticFraudAdminController.backupCodeNewDevice`
- `GET /api/v1/admin/analytic/fraud/backup-code-new-device/list` - `AnalyticFraudAdminController.backupCodeNewDeviceList`
- `GET /api/v1/admin/analytic/fraud/api-key-burst` - `AnalyticFraudAdminController.apiKeyBurst`
- `GET /api/v1/admin/analytic/fraud/api-key-burst/list` - `AnalyticFraudAdminController.apiKeyBurstList`
- `GET /api/v1/admin/analytic/fraud/risk-score/:userId` - `AnalyticFraudAdminController.riskScore`
- `GET /api/v1/admin/analytic/fraud/risk-scores` - `AnalyticFraudAdminController.riskScores`
- `GET /api/v1/admin/activity-log/user/:userId/list` - `ActivityLogAdminController.listByUser`
- `GET /api/v1/admin/activity-log/workspace/:workspaceId/list` - `ActivityLogAdminController.listByWorkspace`
- `GET /api/v1/admin/api-key/list` - `ApiKeyAdminController.list`
- `POST /api/v1/admin/api-key/create` - `ApiKeyAdminController.create`
- `PATCH /api/v1/admin/api-key/reset/:apiKeyId` - `ApiKeyAdminController.reset`
- `PUT /api/v1/admin/api-key/update/:apiKeyId` - `ApiKeyAdminController.update`
- `PUT /api/v1/admin/api-key/update/:apiKeyId/date` - `ApiKeyAdminController.updateDate`
- `PATCH /api/v1/admin/api-key/update/:apiKeyId/status` - `ApiKeyAdminController.updateStatus`
- `DELETE /api/v1/admin/api-key/delete/:apiKeyId` - `ApiKeyAdminController.delete`
- `GET /api/v1/admin/user/:userId/device/list` - `DeviceAdminController.list`
- `DELETE /api/v1/admin/user/:userId/device/remove/:deviceOwnershipId` - `DeviceAdminController.remove`
- `GET /api/v1/admin/feature-flag/list` - `FeatureFlagAdminController.list`
- `PATCH /api/v1/admin/feature-flag/update/:featureFlagId/status` - `FeatureFlagAdminController.updateStatus`
- `PUT /api/v1/admin/feature-flag/update/:featureFlagId/metadata` - `FeatureFlagAdminController.update`
- `GET /api/v1/admin/user/:userId/password-history/list` - `PasswordHistoryAdminController.list`
- `GET /api/v1/admin/role/:roleId/policy/list` - `PolicyAdminController.list`
- `POST /api/v1/admin/role/:roleId/policy/create` - `PolicyAdminController.create`
- `PUT /api/v1/admin/role/:roleId/policy/update/:policyId` - `PolicyAdminController.update`
- `DELETE /api/v1/admin/role/:roleId/policy/delete/:policyId` - `PolicyAdminController.delete`
- `GET /api/v1/admin/project/list` - `ProjectAdminController.list`
- `GET /api/v1/admin/project/get/:projectId` - `ProjectAdminController.get`
- `GET /api/v1/admin/role/list` - `RoleAdminController.list`
- `GET /api/v1/admin/role/get/:roleId` - `RoleAdminController.get`
- `POST /api/v1/admin/role/create` - `RoleAdminController.create`
- `PUT /api/v1/admin/role/update/:roleId` - `RoleAdminController.update`
- `DELETE /api/v1/admin/role/delete/:roleId` - `RoleAdminController.delete`
- `GET /api/v1/admin/user/:userId/session/list` - `SessionAdminController.list`
- `DELETE /api/v1/admin/user/:userId/session/revoke/:sessionId` - `SessionAdminController.revoke`
- `GET /api/v1/admin/term-policy/list` - `TermPolicyAdminController.list`
- `POST /api/v1/admin/term-policy/create` - `TermPolicyAdminController.create`
- `DELETE /api/v1/admin/term-policy/delete/:termPolicyId` - `TermPolicyAdminController.delete`
- `POST /api/v1/admin/term-policy/content/presign/generate` - `TermPolicyAdminController.generate`
- `PUT /api/v1/admin/term-policy/content/:termPolicyId/update` - `TermPolicyAdminController.updateContent`
- `PUT /api/v1/admin/term-policy/content/:termPolicyId/add` - `TermPolicyAdminController.addContent`
- `DELETE /api/v1/admin/term-policy/content/:termPolicyId/remove` - `TermPolicyAdminController.removeContent`
- `GET /api/v1/admin/term-policy/content/:termPolicyId/:language/get` - `TermPolicyAdminController.getContent`
- `PATCH /api/v1/admin/term-policy/publish/:termPolicyId` - `TermPolicyAdminController.publish`
- `GET /api/v1/admin/user/list` - `UserAdminController.list`
- `GET /api/v1/admin/user/get/:userId` - `UserAdminController.get`
- `POST /api/v1/admin/user/create` - `UserAdminController.create`
- `PATCH /api/v1/admin/user/update/:userId/status` - `UserAdminController.updateStatus`
- `PUT /api/v1/admin/user/update/:userId/password` - `UserAdminController.updatePassword`
- `PATCH /api/v1/admin/user/2fa/:userId/reset` - `UserAdminController.resetTwoFactorByAdmin`
- `POST /api/v1/admin/user/import` - `UserAdminController.import`
- `POST /api/v1/admin/user/export` - `UserAdminController.export`
- `GET /api/v1/admin/workspace/list` - `WorkspaceAdminController.list`
- `GET /api/v1/admin/workspace/get/:workspaceId` - `WorkspaceAdminController.get`
- `GET /api/v1/admin/workspace/get/:workspaceId/members` - `WorkspaceAdminController.membersList`

### User

- `GET /api/v1/user/analytic/workspace/summary` - `AnalyticUserController.workspaceSummary`
- `GET /api/v1/user/analytic/workspace/invite-funnel` - `AnalyticUserAdminController.inviteFunnel`
- `GET /api/v1/user/analytic/workspace/join-outcomes` - `AnalyticUserAdminController.joinOutcomes`
- `GET /api/v1/user/analytic/workspace/member-roles` - `AnalyticUserAdminController.memberRoles`
- `GET /api/v1/user/analytic/workspace/activity` - `AnalyticUserAdminController.activity`
- `GET /api/v1/user/project/list` - `ProjectUserController.list`
- `POST /api/v1/user/project/create` - `ProjectUserController.create`
- `GET /api/v1/user/project/get/:projectId` - `ProjectUserController.get`
- `PUT /api/v1/user/project/update/:projectId` - `ProjectUserController.update`
- `PATCH /api/v1/user/project/update/:projectId/slug` - `ProjectUserController.updateSlug`
- `DELETE /api/v1/user/project/delete/:projectId` - `ProjectUserController.softDelete`
- `GET /api/v1/user/project/member/:projectId/list` - `ProjectUserController.memberList`
- `POST /api/v1/user/project/member/:projectId/assign` - `ProjectUserController.memberAssign`
- `PATCH /api/v1/user/project/member/:projectId/:projectMemberId/role/update` - `ProjectUserController.memberUpdateRole`
- `DELETE /api/v1/user/project/member/:projectId/:projectMemberId/remove` - `ProjectUserController.memberRemove`
- `POST /api/v1/user/project/member/:projectId/leave` - `ProjectUserController.memberLeave`
- `DELETE /api/v1/user/user/self/delete` - `UserUserController.deleteSelf`
- `GET /api/v1/user/workspace/list` - `WorkspaceUserController.list`
- `POST /api/v1/user/workspace/create` - `WorkspaceUserController.create`
- `GET /api/v1/user/workspace/get` - `WorkspaceUserController.get`
- `PUT /api/v1/user/workspace/update` - `WorkspaceUserController.update`
- `PATCH /api/v1/user/workspace/update/is-public` - `WorkspaceUserController.updateIsPublic`
- `PATCH /api/v1/user/workspace/update/slug` - `WorkspaceUserController.updateSlug`
- `POST /api/v1/user/workspace/switch` - `WorkspaceUserController.switch`
- `POST /api/v1/user/workspace/ownership/transfer` - `WorkspaceUserController.ownershipTransfer`
- `POST /api/v1/user/workspace/leave` - `WorkspaceUserController.leave`
- `DELETE /api/v1/user/workspace/delete` - `WorkspaceUserController.softDelete`
- `GET /api/v1/user/workspace/member/list` - `WorkspaceUserController.memberList`
- `PATCH /api/v1/user/workspace/member/:workspaceMemberId/role/update` - `WorkspaceUserController.memberUpdateRole`
- `DELETE /api/v1/user/workspace/member/:workspaceMemberId/remove` - `WorkspaceUserController.memberRemove`
- `GET /api/v1/user/workspace/invite/list` - `WorkspaceUserController.inviteList`
- `POST /api/v1/user/workspace/invite/create` - `WorkspaceUserController.inviteCreate`
- `POST /api/v1/user/workspace/invite/:workspaceInviteId/resend` - `WorkspaceUserController.inviteResend`
- `DELETE /api/v1/user/workspace/invite/:workspaceInviteId/revoke` - `WorkspaceUserController.inviteRevoke`
- `POST /api/v1/user/workspace/invite/claim` - `WorkspaceUserController.inviteClaim`
- `POST /api/v1/user/workspace/join-request/create` - `WorkspaceUserController.joinRequestCreate`
- `GET /api/v1/user/workspace/join-request/list` - `WorkspaceUserController.joinRequestList`
- `POST /api/v1/user/workspace/join-request/:workspaceJoinRequestId/accept` - `WorkspaceUserController.joinRequestAccept`
- `POST /api/v1/user/workspace/join-request/:workspaceJoinRequestId/reject` - `WorkspaceUserController.joinRequestReject`

### Shared

- `GET /api/v1/shared/user/activity-log/list` - `ActivityLogSharedController.listSelf`
- `GET /api/v1/shared/user/activity-log/workspace/list` - `ActivityLogSharedController.listSelfByWorkspace`
- `GET /api/v1/shared/user/device/list` - `DeviceSharedController.list`
- `POST /api/v1/shared/user/device/refresh` - `DeviceSharedController.refresh`
- `DELETE /api/v1/shared/user/device/remove/:deviceOwnershipId` - `DeviceSharedController.remove`
- `GET /api/v1/shared/notification/list` - `NotificationSharedController.list`
- `GET /api/v1/shared/notification/setting/list` - `NotificationSharedController.listUserSetting`
- `PATCH /api/v1/shared/notification/update/:notificationId/read` - `NotificationSharedController.markAsRead`
- `POST /api/v1/shared/notification/update/read` - `NotificationSharedController.markAllAsRead`
- `PUT /api/v1/shared/notification/setting/update` - `NotificationSharedController.updateUserSetting`
- `GET /api/v1/shared/user/password-history/list` - `PasswordHistorySharedController.list`
- `GET /api/v1/shared/user/session/list` - `SessionSharedController.list`
- `DELETE /api/v1/shared/user/session/revoke/:sessionId` - `SessionSharedController.revoke`
- `GET /api/v1/shared/user/term-policy/acceptance/list` - `TermPolicySharedController.listAccepted`
- `POST /api/v1/shared/user/term-policy/accept` - `TermPolicySharedController.accept`
- `POST /api/v1/shared/user/refresh` - `UserSharedController.refresh`
- `GET /api/v1/shared/user/profile/get` - `UserSharedController.profile`
- `PUT /api/v1/shared/user/profile/update` - `UserSharedController.updateProfile`
- `POST /api/v1/shared/user/profile/photo/presign/generate` - `UserSharedController.generatePhotoProfilePresign`
- `PUT /api/v1/shared/user/profile/photo/update` - `UserSharedController.updatePhotoProfile`
- `POST /api/v1/shared/user/profile/photo/upload` - `UserSharedController.uploadPhotoProfile`
- `PATCH /api/v1/shared/user/password/change` - `UserSharedController.changePassword`
- `POST /api/v1/shared/user/mobile-number/add` - `UserSharedController.addMobileNumber`
- `PUT /api/v1/shared/user/mobile-number/:mobileNumberId/update` - `UserSharedController.updateMobileNumber`
- `DELETE /api/v1/shared/user/mobile-number/:mobileNumberId/delete` - `UserSharedController.deleteMobileNumber`
- `POST /api/v1/shared/user/username/claim` - `UserSharedController.claimUsername`
- `GET /api/v1/shared/user/2fa/status/get` - `UserSharedController.getTwoFactorStatus`
- `POST /api/v1/shared/user/2fa/setup` - `UserSharedController.setupTwoFactor`
- `POST /api/v1/shared/user/2fa/enable` - `UserSharedController.enableTwoFactor`
- `DELETE /api/v1/shared/user/2fa/disable` - `UserSharedController.disableTwoFactor`
- `POST /api/v1/shared/user/2fa/backup-code/regenerate` - `UserSharedController.regenerateTwoFactorBackupCodes`
- `POST /api/v1/shared/user/logout` - `UserSharedController.logout`

## Delivery Phases

1. Stabilize the E2E runtime, database bootstrap, fixture factories, request helpers, and
   external recording adapters.
2. Cover public and system authentication, health, reference-data, and validation workflows.
3. Cover shared authenticated identity workflows, including sessions, devices, notifications,
   password, mobile number, two-factor, and term-policy acceptance.
4. Cover workspace and project workflows with workspace header and membership authorization.
5. Cover administrative role, policy, API key, user, activity-log, feature-flag, term-policy,
   device, session, workspace, and project workflows.
6. Cover administrative and workspace analytics, including dashboard aggregates, anomaly
   detection, fraud signals, date windows, pagination, and cache behavior.
7. Cover multipart upload, CSV import/export, presigning, and file response behavior.
8. Add the negative authorization matrix and enforce one behavioral test for every matrix entry.
9. Add the optional compiled-process smoke suite.

## Acceptance Criteria

- All 228 controller methods appear in the matrix and receive behavioral coverage.
- Protected routes cover valid and representative invalid authentication and authorization.
- Workspace routes cover `x-workspace-id` resolution and membership failures.
- System routes cover `x-api-key` validation and API-key type restrictions.
- Request schemas and response envelopes run through the real global pipeline.
- State-changing routes verify persisted state.
- Analytics routes verify date-window boundaries, empty and populated aggregates, pagination,
  scope enforcement, risk-score composition, and cache isolation.
- External adapters prove that SES, S3, Firebase, Sentry, and production delivery workers receive
  no test traffic.
- E2E application, database, Redis, and queue resources close after success and failure.
- `pnpm typecheck`, `pnpm lint`, targeted E2E tests, and the unit suite pass.

## References

- https://docs.nestjs.com/fundamentals/testing
- https://docs.docker.com/compose/intro/features-uses/
- https://docs.docker.com/compose/how-tos/profiles/
- https://testcontainers.com/guides/getting-started-with-testcontainers-for-nodejs/
- https://martinfowler.com/articles/practical-test-pyramid.html
