# Status Codes

Application `statusCode` values, grouped by module.

- `statusCode` is the field on `AppBaseException` / `ResponseErrorDto`.
- It is **not** an HTTP status.

Related fields on the same error response:

- `httpStatus`: separate field
- `module` + `statusCodeKey`: identify an error more stably than the raw integer, which is why the envelope carries both

The machine registry is the `*.status-code.enum.ts` files under `src/`.

This page is the human catalog.

- A new module takes the next free hundred in the block map below
- Every status code is five digits
- A new member inside an existing block takes the next sequential number with no gaps
- Scan the `*.status-code.enum.ts` files under `src/` before allocating
- Reuse a member that already means what you need
- Error filter flow: [Handling Error](handling-error.md)
- i18n paths: [Language Message](language-message.md)
- Response shape: [Response](response.md)

## Block map

| Base    | Module         | Range           | Members |
| ------- | -------------- | --------------- | ------- |
| `50000` | `app`          | `50000`         | 1       |
| `50100` | `file`         | `50100`–`50109` | 10      |
| `50200` | `pagination`   | `50200`–`50213` | 14      |
| `50300` | `request`      | `50300`–`50304` | 5       |
| `50400` | `session`      | `50400`–`50401` | 2       |
| `50500` | `role`         | `50500`–`50503` | 4       |
| `50600` | `feature-flag` | `50600`–`50603` | 4       |
| `50700` | `api-key`      | `50700`–`50707` | 8       |
| `50800` | `auth`         | `50800`–`50820` | 21      |
| `50900` | `country`      | `50900`–`50902` | 3       |
| `51000` | `user`         | `51000`–`51027` | 28      |
| `51100` | `policy`       | `51100`–`51103` | 4       |
| `51200` | `notification` | `51200`–`51203` | 4       |
| `51300` | `device`       | `51300`         | 1       |
| `51400` | `aws`          | `51400`–`51406` | 7       |
| `51500` | `term-policy`  | `51500`–`51510` | 11      |
| `51600` | `workspace`    | `51600`–`51623` | 24      |
| `51700` | `project`      | `51700`–`51709` | 10      |
| `51800` | `database`     | `51800`–`51802` | 3       |
| `51900` | `response`     | `51900`–`51903` | 4       |
| `52000` | `activity-log` | `52000`         | 1       |
| `52100` | `analytic`     | `52100`         | 1       |
| `52200` | `helper`       | `52200`–`52202` | 3       |
| `52300` | `firebase`     | `52300`         | 1       |
| `52400` | `redis`        | `52400`         | 1       |

- Next free hundred: `52500`.
- The enum files are the source of this map.

## `app`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `unknown` | `50000` | `unknown` | 500 (`INTERNAL_SERVER_ERROR`) | `http.serverError.internalServerError` | Internal Server Error |

## `file`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `required` | `50100` | `required` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.required` | This field is required and cannot be left blank. |
| `extensionInvalid` | `50101` | `extensionInvalid` | 415 (`UNSUPPORTED_MEDIA_TYPE`) | `file.error.extensionInvalid` | The file extension is invalid. |
| `requiredExtractFirst` | `50102` | `requiredExtractFirst` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.requiredExtractFirst` | Please extract the data before proceeding. |
| `exceedMaxDataImport` | `50103` | `exceedMaxDataImport` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.exceedMaxDataImport` | The number of data rows exceeds the maximum allowed for import. |
| `exceedMaxDataExport` | `50104` | `exceedMaxDataExport` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.exceedMaxDataExport` | The number of data rows exceeds the maximum allowed for export. Please narrow the filter and try again. |
| `exceedMaxSizeExport` | `50105` | `exceedMaxSizeExport` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.exceedMaxSizeExport` | The exported file exceeds the maximum allowed size. Please narrow the filter and try again. |
| `exceedMaxSizeUpload` | `50106` | `exceedMaxSizeUpload` | 413 (`PAYLOAD_TOO_LARGE`) | `file.error.exceedMaxSizeUpload` | The uploaded file exceeds the maximum allowed size. |
| `exceedMaxFiles` | `50107` | `exceedMaxFiles` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.exceedMaxFiles` | The number of uploaded files exceeds the maximum allowed. |
| `fieldUnexpected` | `50108` | `fieldUnexpected` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.fieldUnexpected` | The uploaded file was sent to a field this endpoint does not accept. |
| `multipartInvalid` | `50109` | `multipartInvalid` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.multipartInvalid` | The multipart request body is malformed. |

## `pagination`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `filterInvalidValue` | `50200` | `filterInvalidValue` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.filterInvalidValue` or `pagination.error.filterInvalidValueEnum` | '{property}' value provided is invalid (enum variant uses the Enum messagePath). |
| `invalidPerPage` | `50201` | `invalidPerPage` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidPerPage` | The 'perPage' parameter must be between 1 and {maxPerPage}. |
| `invalidCursorPaginationParams` | `50202` | `invalidCursorPaginationParams` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidCursorPaginationParams` | Invalid cursor pagination parameters provided. |
| `cursorTooLong` | `50203` | `cursorTooLong` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.cursorTooLong` | The cursor length must not exceed {maxCursorLength} characters. |
| `invalidCursorFormat` | `50204` | `invalidCursorFormat` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidCursorFormat` | The provided cursor is not in a valid format. |
| `invalidOffsetPaginationParams` | `50205` | `invalidOffsetPaginationParams` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidOffsetPaginationParams` | Invalid offset pagination parameters provided. |
| `invalidPage` | `50206` | `invalidPage` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidPage` | The 'page' parameter must be a positive integer and maximum {maxPage}. |
| `pageExceedsMaximum` | `50207` | `pageExceedsMaximum` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.pageExceedsMaximum` | The 'page' parameter exceeds the maximum allowed value of {maxPage}. Received: {receivedPage}. |
| `pageCannotBeLessThanOne` | `50208` | `pageCannotBeLessThanOne` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.pageCannotBeLessThanOne` | The 'page' parameter cannot be less than {minPage}. Received: {receivedPage}. |
| `perPageExceedsMaximum` | `50209` | `perPageExceedsMaximum` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.perPageExceedsMaximum` | The 'perPage' parameter exceeds the maximum allowed value of {maxPerPage}. Received: {receivedPerPage}. |
| `perPageCannotBeLessThanOne` | `50210` | `perPageCannotBeLessThanOne` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.perPageCannotBeLessThanOne` | The 'perPage' parameter cannot be less than {minPerPage}. Received: {receivedPerPage}. |
| `invalidCursorData` | `50211` | `invalidCursorData` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidCursorData` | The provided cursor data is invalid. |
| `failedToEncodeCursor` | `50212` | `failedToEncodeCursor` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.failedToEncodeCursor` | Failed to encode cursor data. |
| `failedToDecodeCursor` | `50213` | `failedToDecodeCursor` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.failedToDecodeCursor` | Failed to decode cursor data. |

- Each list request schema validates `orderBy` against the route's allow-list of fields and directions.
- An `orderBy` value outside the allow-list answers 422 with the request validation code `50300`, not a pagination code.

## `request`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `validation` | `50300` | `validation` | 422 (`UNPROCESSABLE_ENTITY`) | `request.error.validation` | There are validation errors. |
| `timeout` | `50301` | `timeout` | 408 (`REQUEST_TIMEOUT`) | `http.clientError.requestTimeOut` | Request Timeout |
| `envNotAllowed` | `50302` | `envNotAllowed` | 404 (`NOT_FOUND`) | `http.clientError.notFound` | Not Found |
| `schemaMissing` | `50303` | `schemaMissing` | 500 (`INTERNAL_SERVER_ERROR`) | `request.error.schemaMissing` | The request could not be validated. Please try again later. |
| `contextMissing` | `50304` | `contextMissing` | 500 (`INTERNAL_SERVER_ERROR`) | `request.error.contextMissing` | The request could not be processed. Please try again later. |

- `envNotAllowed` is raised by `RequestEnvGuard` when the current app environment is not in the route's allowed list, so the route answers as if it does not exist.
- `RequestContextMissingException` raises `contextMissing` in these cases:
    - `@RequestIPAddress()`, `@RequestUserAgent()`, or `@RequestGeoLocation()` finds no value in the request-log store, because the middleware that writes it has no exception of its own;
    - any store parameter decorator, or `@AuthJwtPayload(field)`, is asked for a field whose value is `null`;
    - `UserDomain.validateUserGuard` receives a JWT payload with no `userId`;
    - `ProjectDomain.validateProjectGuard` finds no `:projectId` route param;
    - `UserLoginDomain` finds no request-log store entry while it opens or refreshes a session.
- A decorator that reads a value a guard stores answers that guard's exception when the store entry is empty:
    - `AuthJwtGuardMissingException` (`50820`) for `@AuthJwtPayload()`
    - `UserGuardMissingException` (`51027`) for `@UserCurrent()` and `@RoleCurrent()`
    - `PolicyGuardMissingException` (`51103`) for `@PolicyCurrent()`
    - `WorkspaceGuardMissingException` (`51622`) for `@WorkspaceCurrent()`
    - `WorkspaceMemberGuardMissingException` (`51623`) for `@WorkspaceMemberCurrent()`
    - `ProjectGuardMissingException` (`51708`) for `@ProjectCurrent()`
    - `ProjectMemberGuardMissingException` (`51709`) for `@ProjectMemberCurrent()`
    - `ApiKeyGuardMissingException` (`50707`) for `@ApiKeyPayload()`
- Each guard throws the same guard-only exception when the store entry a guard below it should have written is empty. No check runs when a route is decorated; the failure surfaces on the request.
- See [Security and Middleware](security-and-middleware.md#store-parameter-decorators).

`50300` is the one code shared by more than one exception class, so it does not map to a single `httpStatus`, `messagePath`, or `module`:

| exception | module | httpStatus | messagePath |
| --- | --- | --- | --- |
| `RequestValidationException` | `request` | 422 (`UNPROCESSABLE_ENTITY`) | `request.error.validation` |
| `FileImportException` | `file` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.validationDto` |

Read `module` together with `statusCode` when branching on this one: `FileImportException` reports `module: 'file'` while carrying a code from the `request` block.

## `session`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `50400` | `notFound` | 404 (`NOT_FOUND`) | `session.error.notFound` | Sorry, we couldn't find the session. |
| `revoked` | `50401` | `revoked` | 401 (`UNAUTHORIZED`) | `session.error.revoked` | Your session has expired or been revoked. Please sign in again. |

- `revoked` is raised by the JWT access and refresh strategies for a missing session key or a `jti` mismatch.
- `UserLoginDomain.refreshSession` and `SessionDomain.updateJtiInTx` raise it for a lost refresh race: the session cache entry is gone, the `jti` hash does not match, the rotation matches no live session row, or the Redis rewrite finds the key purged.
- A refresh token without a `jti` answers `jwtRefreshTokenInvalid` (`50801`) instead.

## `role`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `50500` | `notFound` | 404 (`NOT_FOUND`) | `role.error.notFound` | Sorry, we couldn't find the requested role. |
| `exist` | `50501` | `exist` | 409 (`CONFLICT`) | `role.error.exist` | A role with this name already exists. |
| `forbidden` | `50502` | `forbidden` | 403 (`FORBIDDEN`) | `role.error.forbidden` | Sorry, your role doesn't grant access to this resource. |
| `used` | `50503` | `used` | 409 (`CONFLICT`) | `role.error.used` | This role is currently in use and cannot be deleted. |

## `feature-flag`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `50600` | `notFound` | 404 (`NOT_FOUND`) | `featureFlag.error.notFound` | Feature flag not found. |
| `disabled` | `50601` | `disabled` | 404 (`NOT_FOUND`) | `featureFlag.error.disabled` | This feature is not available. |
| `invalidMetadata` | `50602` | `invalidMetadata` | 400 (`BAD_REQUEST`) | `featureFlag.error.invalidMetadata` | Feature flag metadata is invalid. |
| `notConfigured` | `50603` | `notConfigured` | 500 (`INTERNAL_SERVER_ERROR`) | `featureFlag.error.notConfigured` | This feature is not configured. |

- `notFound` is raised by `FeatureFlagDomain` when an admin update targets a flag id with no row.
- `notConfigured` is raised by `FeatureFlagDomain` when the key a route evaluates has no flag row.
    - It is a deployment defect, so it answers 500 and reaches Sentry.
    - The exception carries the missing key in `rawError`, never in the response.
- `disabled` is raised by `FeatureFlagDomain` in these cases:
    - the flag is off;
    - its rollout excludes the caller;
    - a partial rollout meets a request with no user and no anonymous id;
    - the metadata key a route checks is `false` or not a boolean.
- An empty or dotted key given to `@FeatureFlagProtected()` raises `FeatureFlagKeyEmptyException` or `FeatureFlagKeyNestedException` when the decorator is evaluated. Both extend `AppUnknownException` and carry no status code.

## `api-key`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `xApiKeyRequired` | `50700` | `xApiKeyRequired` | 401 (`UNAUTHORIZED`) | `apiKey.error.xApiKey.required` | Please provide your API key to continue. |
| `xApiKeyInvalid` | `50701` | `xApiKeyInvalid` | 401 (`UNAUTHORIZED`) | `apiKey.error.xApiKey.invalid` | Sorry, this API key appears to be invalid. |
| `xApiKeyForbidden` | `50702` | `xApiKeyForbidden` | 403 (`FORBIDDEN`) | `apiKey.error.xApiKey.forbidden` | You don't have permission to use this API key. |
| `expired` | `50703` | `expired` | 400 (`BAD_REQUEST`) | `apiKey.error.expired` | This API key has expired. Would you like to create a new one? |
| `notFound` | `50704` | `notFound` | 404 (`NOT_FOUND`) | `apiKey.error.notFound` | We couldn't locate this API key. Please check and try again. |
| `inactive` | `50705` | `inactive` | 400 (`BAD_REQUEST`) | `apiKey.error.inactive` | This API key is currently inactive. |
| `startAtNotFuture` | `50706` | `startAtNotFuture` | 400 (`BAD_REQUEST`) | `apiKey.error.startAtNotFuture` | The start date must be in the future. |
| `guardMissing` | `50707` | `guardMissing` | 401 (`UNAUTHORIZED`) | `apiKey.error.guardMissing` | The API key could not be verified for this request. |

- `xApiKeyInvalid` answers a header that is not `key:secret`, a key with no active row, a wrong secret, and a key outside its validity window.
- `xApiKeyRequired` answers an absent or blank header.
- `xApiKeyForbidden` answers a valid key whose type the route does not accept.
- `guardMissing` is raised by `ApiKeyXApiKeyTypeGuard` and `@ApiKeyPayload()` when no guard stored the API key on the request.

## `auth`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `jwtAccessTokenInvalid` | `50800` | `jwtAccessTokenInvalid` | 401 (`UNAUTHORIZED`) | `auth.error.accessTokenUnauthorized` | The access token is unauthorized. |
| `jwtRefreshTokenInvalid` | `50801` | `jwtRefreshTokenInvalid` | 401 (`UNAUTHORIZED`) | `auth.error.refreshTokenUnauthorized` | The refresh token is unauthorized. |
| `socialGoogleRequired` | `50802` | `socialGoogleRequired` | 401 (`UNAUTHORIZED`) | `auth.error.socialGoogleRequired` | Google login is required for this action. |
| `socialGoogleInvalid` | `50803` | `socialGoogleInvalid` | 401 (`UNAUTHORIZED`) | `auth.error.socialGoogleInvalid` | There was an error with Google login. |
| `socialAppleRequired` | `50804` | `socialAppleRequired` | 401 (`UNAUTHORIZED`) | `auth.error.socialAppleRequired` | Apple login is required for this action. |
| `socialAppleInvalid` | `50805` | `socialAppleInvalid` | 401 (`UNAUTHORIZED`) | `auth.error.socialAppleInvalid` | There was an error with Apple login. |
| `twoFactorInvalid` | `50806` | `twoFactorInvalid` | 401 (`UNAUTHORIZED`) | `auth.error.twoFactorInvalid` | The provided two-factor authentication code is invalid. |
| `twoFactorChallengeInvalid` | `50807` | `twoFactorChallengeInvalid` | 401 (`UNAUTHORIZED`) | `auth.error.twoFactorChallengeInvalid` | The two-factor challenge is invalid or has expired. |
| `twoFactorNotEnabled` | `50808` | `twoFactorNotEnabled` | 400 (`BAD_REQUEST`) | `auth.error.twoFactorNotEnabled` | Two-factor authentication is not enabled for this account. |
| `twoFactorAlreadyEnabled` | `50809` | `twoFactorAlreadyEnabled` | 400 (`BAD_REQUEST`) | `auth.error.twoFactorAlreadyEnabled` | Two-factor authentication is already enabled. |
| `twoFactorRequiredSetup` | `50810` | `twoFactorRequiredSetup` | 400 (`BAD_REQUEST`) | `auth.error.twoFactorRequiredSetup` | Two-factor authentication setup is required before continuing. |
| `twoFactorNotRequiredSetup` | `50811` | `twoFactorNotRequiredSetup` | 400 (`BAD_REQUEST`) | `auth.error.twoFactorNotRequiredSetup` | Two-factor authentication setup is not required. |
| `twoFactorAttemptTemporaryLock` | `50812` | `twoFactorAttemptTemporaryLock` | 429 (`TOO_MANY_REQUESTS`) | `auth.error.twoFactorAttemptTemporaryLock` | Too many incorrect two-factor attempts. Two-factor authentication is temporarily locked. Please try again after {retryAfterSeconds}s. |
| `twoFactorMethodRequired` | `50813` | `twoFactorMethodRequired` | 400 (`BAD_REQUEST`) | `auth.error.twoFactorMethodRequired` | A two-factor authentication method is required. |
| `twoFactorSetupRequired` | `50814` | `twoFactorSetupRequired` | 400 (`BAD_REQUEST`) | `auth.error.twoFactorSetupRequired` | Start two-factor setup before confirming the code. |
| `twoFactorSecretUnavailable` | `50815` | `twoFactorSecretUnavailable` | 409 (`CONFLICT`) | `auth.error.twoFactorSecretUnavailable` | Authenticator codes can't be checked for this account. Sign in with a backup code, then set up two-factor authentication again using another backup code. |
| `twoFactorBackupCodeRequired` | `50816` | `twoFactorBackupCodeRequired` | 400 (`BAD_REQUEST`) | `auth.error.twoFactorBackupCodeRequired` | Two-factor authentication is already enabled. Provide an unused backup code to set up a new authenticator. |
| `socialGoogleNotConfigured` | `50817` | `socialGoogleNotConfigured` | 404 (`NOT_FOUND`) | `auth.error.socialGoogleNotConfigured` | Google login is not configured. |
| `socialAppleNotConfigured` | `50818` | `socialAppleNotConfigured` | 404 (`NOT_FOUND`) | `auth.error.socialAppleNotConfigured` | Apple login is not configured. |
| `providerUnavailable` | `50819` | `providerUnavailable` | 503 (`SERVICE_UNAVAILABLE`) | `auth.error.providerUnavailable` | The sign-in provider is temporarily unavailable. Please try again shortly. |
| `jwtGuardMissing` | `50820` | `jwtGuardMissing` | 401 (`UNAUTHORIZED`) | `auth.error.jwtGuardMissing` | Your session could not be verified. Please sign in again. |

- `socialGoogleNotConfigured` and `socialAppleNotConfigured` are raised by `AuthSocialDomain` when no Google client ID or no Apple client ID is set.
- `AuthDomain` passes them through unwrapped, so they never become `socialGoogleInvalid` or `socialAppleInvalid`.
- `providerUnavailable` is raised by `AuthDomain` when the JWKS endpoint, Google's certificate fetch, or Apple's key fetch cannot be reached.
    - `AuthUtil.toProviderUnavailableException` recognises the failure; a bad token never maps to it.
    - It covers the JWT access and refresh guards and the Google and Apple sign-in verification.
- `jwtGuardMissing` is raised by `UserGuard` and `@AuthJwtPayload()` when the request carries no JWT payload.

## `country`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `50900` | `notFound` | 404 (`NOT_FOUND`) | `country.error.notFound` | Country not found. |
| `inactive` | `50901` | `inactive` | none | none | Reserved enum member; no exception or i18n path. |
| `exist` | `50902` | `exist` | none | none | Reserved enum member; no exception or i18n path. |

## `user`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `51000` | `notFound` | 404 (`NOT_FOUND`) | `user.error.notFound` | Sorry, we couldn't find the user you requested. |
| `notSelf` | `51001` | `notSelf` | 400 (`BAD_REQUEST`) | `user.error.notSelf` | You cannot perform this action on your own account. |
| `emailExist` | `51002` | `emailExist` | 409 (`CONFLICT`) | `user.error.emailExist` | This email already exists. |
| `usernameExist` | `51003` | `usernameExist` | 409 (`CONFLICT`) | `user.error.usernameExist` | This username has already been taken. |
| `mobileNumberNotFound` | `51004` | `mobileNumberNotFound` | 404 (`NOT_FOUND`) | `user.error.mobileNumberNotFound` | Mobile number not found. |
| `statusInvalid` | `51005` | `statusInvalid` | none | `user.error.statusInvalid` | Reserved enum member; no exception. The i18n key exists: "Invalid user status." |
| `blockedInvalid` | `51006` | `blockedInvalid` | 400 (`BAD_REQUEST`) | `user.error.blockedInvalid` | This user account has been blocked. |
| `inactiveForbidden` | `51007` | `inactiveForbidden` | 403 (`FORBIDDEN`) | `user.error.inactive` | This user is inactive. |
| `blockedForbidden` | `51008` | `blockedForbidden` | 403 (`FORBIDDEN`) | `user.error.blocked` | This user account has been blocked. |
| `passwordNotMatch` | `51009` | `passwordNotMatch` | 400 (`BAD_REQUEST`) | `user.error.passwordNotMatch` | Passwords do not match. |
| `passwordMustNew` | `51010` | `passwordMustNew` | 400 (`BAD_REQUEST`) | `user.error.passwordMustNew` | New password must be different from previous passwords within the past {period} days. |
| `passwordExpired` | `51011` | `passwordExpired` | 403 (`FORBIDDEN`) | `user.error.passwordExpired` | Your password has expired. |
| `passwordAttemptMax` | `51012` | `passwordAttemptMax` | 403 (`FORBIDDEN`) | `user.error.passwordAttemptMax` | Maximum password attempts exceeded. |
| `mobileNumberInvalid` | `51013` | `mobileNumberInvalid` | 400 (`BAD_REQUEST`) | `user.error.mobileNumberInvalid` | This mobile number is invalid. |
| `usernameNotAllowed` | `51014` | `usernameNotAllowed` | 400 (`BAD_REQUEST`) | `user.error.usernameNotAllowed` | This username is not allowed. |
| `usernameContainBadWord` | `51015` | `usernameContainBadWord` | 400 (`BAD_REQUEST`) | `user.error.usernameContainBadWord` | Username contains inappropriate words. |
| `emailNotVerified` | `51016` | `emailNotVerified` | 403 (`FORBIDDEN`) | `user.error.emailNotVerified` | Email not verified. |
| `passwordNotSet` | `51017` | `passwordNotSet` | 400 (`BAD_REQUEST`) | `user.error.passwordNotSet` | Password has not been set for this account. |
| `tokenInvalid` | `51018` | `tokenInvalid` | 400 (`BAD_REQUEST`) | `user.error.verificationTokenInvalid` | Verification token is invalid or expired. |
| `emailAlreadyVerified` | `51019` | `emailAlreadyVerified` | 400 (`BAD_REQUEST`) | `user.error.emailAlreadyVerified` | This email has already been verified. |
| `mobileNumberExist` | `51020` | `mobileNumberExist` | 409 (`CONFLICT`) | `user.error.mobileNumberExist` | This mobile number already exists. |
| `verificationEmailResendLimitExceeded` | `51021` | `verificationEmailResendLimitExceeded` | 400 (`BAD_REQUEST`) | `user.error.verificationEmailResendLimitExceeded` | You have exceeded the limit for resending verification emails. Try again after {minutes} minutes. |
| `forgotPasswordRequestLimitExceeded` | `51022` | `forgotPasswordRequestLimitExceeded` | 400 (`BAD_REQUEST`) | `user.error.forgotPasswordRequestLimitExceeded` | You have exceeded the limit for password reset requests. Try again after {minutes} minutes. |
| `twoFactorMethodRequired` | `51023` | `twoFactorMethodRequired` | none | none | Reserved user enum member; live path uses auth `50813` + `auth.error.twoFactorMethodRequired`. |
| `accountNotFound` | `51024` | `accountNotFound` | 401 (`UNAUTHORIZED`) | `user.error.accountNotFound` | The account of this session no longer exists. |
| `importEmailExist` | `51025` | `importEmailExist` | 409 (`CONFLICT`) | `user.error.importEmailExist` | There are existing users with the provided email addresses. Email: {emails} |
| `importUsernameExist` | `51026` | `importUsernameExist` | 409 (`CONFLICT`) | `user.error.importUsernameExist` | There are existing users with the provided usernames. Username: {usernames} |
| `guardMissing` | `51027` | `guardMissing` | 401 (`UNAUTHORIZED`) | `user.error.guardMissing` | Your account could not be verified. Please sign in again. |

- `accountNotFound` is raised by `UserDomain.validateUserGuard` when a valid token names a user whose row no longer exists.
- `guardMissing` is raised by the role, policy, term-policy, workspace-member, and project-member guards, and by `@UserCurrent()` and `@RoleCurrent()`, when `UserGuard` stored no user.

## `policy`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `forbidden` | `51100` | `forbidden` | 403 (`FORBIDDEN`) | `policy.error.forbidden` | Sorry, you don't have the necessary permissions to perform this action. |
| `notFound` | `51101` | `notFound` | 404 (`NOT_FOUND`) | `policy.error.notFound` | Sorry, we couldn't find the requested policy. |
| `exist` | `51102` | `exist` | 409 (`CONFLICT`) | `policy.error.exist` | This role already grants a policy for that subject. |
| `guardMissing` | `51103` | `guardMissing` | 403 (`FORBIDDEN`) | `policy.error.guardMissing` | Your permissions could not be verified for this request. |

`guardMissing` is raised by `PolicyGuard` and `@PolicyCurrent()` when `RoleGuard` stored no policy list.

## `notification`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `51200` | `notFound` | 404 (`NOT_FOUND`) | `notification.error.notFound` | Notification not found. |
| `alreadyRead` | `51201` | `alreadyRead` | 400 (`BAD_REQUEST`) | `notification.error.alreadyRead` | Notification is already marked as read. |
| `invalidType` | `51202` | `invalidType` | 400 (`BAD_REQUEST`) | `notification.error.invalidType` | Invalid notification type. |
| `invalidChannel` | `51203` | `invalidChannel` | 400 (`BAD_REQUEST`) | `notification.error.invalidChannel` | Invalid notification channel. |

## `device`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `51300` | `notFound` | 404 (`NOT_FOUND`) | `device.error.notFound` | Device information not found |

## `aws`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `s3KeyInvalid` | `51400` | `s3KeyInvalid` | 500 (`INTERNAL_SERVER_ERROR`) | `aws.error.s3KeyInvalid` | The storage key is invalid. |
| `s3FileRequired` | `51401` | `s3FileRequired` | 500 (`INTERNAL_SERVER_ERROR`) | `aws.error.s3FileRequired` | A file is required for this storage operation. |
| `s3ObjectExist` | `51402` | `s3ObjectExist` | 409 (`CONFLICT`) | `aws.error.s3ObjectExist` | A file already exists at this location. |
| `s3MaxPartNumberExceeded` | `51403` | `s3MaxPartNumberExceeded` | 500 (`INTERNAL_SERVER_ERROR`) | `aws.error.s3MaxPartNumberExceeded` | The multipart upload exceeds the maximum number of parts. |
| `s3IterationLimitExceeded` | `51404` | `s3IterationLimitExceeded` | 500 (`INTERNAL_SERVER_ERROR`) | `aws.error.s3IterationLimitExceeded` | The storage operation exceeded its iteration limit. |
| `sesTemplateBodyRequired` | `51405` | `sesTemplateBodyRequired` | 500 (`INTERNAL_SERVER_ERROR`) | `aws.error.sesTemplateBodyRequired` | An email template needs an HTML or plain-text body. |
| `s3NotConfigured` | `51406` | `s3NotConfigured` | 404 (`NOT_FOUND`) | `aws.error.s3NotConfigured` | File storage is not configured. |

- `s3KeyInvalid` is the shape guard inside `AwsS3Service`.
    - It rejects a key, path, source, or destination that starts with `/`, plus a `..` or `//` in a `putItem` key.
    - A client-supplied key meets `AwsS3ObjectKeyRegex` in the request schema first and answers 422 (`50300`) there.
- `s3ObjectExist` is raised when an upload or presign targets a key that already holds an object and `forceUpdate` is off.
- `s3NotConfigured` is raised by `UserProfileDomain`, `TermPolicyDomain`, and `TermPolicyContentDomain` when `AwsS3Service` has no credentials and the request needs S3 (a presign, a photo update, a content upload).

## `term-policy`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `51500` | `notFound` | 404 (`NOT_FOUND`) | `termPolicy.error.notFound` | Term policy not found. |
| `exist` | `51501` | `exist` | 409 (`CONFLICT`) | `termPolicy.error.exist` | A term policy with this name already exists. |
| `languageDuplicate` | `51502` | `languageDuplicate` | 400 (`BAD_REQUEST`) | `termPolicy.error.contentsLanguageMustBeUnique` | Each language can only be used once in term policy contents. |
| `alreadyAccepted` | `51503` | `alreadyAccepted` | 409 (`CONFLICT`) | `termPolicy.error.alreadyAccepted` | You have already accepted this term policy. |
| `requiredInvalid` | `51504` | `requiredInvalid` | 403 (`FORBIDDEN`) | `termPolicy.error.requiredInvalid` | Required field value is invalid. |
| `statusInvalid` | `51505` | `statusInvalid` | 400 (`BAD_REQUEST`) | `termPolicy.error.statusInvalid` | Term policy status is invalid. |
| `contentNotFound` | `51506` | `contentNotFound` | 404 (`NOT_FOUND`) | `termPolicy.error.contentNotFound` | Term policy content not found. |
| `contentExist` | `51507` | `contentExist` | 409 (`CONFLICT`) | `termPolicy.error.contentExist` | This content already exists in the term policy. |
| `contentEmpty` | `51508` | `contentEmpty` | 400 (`BAD_REQUEST`) | `termPolicy.error.contentEmpty` | Term policy content cannot be empty. |
| `contentInvalid` | `51509` | `contentInvalid` | 500 (`INTERNAL_SERVER_ERROR`) | `termPolicy.error.contentInvalid` | Term policy content is invalid. |
| `publishInProgress` | `51510` | `publishInProgress` | 409 (`CONFLICT`) | `termPolicy.error.publishInProgress` | Term policy publish is already in progress. |

- `contentInvalid` is raised by `TermPolicyContentDomain` and `TermPolicyDomain` when `TermPolicyUtil.toContents` finds a stored content whose language or access is not a known enum value.
- `publishInProgress` is raised by `NotificationQueue.sendPublishTermPolicy`, which keys the publish job by term policy and follows the job's BullMQ state (`EnumQueueJobState`):
    - `failed`: the job is retried with its attempts reset.
    - `waiting`, `prioritized`, `delayed`, `active`, or `waitingChildren`: `publishInProgress`.
    - `completed` or `unknown`: the old job is removed and a new one is added.
    - A failed job that left the `failed` state before the retry also answers `publishInProgress`.

## `workspace`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `51600` | `notFound` | 404 (`NOT_FOUND`) | `workspace.error.notFound` | Sorry, we couldn't find the workspace. |
| `memberForbidden` | `51601` | `memberForbidden` | 403 (`FORBIDDEN`) | `workspace.error.memberForbidden` | You are not a member of this workspace. |
| `roleForbidden` | `51602` | `roleForbidden` | 403 (`FORBIDDEN`) | `workspace.error.roleForbidden` | You do not have the required role in this workspace. |
| `inviteInvalid` | `51603` | `inviteInvalid` | 400 (`BAD_REQUEST`) | `workspace.error.inviteInvalid` | This workspace invite link is invalid or has expired. |
| `capReached` | `51604` | `capReached` | 400 (`BAD_REQUEST`) | `workspace.error.capReached` | You have reached the maximum number of workspaces you can own. |
| `slugAlreadyExists` | `51605` | `slugAlreadyExists` | 400 (`BAD_REQUEST`) | `workspace.error.slugAlreadyExists` | This workspace slug is already taken. |
| `memberNotFound` | `51606` | `memberNotFound` | 404 (`NOT_FOUND`) | `workspace.error.memberNotFound` | Sorry, we couldn't find that workspace member. |
| `lastOwner` | `51607` | `lastOwner` | 400 (`BAD_REQUEST`) | `workspace.error.lastOwner` | You are the last owner; transfer ownership before leaving. |
| `memberPeerForbidden` | `51608` | `memberPeerForbidden` | 403 (`FORBIDDEN`) | `workspace.error.memberPeerForbidden` | You are not allowed to perform this action on this member. |
| `inviteDuplicate` | `51609` | `inviteDuplicate` | 400 (`BAD_REQUEST`) | `workspace.error.inviteDuplicate` | There is already a pending invite for this email in this workspace. |
| `inviteProjectMismatch` | `51610` | `inviteProjectMismatch` | 400 (`BAD_REQUEST`) | `workspace.error.inviteProjectMismatch` | This project does not belong to the current workspace. |
| `inviteRoleRequired` | `51611` | `inviteRoleRequired` | 400 (`BAD_REQUEST`) | `workspace.error.inviteRoleRequired` | `projectMemberRole` is required when `projectId` is set, and must be omitted otherwise. |
| `inviteNotFound` | `51612` | `inviteNotFound` | 404 (`NOT_FOUND`) | `workspace.error.inviteNotFound` | Sorry, we couldn't find that workspace invite. |
| `inviteAlreadyProcessed` | `51613` | `inviteAlreadyProcessed` | 400 (`BAD_REQUEST`) | `workspace.error.inviteAlreadyProcessed` | This workspace invite is no longer pending. |
| `notPublic` | `51614` | `notPublic` | 400 (`BAD_REQUEST`) | `workspace.error.notPublic` | This workspace is not accepting public join requests. |
| `joinRequestAlreadyMember` | `51615` | `joinRequestAlreadyMember` | 400 (`BAD_REQUEST`) | `workspace.error.joinRequestAlreadyMember` | You are already a member of this workspace. |
| `joinRequestDuplicate` | `51616` | `joinRequestDuplicate` | 400 (`BAD_REQUEST`) | `workspace.error.joinRequestDuplicate` | You already have a pending join request for this workspace. |
| `joinRequestNotFound` | `51617` | `joinRequestNotFound` | 404 (`NOT_FOUND`) | `workspace.error.joinRequestNotFound` | Sorry, we couldn't find that workspace join request. |
| `joinRequestAlreadyProcessed` | `51618` | `joinRequestAlreadyProcessed` | 400 (`BAD_REQUEST`) | `workspace.error.joinRequestAlreadyProcessed` | This workspace join request is no longer pending. |
| `selfTransfer` | `51619` | `selfTransfer` | 400 (`BAD_REQUEST`) | `workspace.error.selfTransfer` | You cannot transfer ownership to yourself. |
| `slugInvalid` | `51620` | `slugInvalid` | 400 (`BAD_REQUEST`) | `workspace.error.slugInvalid` | This workspace slug is not allowed; use letters, digits and hyphens only, within the allowed length. |
| `headerMissing` | `51621` | `headerMissing` | 400 (`BAD_REQUEST`) | `workspace.error.headerMissing` | The x-workspace-id header is required. |
| `guardMissing` | `51622` | `guardMissing` | 403 (`FORBIDDEN`) | `workspace.error.guardMissing` | The workspace could not be verified for this request. |
| `memberGuardMissing` | `51623` | `memberGuardMissing` | 403 (`FORBIDDEN`) | `workspace.error.memberGuardMissing` | Your workspace membership could not be verified for this request. |

- `WorkspaceGuard` resolves the workspace from the `x-workspace-id` header:
    - `headerMissing` answers an absent header.
    - `notFound` answers a malformed id or one that names no active workspace.
- `WorkspaceMemberGuard` answers `memberForbidden` when the caller is not a member.
- `guardMissing` is raised by `WorkspaceMemberGuard`, `ProjectGuard`, and `@WorkspaceCurrent()` when `WorkspaceGuard` stored no workspace.
- `memberGuardMissing` is raised by `WorkspaceRoleGuard`, `ProjectRoleGuard`, and `@WorkspaceMemberCurrent()` when `WorkspaceMemberGuard` stored no member.

## `project`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `51700` | `notFound` | 404 (`NOT_FOUND`) | `project.error.notFound` | Sorry, we couldn't find the project. |
| `memberForbidden` | `51701` | `memberForbidden` | 403 (`FORBIDDEN`) | `project.error.memberForbidden` | You are not a member of this project. |
| `roleForbidden` | `51702` | `roleForbidden` | 403 (`FORBIDDEN`) | `project.error.roleForbidden` | You do not have the required role in this project. |
| `memberPeerForbidden` | `51703` | `memberPeerForbidden` | 403 (`FORBIDDEN`) | `project.error.memberPeerForbidden` | You are not allowed to perform this action on this member. |
| `memberNotFound` | `51704` | `memberNotFound` | 404 (`NOT_FOUND`) | `project.error.memberNotFound` | Sorry, we couldn't find that project member. |
| `memberAlreadyAssigned` | `51705` | `memberAlreadyAssigned` | 400 (`BAD_REQUEST`) | `project.error.memberAlreadyAssigned` | This user is already assigned to the project. |
| `slugAlreadyExists` | `51706` | `slugAlreadyExists` | 400 (`BAD_REQUEST`) | `project.error.slugAlreadyExists` | This project slug is already taken in this workspace. |
| `slugInvalid` | `51707` | `slugInvalid` | 400 (`BAD_REQUEST`) | `project.error.slugInvalid` | This project slug is not allowed; use letters, digits and hyphens only, within the allowed length. |
| `guardMissing` | `51708` | `guardMissing` | 403 (`FORBIDDEN`) | `project.error.guardMissing` | The project could not be verified for this request. |
| `memberGuardMissing` | `51709` | `memberGuardMissing` | 403 (`FORBIDDEN`) | `project.error.memberGuardMissing` | Your project membership could not be verified for this request. |

- `ProjectGuard` answers `notFound` (404) when the `:projectId` param is malformed or names no active project in the workspace.
- `guardMissing` is raised by `ProjectMemberGuard`, `ProjectRoleGuard`, and `@ProjectCurrent()` when `ProjectGuard` stored no project.
- `memberGuardMissing` is raised by `@ProjectMemberCurrent()` when `ProjectMemberGuard` stored no member, which includes any role-gated route.

## `database`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `uniqueValueGenerationFailed` | `51800` | `uniqueValueGenerationFailed` | 409 (`CONFLICT`) | `database.error.uniqueValueGenerationFailed` | We couldn't complete this action. Please try again. |
| `writeConflict` | `51801` | `writeConflict` | 409 (`CONFLICT`) | `database.error.writeConflict` | The request conflicted with another change. Please try again. |
| `unavailable` | `51802` | `unavailable` | 503 (`SERVICE_UNAVAILABLE`) | `database.error.unavailable` | The service is temporarily unavailable. Please try again later. |

- `DatabaseUniqueValueGenerationFailedException` (`51800`) is thrown directly when every attempt to draw a unique generated value collides. `DatabaseUtil.toException` never produces it.
- `DatabaseWriteConflictException` (`51801`) is the mapped form of a Prisma `P2034` write conflict between concurrent transactions.
    - The server does not retry a write conflict. It answers 409 at once and the client retries.
- `DatabaseUnavailableException` (`51802`) is the mapped form of two failures:
    - a `PrismaClientInitializationError`
    - a Prisma error whose code is in `DatabaseUnavailableCodes` (`src/common/database/constants/database.constant.ts`): `P1001`, `P1002`, `P1008`, `P1017`, `P2024`
- `DatabaseUtil.toException` maps only `51801` and `51802`, and `AppGeneralFilter` renders them. See [Handling Error](handling-error.md).

## `response`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `serialization` | `51900` | `serialization` | 500 (`INTERNAL_SERVER_ERROR`) | `response.error.serialization` | The server produced a response that does not match the schema it declares. |
| `paginationShapeInvalid` | `51901` | `paginationShapeInvalid` | 500 (`INTERNAL_SERVER_ERROR`) | `response.error.paginationShapeInvalid` | The server produced a paginated response with an invalid shape. |
| `paginationTypeInvalid` | `51902` | `paginationTypeInvalid` | 500 (`INTERNAL_SERVER_ERROR`) | `response.error.paginationTypeInvalid` | The server produced a paginated response with an unknown pagination type. |
| `fileDataInvalid` | `51903` | `fileDataInvalid` | 500 (`INTERNAL_SERVER_ERROR`) | `response.error.fileDataInvalid` | The server produced a file response with missing or invalid data. |

`ResponseFileDataInvalidException` is raised by `ResponseFileInterceptor` when a `@ResponseFile` handler returns no payload, a CSV `data` that is missing, empty, or not a string, or a PDF `data` that is missing or not a `Buffer`.

## `activity-log`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `contractInvalid` | `52000` | `contractInvalid` | 500 (`INTERNAL_SERVER_ERROR`) | `activityLog.error.contractInvalid` | Activity log contract validation failed |

## `analytic`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `invalidDateRange` | `52100` | `invalidDateRange` | 400 (`BAD_REQUEST`) | `analytic.error.invalidDateRange` | The start date must be before the end date. |

## `helper`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `decryptFailed` | `52200` | `decryptFailed` | 500 (`INTERNAL_SERVER_ERROR`) | `helper.error.decryptFailed` | We couldn't read protected data for this request. |
| `encryptionSecretInvalid` | `52201` | `encryptionSecretInvalid` | 500 (`INTERNAL_SERVER_ERROR`) | `helper.error.encryptionSecretInvalid` | We couldn't process protected data for this request. |
| `patternTokenMissing` | `52202` | `patternTokenMissing` | 500 (`INTERNAL_SERVER_ERROR`) | `helper.error.patternTokenMissing` | We couldn't build a value for this request. Missing pattern token: {token} |

- `HelperDecryptFailedException` covers a malformed, tampered, or wrong-key payload.
- `HelperEncryptionSecretInvalidException` covers a root secret that is not canonical base64url of 48 bytes.
- `AuthTwoFactorDomain` turns a `decryptFailed` on a stored TOTP secret into `twoFactorSecretUnavailable` (409).
- `NotificationEmailProcessor` turns a `decryptFailed` into a BullMQ `UnrecoverableError`.
- `HelperPatternTokenMissingException` carries the offending token in `messageProperties.token`.
- `HelperStringService.fillPattern` raises it when a `{token}` in the pattern has no entry in the values it was given, so no key ever holds the literal `{token}`.

## `firebase`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `chunkSizeInvalid` | `52300` | `chunkSizeInvalid` | 500 (`INTERNAL_SERVER_ERROR`) | `firebase.error.chunkSizeInvalid` | The push notification batch size is out of range. |

`FirebaseChunkSizeInvalidException` is raised by `FirebaseService.sendMulticast` when the chunk size falls outside 1 to `FirebaseMaxSendPushBatchSize` (500).

## `redis`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
| --- | --- | --- | --- | --- | --- |
| `unavailable` | `52400` | `unavailable` | 503 (`SERVICE_UNAVAILABLE`) | `redis.error.unavailable` | The service is temporarily unavailable. Please try again later. |

- `RedisUnavailableException` is the mapped form of one failure: the Keyv Redis not-connected error (`RedisErrorMessages.RedisClientNotConnectedThrown`).
- `RedisUtil.toException` produces it, and `AppGeneralFilter` renders it.
- Any other Redis error answers `50000`, including a failure of the BullMQ (ioredis) connection.

## Related documents

- [Handling Error][ref-doc-handling-error]: error filter flow
- [Language Message][ref-doc-message]: i18n message paths
- [Response][ref-doc-response]: response shape
- [Request Validation][ref-doc-request-validation]: request schema validation errors

<!-- REFERENCES -->

[ref-doc-handling-error]: handling-error.md
[ref-doc-message]: language-message.md
[ref-doc-response]: response.md
[ref-doc-request-validation]: request-validation.md
