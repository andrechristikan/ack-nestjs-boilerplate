---
title: Status Codes
description: The application status code, HTTP status, and message of every typed exception, grouped by owning module.
---

# Status Codes

This page lists the `statusCode` of every typed exception with its HTTP status and message, for a developer who handles an error in a client or allocates a code.

## Table of Contents

- [Related Documents](#related-documents)
- [Block map](#block-map)
- [Reading an entry](#reading-an-entry)
- [Module tables](#module-tables)

## Related Documents

- [Status Code Guide][ref-doc-guide-status-code]: allocate a code, write the exception, and add its message
- [Error Handling][ref-doc-error-handling]: how an exception becomes the error envelope
- [HTTP Contract][ref-doc-http-contract]: the error envelope fields
- [Dependencies][ref-doc-dependencies]: the 503 and 501 exceptions of the kits and adapters
- [I18n][ref-doc-i18n]: how a message path becomes the message

## Block map

Each owner holds one block of a hundred codes, and the codes inside a block never have a gap: the members run from the block base with no hole. The folder column names the tree that owns the block, and the `module` field is the value the error envelope carries. The owners are the feature modules and the kit trees that declare a `*.status-code.enum.ts`, and those enum files are the machine registry.

| Base    | Folder             | `module` field    | Range           | Members |
| ------- | ------------------ | ----------------- | --------------- | ------- |
| `50000` | `app`              | `app`             | `50000`         | 1       |
| `50100` | `file`             | `file`            | `50100`–`50110` | 11      |
| `50200` | `pagination`       | `pagination`      | `50200`–`50211` | 12      |
| `50300` | `request`          | `request`         | `50300`–`50306` | 7       |
| `50400` | `session`          | `session`         | `50400`–`50401` | 2       |
| `50500` | `role`             | `role`            | `50500`–`50507` | 8       |
| `50600` | `feature-flag`     | `featureFlag`     | `50600`–`50603` | 4       |
| `50700` | `api-key`          | `apiKey`          | `50700`–`50708` | 9       |
| `50800` | `auth`             | `auth`            | `50800`–`50812` | 13      |
| `50900` | `country`          | `country`         | `50900`         | 1       |
| `51000` | `user`             | `user`            | `51000`–`51032` | 33      |
| `51100` | `policy`           | `policy`          | `51100`–`51104` | 5       |
| `51200` | `notification`     | `notification`    | `51200`–`51204` | 5       |
| `51300` | `device`           | `device`          | `51300`         | 1       |
| `51400` | `aws`              | `aws`             | `51400`–`51408` | 9       |
| `51500` | `term-policy`      | `termPolicy`      | `51500`–`51513` | 14      |
| `51600` | `workspace`        | `workspace`       | `51600`–`51626` | 27      |
| `51700` | `project`          | `project`         | `51700`–`51707` | 8       |
| `51900` | `response`         | `response`        | `51900`–`51903` | 4       |
| `52000` | `activity-log`     | `activityLog`     | `52000`         | 1       |
| `52100` | `analytic`         | `analytic`        | `52100`         | 1       |
| `52200` | `helper`           | `helper`          | `52200`–`52202` | 3       |
| `52400` | `redis`            | `redis`           | `52400`         | 1       |
| `52600` | `mfa`              | `mfa`             | `52600`–`52613` | 14      |
| `52700` | `password-history` | `passwordHistory` | `52700`         | 1       |
| `52800` | `database`         | `database`        | `52800`         | 1       |
| `52900` | `firebase`         | `firebase`        | `52900`         | 1       |

A hundred from `50000` up that no block's range touches is free: `51800`, `52300`, `52500`, and every hundred from `53000`. A new owner takes the lowest free hundred, which is `51800`.

## Reading an entry

- `statusCode` is the five-digit application code of the exception. It is not the HTTP status, which the table gives in its own column.
- `statusCodeKey` is the name of the enum member, shown in the first column. A client branches on `module` with `statusCodeKey`, which are more stable than the integer.
- The message path is `<module>.error.<descriptor>`, or an `http.*` path for a generic transport failure. The message is the English text of that path.
- A message with a placeholder shows it as `{name}`, and the exception fills it.
- A member that lists two message paths is raised by two exception classes that share one code.
- The `request` block holds the rejections of the request kit. `envNotAllowed` answers 404 like an unknown route, `contextMissing` marks a route whose guard or middleware did not write the value a reader asked for, and `payloadTooLarge` and `unsupportedMediaType` come from the body parser.
- The exception column names the class that carries the member.
- A 503 member is the unavailable exception of one kit or of the auth providers: `aws`, `database`, `firebase`, `redis`, and `auth.providerUnavailable`. The `database` block is MongoDB. The `redis` block is the cache Redis, the instance the cache service and the rate limiter use, and a queue Redis outage throws no exception because the outbox row stays `pending`. A 501 member is a request that needs an optional integration whose credentials are unset: `aws.s3NotConfigured`, `aws.sesNotConfigured`, `auth.socialGoogleNotConfigured`, and `auth.socialAppleNotConfigured` ([Dependencies][ref-doc-dependencies]).
- An exception that fails the boot or a decorator, and a job failure, carry no status code.

## Module tables

### `app`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `unknown` | `50000` | `AppUnknownException` | 500 (`INTERNAL_SERVER_ERROR`) | `http.serverError.internalServerError` | Internal Server Error |

### `file`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `required` | `50100` | `FileRequiredException` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.required` | This field is required and cannot be left blank. |
| `extensionInvalid` | `50101` | `FileExtensionInvalidException` | 415 (`UNSUPPORTED_MEDIA_TYPE`) | `file.error.extensionInvalid` | The file extension is invalid. |
| `requiredExtractFirst` | `50102` | `FileRequiredExtractFirstException` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.requiredExtractFirst` | Please extract the data before proceeding. |
| `exceedMaxDataImport` | `50103` | `FileExceedMaxDataImportException` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.exceedMaxDataImport` | The number of data rows exceeds the maximum allowed for import. |
| `exceedMaxDataExport` | `50104` | `FileExceedMaxDataExportException` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.exceedMaxDataExport` | The number of data rows exceeds the maximum allowed for export. Please narrow the filter and try again. |
| `exceedMaxSizeExport` | `50105` | `FileExceedMaxSizeExportException` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.exceedMaxSizeExport` | The exported file exceeds the maximum allowed size. Please narrow the filter and try again. |
| `exceedMaxSizeUpload` | `50106` | `FileExceedMaxSizeUploadException` | 413 (`PAYLOAD_TOO_LARGE`) | `file.error.exceedMaxSizeUpload` | The uploaded file exceeds the maximum allowed size. |
| `exceedMaxFiles` | `50107` | `FileExceedMaxFilesException` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.exceedMaxFiles` | The number of uploaded files exceeds the maximum allowed. |
| `fieldUnexpected` | `50108` | `FileFieldUnexpectedException` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.fieldUnexpected` | The uploaded file was sent to a field this endpoint does not accept. |
| `multipartInvalid` | `50109` | `FileMultipartInvalidException` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.multipartInvalid` | The multipart request body is malformed. |
| `importInvalid` | `50110` | `FileImportException` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.importInvalid` | The imported data failed validation. |

### `pagination`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `filterInvalidValue` | `50200` | `PaginationFilterInvalidValueException`, `PaginationFilterInvalidValueEnumException` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.filterInvalidValueEnum` or `pagination.error.filterInvalidValue` | '{property}' value provided is invalid. Allowed values are: {allowedValues}. / '{property}' value provided is invalid. |
| `invalidPerPage` | `50201` | `PaginationInvalidPerPageException` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidPerPage` | The 'perPage' parameter must be between 1 and {maxPerPage}. |
| `invalidCursorPaginationParams` | `50202` | `PaginationInvalidCursorPaginationParamsException` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidCursorPaginationParams` | Invalid cursor pagination parameters provided. |
| `cursorTooLong` | `50203` | `PaginationCursorTooLongException` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.cursorTooLong` | The cursor length must not exceed {maxCursorLength} characters. |
| `invalidCursorFormat` | `50204` | `PaginationInvalidCursorFormatException` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidCursorFormat` | The provided cursor is not in a valid format. |
| `invalidPage` | `50205` | `PaginationInvalidPageException` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidPage` | The 'page' parameter must be a positive integer and maximum {maxPage}. |
| `pageExceedsMaximum` | `50206` | `PaginationPageExceedsMaximumException` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.pageExceedsMaximum` | The 'page' parameter exceeds the maximum allowed value of {maxPage}. Received: {receivedPage}. |
| `pageCannotBeLessThanOne` | `50207` | `PaginationPageCannotBeLessThanOneException` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.pageCannotBeLessThanOne` | The 'page' parameter cannot be less than {minPage}. Received: {receivedPage}. |
| `perPageExceedsMaximum` | `50208` | `PaginationPerPageExceedsMaximumException` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.perPageExceedsMaximum` | The 'perPage' parameter exceeds the maximum allowed value of {maxPerPage}. Received: {receivedPerPage}. |
| `perPageCannotBeLessThanOne` | `50209` | `PaginationPerPageCannotBeLessThanOneException` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.perPageCannotBeLessThanOne` | The 'perPage' parameter cannot be less than {minPerPage}. Received: {receivedPerPage}. |
| `invalidCursorData` | `50210` | `PaginationInvalidCursorDataException` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidCursorData` | The provided cursor data is invalid. |
| `failedToDecodeCursor` | `50211` | `PaginationFailedToDecodeCursorException` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.failedToDecodeCursor` | Failed to decode cursor data. |

### `request`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `validation` | `50300` | `RequestValidationException` | 422 (`UNPROCESSABLE_ENTITY`) | `request.error.validation` | There are validation errors. |
| `timeout` | `50301` | `RequestTimeoutException` | 408 (`REQUEST_TIMEOUT`) | `http.clientError.requestTimeOut` | Request Timeout |
| `envNotAllowed` | `50302` | `RequestEnvNotAllowedException` | 404 (`NOT_FOUND`) | `http.clientError.notFound` | Not Found |
| `schemaMissing` | `50303` | `RequestSchemaMissingException` | 500 (`INTERNAL_SERVER_ERROR`) | `request.error.schemaMissing` | The request could not be validated. Please try again later. |
| `contextMissing` | `50304` | `RequestContextMissingException` | 500 (`INTERNAL_SERVER_ERROR`) | `request.error.contextMissing` | The request could not be processed. Please try again later. |
| `payloadTooLarge` | `50305` | `RequestPayloadTooLargeException` | 413 (`PAYLOAD_TOO_LARGE`) | `request.error.payloadTooLarge` | The request body is larger than the allowed size. |
| `unsupportedMediaType` | `50306` | `RequestUnsupportedMediaTypeException` | 415 (`UNSUPPORTED_MEDIA_TYPE`) | `request.error.unsupportedMediaType` | The request body uses an unsupported media type. |

### `session`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `50400` | `SessionNotFoundException` | 404 (`NOT_FOUND`) | `session.error.notFound` | Sorry, we couldn't find the session. |
| `revoked` | `50401` | `SessionRevokedException` | 401 (`UNAUTHORIZED`) | `session.error.revoked` | Your session has expired or been revoked. Please sign in again. |

### `role`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `50500` | `RoleNotFoundException` | 404 (`NOT_FOUND`) | `role.error.notFound` | Sorry, we couldn't find the requested role. |
| `exist` | `50501` | `RoleExistException` | 409 (`CONFLICT`) | `role.error.exist` | A role with this name already exists. |
| `forbidden` | `50502` | `RoleForbiddenException` | 403 (`FORBIDDEN`) | `role.error.forbidden` | Sorry, your role doesn't grant access to this resource. |
| `used` | `50503` | `RoleUsedException` | 409 (`CONFLICT`) | `role.error.used` | This role is currently in use and cannot be deleted. |
| `rankForbidden` | `50504` | `RoleRankForbiddenException` | 403 (`FORBIDDEN`) | `role.error.rankForbidden` | Sorry, your role doesn't outrank the role you are acting on. |
| `selfForbidden` | `50505` | `RoleSelfForbiddenException` | 403 (`FORBIDDEN`) | `role.error.selfForbidden` | Sorry, you cannot modify the role you hold. |
| `immutable` | `50506` | `RoleImmutableException` | 400 (`BAD_REQUEST`) | `role.error.immutable` | This role is protected: it cannot be deleted and its type cannot change. |
| `hasPolicies` | `50507` | `RoleHasPoliciesException` | 400 (`BAD_REQUEST`) | `role.error.hasPolicies` | This role still holds policies: remove them before changing its type to user. |

### `feature-flag`

The `module` field is `featureFlag`.

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `50600` | `FeatureFlagNotFoundException` | 404 (`NOT_FOUND`) | `featureFlag.error.notFound` | Feature flag not found. |
| `disabled` | `50601` | `FeatureFlagDisabledException` | 404 (`NOT_FOUND`) | `featureFlag.error.disabled` | This feature is not available. |
| `invalidMetadata` | `50602` | `FeatureFlagInvalidMetadataException` | 400 (`BAD_REQUEST`) | `featureFlag.error.invalidMetadata` | Feature flag metadata is invalid. |
| `notConfigured` | `50603` | `FeatureFlagNotConfiguredException` | 500 (`INTERNAL_SERVER_ERROR`) | `featureFlag.error.notConfigured` | This feature is not configured. |

### `api-key`

The `module` field is `apiKey`.

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `xApiKeyRequired` | `50700` | `ApiKeyXApiKeyRequiredException` | 401 (`UNAUTHORIZED`) | `apiKey.error.xApiKey.required` | Please provide your API key to continue. |
| `xApiKeyInvalid` | `50701` | `ApiKeyXApiKeyInvalidException` | 401 (`UNAUTHORIZED`) | `apiKey.error.xApiKey.invalid` | Sorry, this API key appears to be invalid. |
| `xApiKeyForbidden` | `50702` | `ApiKeyXApiKeyForbiddenException` | 403 (`FORBIDDEN`) | `apiKey.error.xApiKey.forbidden` | You don't have permission to use this API key. |
| `expired` | `50703` | `ApiKeyExpiredException` | 400 (`BAD_REQUEST`) | `apiKey.error.expired` | This API key has expired. Would you like to create a new one? |
| `notFound` | `50704` | `ApiKeyNotFoundException` | 404 (`NOT_FOUND`) | `apiKey.error.notFound` | We couldn't locate this API key. Please check and try again. |
| `inactive` | `50705` | `ApiKeyInactiveException` | 400 (`BAD_REQUEST`) | `apiKey.error.inactive` | This API key is currently inactive. |
| `startAtNotFuture` | `50706` | `ApiKeyStartAtNotFutureException` | 400 (`BAD_REQUEST`) | `apiKey.error.startAtNotFuture` | The start date must be in the future. |
| `guardMissing` | `50707` | `ApiKeyGuardMissingException` | 401 (`UNAUTHORIZED`) | `apiKey.error.guardMissing` | The API key could not be verified for this request. |
| `endAtNotFuture` | `50708` | `ApiKeyEndAtNotFutureException` | 400 (`BAD_REQUEST`) | `apiKey.error.endAtNotFuture` | The end date must be in the future. |

### `auth`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `jwtAccessTokenInvalid` | `50800` | `AuthJwtAccessTokenInvalidException` | 401 (`UNAUTHORIZED`) | `auth.error.accessTokenUnauthorized` | The access token is unauthorized. |
| `jwtRefreshTokenInvalid` | `50801` | `AuthJwtRefreshTokenInvalidException` | 401 (`UNAUTHORIZED`) | `auth.error.refreshTokenUnauthorized` | The refresh token is unauthorized. |
| `socialGoogleRequired` | `50802` | `AuthSocialGoogleRequiredException` | 401 (`UNAUTHORIZED`) | `auth.error.socialGoogleRequired` | Google login is required for this action. |
| `socialGoogleInvalid` | `50803` | `AuthSocialGoogleInvalidException` | 401 (`UNAUTHORIZED`) | `auth.error.socialGoogleInvalid` | There was an error with Google login. |
| `socialAppleRequired` | `50804` | `AuthSocialAppleRequiredException` | 401 (`UNAUTHORIZED`) | `auth.error.socialAppleRequired` | Apple login is required for this action. |
| `socialAppleInvalid` | `50805` | `AuthSocialAppleInvalidException` | 401 (`UNAUTHORIZED`) | `auth.error.socialAppleInvalid` | There was an error with Apple login. |
| `socialGoogleNotConfigured` | `50806` | `AuthSocialGoogleNotConfiguredException` | 501 (`NOT_IMPLEMENTED`) | `auth.error.socialGoogleNotConfigured` | Google login is not configured. |
| `socialAppleNotConfigured` | `50807` | `AuthSocialAppleNotConfiguredException` | 501 (`NOT_IMPLEMENTED`) | `auth.error.socialAppleNotConfigured` | Apple login is not configured. |
| `providerUnavailable` | `50808` | `AuthProviderUnavailableException` | 503 (`SERVICE_UNAVAILABLE`) | `auth.error.providerUnavailable` | The sign-in provider is temporarily unavailable. Please try again shortly. |
| `jwtGuardMissing` | `50809` | `AuthJwtGuardMissingException` | 401 (`UNAUTHORIZED`) | `auth.error.jwtGuardMissing` | Your session could not be verified. Please sign in again. |
| `passwordContextWord` | `50810` | `AuthPasswordContextWordException` | 400 (`BAD_REQUEST`) | `auth.error.passwordContextWord` | The password must not contain the application name, your email name, username, or name. |
| `passwordCommon` | `50811` | `AuthPasswordCommonException` | 400 (`BAD_REQUEST`) | `auth.error.passwordCommon` | The password is too common. Choose a different one. |
| `socialNonceInvalid` | `50812` | `AuthSocialNonceInvalidException` | 401 (`UNAUTHORIZED`) | `auth.error.socialNonceInvalid` | The sign-in nonce is missing, expired, or already used. |

### `country`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `50900` | `CountryNotFoundException` | 404 (`NOT_FOUND`) | `country.error.notFound` | Country not found. |

### `user`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `51000` | `UserNotFoundException` | 404 (`NOT_FOUND`) | `user.error.notFound` | Sorry, we couldn't find the user you requested. |
| `notSelf` | `51001` | `UserNotSelfException` | 400 (`BAD_REQUEST`) | `user.error.notSelf` | You cannot perform this action on your own account. |
| `emailExist` | `51002` | `UserEmailExistException` | 409 (`CONFLICT`) | `user.error.emailExist` | This email already exists. |
| `usernameExist` | `51003` | `UserUsernameExistException` | 409 (`CONFLICT`) | `user.error.usernameExist` | This username has already been taken. |
| `mobileNumberNotFound` | `51004` | `UserMobileNumberNotFoundException` | 404 (`NOT_FOUND`) | `user.error.mobileNumberNotFound` | Mobile number not found. |
| `statusInvalid` | `51005` | `UserStatusInvalidException` | 400 (`BAD_REQUEST`) | `user.error.statusInvalid` | Invalid user status. |
| `blockedInvalid` | `51006` | `UserBlockedInvalidException` | 400 (`BAD_REQUEST`) | `user.error.blockedInvalid` | This user account has been blocked. |
| `inactiveForbidden` | `51007` | `UserInactiveForbiddenException` | 403 (`FORBIDDEN`) | `user.error.inactive` | This user is inactive. |
| `blockedForbidden` | `51008` | `UserBlockedForbiddenException` | 403 (`FORBIDDEN`) | `user.error.blocked` | This user account has been blocked. |
| `passwordNotMatch` | `51009` | `UserPasswordNotMatchException` | 400 (`BAD_REQUEST`) | `user.error.passwordNotMatch` | Passwords do not match. |
| `passwordExpired` | `51010` | `UserPasswordExpiredException` | 403 (`FORBIDDEN`) | `user.error.passwordExpired` | Your password has expired. |
| `passwordAttemptMax` | `51011` | `UserPasswordAttemptMaxException` | 403 (`FORBIDDEN`) | `user.error.passwordAttemptMax` | Maximum password attempts exceeded. |
| `mobileNumberInvalid` | `51012` | `UserMobileNumberInvalidException` | 400 (`BAD_REQUEST`) | `user.error.mobileNumberInvalid` | This mobile number is invalid. |
| `usernameNotAllowed` | `51013` | `UserUsernameNotAllowedException` | 400 (`BAD_REQUEST`) | `user.error.usernameNotAllowed` | This username is not allowed. |
| `usernameContainBadWord` | `51014` | `UserUsernameContainBadWordException` | 400 (`BAD_REQUEST`) | `user.error.usernameContainBadWord` | Username contains inappropriate words. |
| `emailNotVerified` | `51015` | `UserEmailNotVerifiedException` | 403 (`FORBIDDEN`) | `user.error.emailNotVerified` | Email not verified. |
| `tokenInvalid` | `51016` | `UserTokenInvalidException` | 400 (`BAD_REQUEST`) | `user.error.verificationTokenInvalid` | Verification token is invalid or expired. |
| `emailAlreadyVerified` | `51017` | `UserEmailAlreadyVerifiedException` | 400 (`BAD_REQUEST`) | `user.error.emailAlreadyVerified` | This email has already been verified. |
| `mobileNumberExist` | `51018` | `UserMobileNumberExistException` | 409 (`CONFLICT`) | `user.error.mobileNumberExist` | This mobile number already exists. |
| `accountNotFound` | `51019` | `UserAccountNotFoundException` | 401 (`UNAUTHORIZED`) | `user.error.accountNotFound` | The account of this session does not exist. |
| `importEmailExist` | `51020` | `UserImportEmailExistException` | 409 (`CONFLICT`) | `user.error.importEmailExist` | There are existing users with the provided email addresses. Email: {emails} |
| `importUsernameExist` | `51021` | `UserImportUsernameExistException` | 409 (`CONFLICT`) | `user.error.importUsernameExist` | There are existing users with the provided usernames. Username: {usernames} |
| `guardMissing` | `51022` | `UserGuardMissingException` | 401 (`UNAUTHORIZED`) | `user.error.guardMissing` | Your account could not be verified. Please sign in again. |
| `photoKeyInvalid` | `51023` | `UserPhotoKeyInvalidException` | 400 (`BAD_REQUEST`) | `user.error.photoKeyInvalid` | This photo does not belong to your profile. |
| `photoSizeExceeded` | `51024` | `UserPhotoSizeExceededException` | 400 (`BAD_REQUEST`) | `user.error.photoSizeExceeded` | This photo is larger than the allowed size. |
| `credentialInvalid` | `51025` | `UserCredentialInvalidException` | 401 (`UNAUTHORIZED`) | `user.error.credentialInvalid` | The email or password is incorrect. |
| `deleteSelfForbidden` | `51026` | `UserDeleteSelfForbiddenException` | 403 (`FORBIDDEN`) | `user.error.deleteSelfForbidden` | An administrator account cannot delete itself. |
| `reauthenticationOtpNotAllowed` | `51027` | `UserReauthenticationOtpNotAllowedException` | 400 (`BAD_REQUEST`) | `user.error.reauthenticationOtpNotAllowed` | A one-time code is not available for an account with a password or multi-factor authentication. |
| `reauthenticationOtpResendLimit` | `51028` | `UserReauthenticationOtpResendLimitException` | 429 (`TOO_MANY_REQUESTS`) | `user.error.reauthenticationOtpResendLimit` | A one-time code for this action was sent recently. Please wait before requesting another. |
| `reauthenticationOtpRequired` | `51029` | `UserReauthenticationOtpRequiredException` | 400 (`BAD_REQUEST`) | `user.error.reauthenticationOtpRequired` | A one-time code is required for this action. |
| `reauthenticationOtpInvalid` | `51030` | `UserReauthenticationOtpInvalidException` | 400 (`BAD_REQUEST`) | `user.error.reauthenticationOtpInvalid` | The one-time code is invalid or expired. |
| `photoContentInvalid` | `51031` | `UserPhotoContentInvalidException` | 415 (`UNSUPPORTED_MEDIA_TYPE`) | `user.error.photoContentInvalid` | This photo is not a valid image. |
| `mobileNumberAlreadyVerified` | `51032` | `UserMobileNumberAlreadyVerifiedException` | 400 (`BAD_REQUEST`) | `user.error.mobileNumberAlreadyVerified` | This mobile number has already been verified. |

### `policy`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `forbidden` | `51100` | `PolicyForbiddenException` | 403 (`FORBIDDEN`) | `policy.error.forbidden` | Sorry, you don't have the necessary permissions to perform this action. |
| `notFound` | `51101` | `PolicyNotFoundException` | 404 (`NOT_FOUND`) | `policy.error.notFound` | Sorry, we couldn't find the requested policy. |
| `exist` | `51102` | `PolicyExistException` | 409 (`CONFLICT`) | `policy.error.exist` | This role already grants a policy for that subject. |
| `guardMissing` | `51103` | `PolicyGuardMissingException` | 403 (`FORBIDDEN`) | `policy.error.guardMissing` | Your permissions could not be verified for this request. |
| `roleTypeInvalid` | `51104` | `PolicyRoleTypeInvalidException` | 400 (`BAD_REQUEST`) | `policy.error.roleTypeInvalid` | Policies can only be granted to admin-type roles. |

### `notification`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `51200` | `NotificationNotFoundException` | 404 (`NOT_FOUND`) | `notification.error.notFound` | Notification not found. |
| `alreadyRead` | `51201` | `NotificationAlreadyReadException` | 400 (`BAD_REQUEST`) | `notification.error.alreadyRead` | Notification is already marked as read. |
| `invalidType` | `51202` | `NotificationInvalidTypeException` | 400 (`BAD_REQUEST`) | `notification.error.invalidType` | Invalid notification type. |
| `invalidChannel` | `51203` | `NotificationInvalidChannelException` | 400 (`BAD_REQUEST`) | `notification.error.invalidChannel` | Invalid notification channel. |
| `settingInvalid` | `51204` | `NotificationSettingInvalidException` | 400 (`BAD_REQUEST`) | `notification.error.settingInvalid` | Notification setting cannot be updated. |

### `device`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `51300` | `DeviceNotFoundException` | 404 (`NOT_FOUND`) | `device.error.notFound` | Device information not found |

### `aws`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `s3KeyInvalid` | `51400` | `AwsS3KeyInvalidException` | 500 (`INTERNAL_SERVER_ERROR`) | `aws.error.s3KeyInvalid` | The storage key is invalid. |
| `s3FileRequired` | `51401` | `AwsS3FileRequiredException` | 500 (`INTERNAL_SERVER_ERROR`) | `aws.error.s3FileRequired` | A file is required for this storage operation. |
| `s3ObjectExist` | `51402` | `AwsS3ObjectExistException` | 409 (`CONFLICT`) | `aws.error.s3ObjectExist` | A file already exists at this location. |
| `s3MaxPartNumberExceeded` | `51403` | `AwsS3MaxPartNumberExceededException` | 500 (`INTERNAL_SERVER_ERROR`) | `aws.error.s3MaxPartNumberExceeded` | The multipart upload exceeds the maximum number of parts. |
| `s3IterationLimitExceeded` | `51404` | `AwsS3IterationLimitExceededException` | 500 (`INTERNAL_SERVER_ERROR`) | `aws.error.s3IterationLimitExceeded` | The storage operation exceeded its iteration limit. |
| `sesTemplateBodyRequired` | `51405` | `AwsSesTemplateBodyRequiredException` | 500 (`INTERNAL_SERVER_ERROR`) | `aws.error.sesTemplateBodyRequired` | An email template needs an HTML or plain-text body. |
| `s3NotConfigured` | `51406` | `AwsS3NotConfiguredException` | 501 (`NOT_IMPLEMENTED`) | `aws.error.s3NotConfigured` | File storage is not configured. |
| `sesNotConfigured` | `51407` | `AwsSesNotConfiguredException` | 501 (`NOT_IMPLEMENTED`) | `aws.error.sesNotConfigured` | Email delivery is not configured. |
| `unavailable` | `51408` | `AwsUnavailableException` | 503 (`SERVICE_UNAVAILABLE`) | `aws.error.unavailable` | The service is temporarily unavailable. Please try again later. |

### `term-policy`

The `module` field is `termPolicy`.

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `51500` | `TermPolicyNotFoundException` | 404 (`NOT_FOUND`) | `termPolicy.error.notFound` | Term policy not found. |
| `exist` | `51501` | `TermPolicyExistException` | 409 (`CONFLICT`) | `termPolicy.error.exist` | A term policy with this name already exists. |
| `languageDuplicate` | `51502` | `TermPolicyLanguageDuplicateException` | 400 (`BAD_REQUEST`) | `termPolicy.error.contentsLanguageMustBeUnique` | Each language can only be used once in term policy contents. |
| `alreadyAccepted` | `51503` | `TermPolicyAlreadyAcceptedException` | 400 (`BAD_REQUEST`) | `termPolicy.error.alreadyAccepted` | You have already accepted this term policy. |
| `requiredInvalid` | `51504` | `TermPolicyRequiredInvalidException` | 403 (`FORBIDDEN`) | `termPolicy.error.requiredInvalid` | Accept the latest terms or policies to continue. |
| `statusInvalid` | `51505` | `TermPolicyStatusInvalidException` | 400 (`BAD_REQUEST`) | `termPolicy.error.statusInvalid` | Term policy status is invalid. |
| `contentNotFound` | `51506` | `TermPolicyContentNotFoundException` | 404 (`NOT_FOUND`) | `termPolicy.error.contentNotFound` | Term policy content not found. |
| `contentExist` | `51507` | `TermPolicyContentExistException` | 409 (`CONFLICT`) | `termPolicy.error.contentExist` | This content already exists in the term policy. |
| `contentEmpty` | `51508` | `TermPolicyContentEmptyException` | 400 (`BAD_REQUEST`) | `termPolicy.error.contentEmpty` | Term policy content cannot be empty. |
| `contentInvalid` | `51509` | `TermPolicyContentInvalidException` | 500 (`INTERNAL_SERVER_ERROR`) | `termPolicy.error.contentInvalid` | Term policy content is invalid. |
| `requiredNotPublished` | `51510` | `TermPolicyRequiredNotPublishedException` | 500 (`INTERNAL_SERVER_ERROR`) | `termPolicy.error.requiredNotPublished` | A required term policy is not published yet. |
| `contentSizeExceeded` | `51511` | `TermPolicyContentSizeExceededException` | 400 (`BAD_REQUEST`) | `termPolicy.error.contentSizeExceeded` | Term policy content is larger than the allowed size. |
| `contentKeyInvalid` | `51512` | `TermPolicyContentKeyInvalidException` | 400 (`BAD_REQUEST`) | `termPolicy.error.contentKeyInvalid` | Term policy content key is outside the policy storage path. |
| `contentTypeInvalid` | `51513` | `TermPolicyContentTypeInvalidException` | 415 (`UNSUPPORTED_MEDIA_TYPE`) | `termPolicy.error.contentTypeInvalid` | Term policy content must be a text template. |

### `workspace`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `51600` | `WorkspaceNotFoundException` | 404 (`NOT_FOUND`) | `workspace.error.notFound` | Sorry, we couldn't find the workspace. |
| `memberForbidden` | `51601` | `WorkspaceMemberForbiddenException` | 403 (`FORBIDDEN`) | `workspace.error.memberForbidden` | You are not a member of this workspace. |
| `roleForbidden` | `51602` | `WorkspaceRoleForbiddenException` | 403 (`FORBIDDEN`) | `workspace.error.roleForbidden` | You do not have the required role in this workspace. |
| `inviteInvalid` | `51603` | `WorkspaceInviteInvalidException` | 400 (`BAD_REQUEST`) | `workspace.error.inviteInvalid` | This workspace invite link is invalid or has expired. |
| `capReached` | `51604` | `WorkspaceCapReachedException` | 400 (`BAD_REQUEST`) | `workspace.error.capReached` | You have reached the maximum number of workspaces you can own. |
| `slugAlreadyExists` | `51605` | `WorkspaceSlugAlreadyExistsException` | 400 (`BAD_REQUEST`) | `workspace.error.slugAlreadyExists` | This workspace slug is already taken. |
| `memberNotFound` | `51606` | `WorkspaceMemberNotFoundException` | 404 (`NOT_FOUND`) | `workspace.error.memberNotFound` | Sorry, we couldn't find that workspace member. |
| `lastOwner` | `51607` | `WorkspaceLastOwnerException` | 400 (`BAD_REQUEST`) | `workspace.error.lastOwner` | You are the last owner; transfer ownership before leaving. |
| `memberPeerForbidden` | `51608` | `WorkspaceMemberPeerForbiddenException` | 403 (`FORBIDDEN`) | `workspace.error.memberPeerForbidden` | You are not allowed to perform this action on this member. |
| `inviteDuplicate` | `51609` | `WorkspaceInviteDuplicateException` | 400 (`BAD_REQUEST`) | `workspace.error.inviteDuplicate` | There is already a pending invite for this email in this workspace. |
| `inviteProjectMismatch` | `51610` | `WorkspaceInviteProjectMismatchException` | 400 (`BAD_REQUEST`) | `workspace.error.inviteProjectMismatch` | This project does not belong to the current workspace. |
| `inviteRoleRequired` | `51611` | `WorkspaceInviteRoleRequiredException` | 400 (`BAD_REQUEST`) | `workspace.error.inviteRoleRequired` | projectMemberRole is required when projectId is set, and must be omitted otherwise. |
| `inviteNotFound` | `51612` | `WorkspaceInviteNotFoundException` | 404 (`NOT_FOUND`) | `workspace.error.inviteNotFound` | Sorry, we couldn't find that workspace invite. |
| `inviteAlreadyProcessed` | `51613` | `WorkspaceInviteAlreadyProcessedException` | 400 (`BAD_REQUEST`) | `workspace.error.inviteAlreadyProcessed` | This workspace invite is not pending. |
| `notPublic` | `51614` | `WorkspaceNotPublicException` | 400 (`BAD_REQUEST`) | `workspace.error.notPublic` | This workspace is not accepting public join requests. |
| `joinRequestAlreadyMember` | `51615` | `WorkspaceJoinRequestAlreadyMemberException` | 400 (`BAD_REQUEST`) | `workspace.error.joinRequestAlreadyMember` | You are already a member of this workspace. |
| `joinRequestDuplicate` | `51616` | `WorkspaceJoinRequestDuplicateException` | 400 (`BAD_REQUEST`) | `workspace.error.joinRequestDuplicate` | You already have a pending join request for this workspace. |
| `joinRequestNotFound` | `51617` | `WorkspaceJoinRequestNotFoundException` | 404 (`NOT_FOUND`) | `workspace.error.joinRequestNotFound` | Sorry, we couldn't find that workspace join request. |
| `joinRequestAlreadyProcessed` | `51618` | `WorkspaceJoinRequestAlreadyProcessedException` | 400 (`BAD_REQUEST`) | `workspace.error.joinRequestAlreadyProcessed` | This workspace join request is not pending. |
| `selfTransfer` | `51619` | `WorkspaceSelfTransferException` | 400 (`BAD_REQUEST`) | `workspace.error.selfTransfer` | You cannot transfer ownership to yourself. |
| `slugInvalid` | `51620` | `WorkspaceSlugInvalidException` | 400 (`BAD_REQUEST`) | `workspace.error.slugInvalid` | This workspace slug is not allowed; use lower-case letters, digits and hyphens only, within the allowed length. |
| `headerMissing` | `51621` | `WorkspaceHeaderMissingException` | 400 (`BAD_REQUEST`) | `workspace.error.headerMissing` | The x-workspace-id header is required. |
| `guardMissing` | `51622` | `WorkspaceGuardMissingException` | 403 (`FORBIDDEN`) | `workspace.error.guardMissing` | The workspace could not be verified for this request. |
| `memberAlreadyExists` | `51623` | `WorkspaceMemberAlreadyExistsException` | 400 (`BAD_REQUEST`) | `workspace.error.memberAlreadyExists` | This user is already a member of this workspace. |
| `ownerTransferRequired` | `51624` | `WorkspaceOwnerTransferRequiredException` | 400 (`BAD_REQUEST`) | `workspace.error.ownerTransferRequired` | You own a workspace with other members; transfer ownership before deleting your account. |
| `transferTargetInactive` | `51625` | `WorkspaceTransferTargetInactiveException` | 400 (`BAD_REQUEST`) | `workspace.error.transferTargetInactive` | Ownership can only be transferred to a member whose account is active. |
| `inviteReferenceExist` | `51626` | `WorkspaceInviteReferenceExistException` | 409 (`CONFLICT`) | `workspace.error.inviteReferenceExist` | This invite reference is already in use. |

### `project`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `notFound` | `51700` | `ProjectNotFoundException` | 404 (`NOT_FOUND`) | `project.error.notFound` | Sorry, we couldn't find the project. |
| `memberForbidden` | `51701` | `ProjectMemberForbiddenException` | 403 (`FORBIDDEN`) | `project.error.memberForbidden` | You are not a member of this project. |
| `roleForbidden` | `51702` | `ProjectRoleForbiddenException` | 403 (`FORBIDDEN`) | `project.error.roleForbidden` | You do not have the required role in this project. |
| `memberPeerForbidden` | `51703` | `ProjectMemberPeerForbiddenException` | 403 (`FORBIDDEN`) | `project.error.memberPeerForbidden` | You are not allowed to perform this action on this member. |
| `memberNotFound` | `51704` | `ProjectMemberNotFoundException` | 404 (`NOT_FOUND`) | `project.error.memberNotFound` | Sorry, we couldn't find that project member. |
| `memberAlreadyAssigned` | `51705` | `ProjectMemberAlreadyAssignedException` | 400 (`BAD_REQUEST`) | `project.error.memberAlreadyAssigned` | This user is already assigned to the project. |
| `slugAlreadyExists` | `51706` | `ProjectSlugAlreadyExistsException` | 400 (`BAD_REQUEST`) | `project.error.slugAlreadyExists` | This project slug is already taken in this workspace. |
| `slugInvalid` | `51707` | `ProjectSlugInvalidException` | 400 (`BAD_REQUEST`) | `project.error.slugInvalid` | This project slug is not allowed; use lower-case letters, digits and hyphens only, within the allowed length. |

### `response`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `serialization` | `51900` | `ResponseSerializationException` | 500 (`INTERNAL_SERVER_ERROR`) | `response.error.serialization` | The server produced a response that does not match the schema it declares. |
| `paginationShapeInvalid` | `51901` | `ResponsePaginationShapeInvalidException` | 500 (`INTERNAL_SERVER_ERROR`) | `response.error.paginationShapeInvalid` | The server produced a paginated response with an invalid shape. |
| `paginationTypeInvalid` | `51902` | `ResponsePaginationTypeInvalidException` | 500 (`INTERNAL_SERVER_ERROR`) | `response.error.paginationTypeInvalid` | The server produced a paginated response with an unknown pagination type. |
| `fileDataInvalid` | `51903` | `ResponseFileDataInvalidException` | 500 (`INTERNAL_SERVER_ERROR`) | `response.error.fileDataInvalid` | The server produced a file response with missing or invalid data. |

### `activity-log`

The `module` field is `activityLog`.

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `contractInvalid` | `52000` | `ActivityLogContractInvalidException` | 500 (`INTERNAL_SERVER_ERROR`) | `activityLog.error.contractInvalid` | Activity log contract validation failed |

### `analytic`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `invalidDateRange` | `52100` | `AnalyticInvalidDateRangeException` | 400 (`BAD_REQUEST`) | `analytic.error.invalidDateRange` | The start date must be before the end date and the range cannot exceed the maximum window. |

### `helper`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `decryptFailed` | `52200` | `HelperDecryptFailedException` | 500 (`INTERNAL_SERVER_ERROR`) | `helper.error.decryptFailed` | We couldn't read protected data for this request. |
| `encryptionSecretInvalid` | `52201` | `HelperEncryptionSecretInvalidException` | 500 (`INTERNAL_SERVER_ERROR`) | `helper.error.encryptionSecretInvalid` | We couldn't process protected data for this request. |
| `patternTokenMissing` | `52202` | `HelperPatternTokenMissingException` | 500 (`INTERNAL_SERVER_ERROR`) | `helper.error.patternTokenMissing` | We couldn't build a value for this request. Missing pattern token: {token} |

### `redis`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `unavailable` | `52400` | `RedisUnavailableException` | 503 (`SERVICE_UNAVAILABLE`) | `redis.error.unavailable` | The service is temporarily unavailable. Please try again later. |

### `mfa`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `invalid` | `52600` | `MfaInvalidException` | 401 (`UNAUTHORIZED`) | `mfa.error.invalid` | The provided multi-factor authentication code is invalid. |
| `challengeInvalid` | `52601` | `MfaChallengeInvalidException` | 401 (`UNAUTHORIZED`) | `mfa.error.challengeInvalid` | The multi-factor authentication challenge is invalid or has expired. |
| `notEnabled` | `52602` | `MfaNotEnabledException` | 400 (`BAD_REQUEST`) | `mfa.error.notEnabled` | Multi-factor authentication is not enabled for this account. |
| `attemptMax` | `52603` | `MfaAttemptMaxException` | 403 (`FORBIDDEN`) | `mfa.error.attemptMax` | Maximum multi-factor authentication attempts exceeded. |
| `methodRequired` | `52604` | `MfaMethodRequiredException` | 400 (`BAD_REQUEST`) | `mfa.error.methodRequired` | A multi-factor authentication method is required. |
| `methodUnavailable` | `52605` | `MfaMethodUnavailableException` | 400 (`BAD_REQUEST`) | `mfa.error.methodUnavailable` | The selected multi-factor authentication method is not available for this account. |
| `totpAlreadyEnabled` | `52606` | `MfaTotpAlreadyEnabledException` | 400 (`BAD_REQUEST`) | `mfa.error.totpAlreadyEnabled` | An authenticator app is already enabled. |
| `totpNotEnabled` | `52607` | `MfaTotpNotEnabledException` | 400 (`BAD_REQUEST`) | `mfa.error.totpNotEnabled` | No authenticator app is enabled for this account. |
| `totpSetupRequired` | `52608` | `MfaTotpSetupRequiredException` | 400 (`BAD_REQUEST`) | `mfa.error.totpSetupRequired` | Start authenticator app setup before confirming the code. |
| `totpSecretUnavailable` | `52609` | `MfaTotpSecretUnavailableException` | 409 (`CONFLICT`) | `mfa.error.totpSecretUnavailable` | Authenticator codes can't be checked for this account. Sign in with a backup code, then set up an authenticator app again using another backup code. |
| `passkeyInvalid` | `52610` | `MfaPasskeyInvalidException` | 401 (`UNAUTHORIZED`) | `mfa.error.passkeyInvalid` | The passkey could not be verified. |
| `passkeyLimit` | `52611` | `MfaPasskeyLimitException` | 400 (`BAD_REQUEST`) | `mfa.error.passkeyLimit` | The maximum number of passkeys has been reached. Delete a passkey before registering another. |
| `passkeyAlreadyRegistered` | `52612` | `MfaPasskeyAlreadyRegisteredException` | 409 (`CONFLICT`) | `mfa.error.passkeyAlreadyRegistered` | This passkey is already registered. |
| `passkeyNotFound` | `52613` | `MfaPasskeyNotFoundException` | 404 (`NOT_FOUND`) | `mfa.error.passkeyNotFound` | The passkey was not found. |

### `password-history`

The `module` field is `passwordHistory`.

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `mustNew` | `52700` | `PasswordHistoryMustNewException` | 400 (`BAD_REQUEST`) | `passwordHistory.error.mustNew` | New password must be different from previous passwords within the past {period} days. |

### `database`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `unavailable` | `52800` | `DatabaseUnavailableException` | 503 (`SERVICE_UNAVAILABLE`) | `database.error.unavailable` | The service is temporarily unavailable. Please try again later. |

### `firebase`

| Member | Code | Exception | HTTP status | Message path | Message |
| --- | --- | --- | --- | --- | --- |
| `unavailable` | `52900` | `FirebaseUnavailableException` | 503 (`SERVICE_UNAVAILABLE`) | `firebase.error.unavailable` | The service is temporarily unavailable. Please try again later. |

<!-- REFERENCES -->

[ref-doc-guide-status-code]: ../guides/status-code.md
[ref-doc-error-handling]: ../concepts/error-handling.md
[ref-doc-http-contract]: http-contract.md
[ref-doc-dependencies]: ../concepts/dependencies.md
[ref-doc-i18n]: ../concepts/i18n.md
