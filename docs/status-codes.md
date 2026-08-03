# Status Codes

This document catalogs every application `statusCode` in the boilerplate, grouped by module.

`statusCode` is the field on `AppBaseException` / `ResponseErrorDto`. It is **not** an HTTP status — `httpStatus` is a separate field on the same error response. Clients should prefer `module` + `statusCodeKey` over the raw integer.

The machine registry is the `*.status-code.enum.ts` files under `src/`. This page is the human catalog. Allocation procedure lives in the project status-code rules. Error filter flow: [Handling Error](handling-error.md). i18n paths: [Message](message.md). Response shape: [Response](response.md).

## Block map

| Base | Module | Range | Members |
|---|---|---|---|
| `50000` | `app` | `50000` | 1 |
| `50100` | `file` | `50100`–`50103` | 4 |
| `50200` | `pagination` | `50200`–`50215` | 16 |
| `50300` | `request` | `50300`–`50303` | 4 |
| `50400` | `session` | `50400`–`50401` | 2 |
| `50500` | `role` | `50500`–`50504` | 5 |
| `50600` | `feature-flag` | `50600`–`50605` | 6 |
| `50700` | `api-key` | `50700`–`50707` | 8 |
| `50800` | `auth` | `50800`–`50814` | 15 |
| `50900` | `country` | `50900`–`50903` | 4 |
| `51000` | `user` | `51000`–`51026` | 27 |
| `51100` | `policy` | `51100`–`51101` | 2 |
| `51200` | `notification` | `51200`–`51203` | 4 |
| `51300` | `device` | `51300` | 1 |
| `51400` | `aws` | `51400` | 1 |
| `51500` | `term-policy` | `51500`–`51508` | 9 |

Next free hundred: `51600` (verify by scanning enums before claiming).

## `app`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
| `unknown` | `50000` | `unknown` | 500 (`INTERNAL_SERVER_ERROR`) | `http.serverError.internalServerError` | Internal Server Error |

## `file`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
| `required` | `50100` | `required` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.required` | This field is required and cannot be left blank. |
| `extensionInvalid` | `50101` | `extensionInvalid` | 415 (`UNSUPPORTED_MEDIA_TYPE`) | `file.error.extensionInvalid` | The file extension is invalid. |
| `requiredExtractFirst` | `50102` | `requiredExtractFirst` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.requiredParseFirst` | Please parse the data before proceeding. |
| `exceedMaxDataImport` | `50103` | `exceedMaxDataImport` | 422 (`UNPROCESSABLE_ENTITY`) | `file.error.exceedMaxDataImport` | The number of data rows exceeds the maximum allowed for import. |

## `pagination`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
| `orderByNotAllowed` | `50200` | `orderByNotAllowed` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.orderByNotAllowed` | The 'orderBy' field '{field}' is not allowed. Allowed fields are: {allowedFields}. |
| `filterInvalidValue` | `50201` | `filterInvalidValue` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.filterInvalidValue` | '{property}' value provided is invalid. |
| `invalidPerPage` | `50202` | `invalidPerPage` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidPerPage` | The 'perPage' parameter must be between 1 and {maxPerPage}. |
| `invalidCursorPaginationParams` | `50203` | `invalidCursorPaginationParams` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidCursorPaginationParams` | Invalid cursor pagination parameters provided. |
| `cursorTooLong` | `50204` | `cursorTooLong` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.cursorTooLong` | The cursor length must not exceed {maxCursorLength} characters. |
| `invalidCursorFormat` | `50205` | `invalidCursorFormat` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidCursorFormat` | The provided cursor is not in a valid format. |
| `invalidOffsetPaginationParams` | `50206` | `invalidOffsetPaginationParams` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidOffsetPaginationParams` | Invalid offset pagination parameters provided. |
| `invalidPage` | `50207` | `invalidPage` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidPage` | The 'page' parameter must be a positive integer and maximum {maxPage}. |
| `pageExceedsMaximum` | `50208` | `pageExceedsMaximum` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.pageExceedsMaximum` | The 'page' parameter exceeds the maximum allowed value of {maxPage}. Received: {receivedPage}. |
| `pageCannotBeLessThanOne` | `50209` | `pageCannotBeLessThanOne` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.pageCannotBeLessThanOne` | The 'page' parameter cannot be less than {minPage}. Received: {receivedPage}. |
| `perPageExceedsMaximum` | `50210` | `perPageExceedsMaximum` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.perPageExceedsMaximum` | The 'perPage' parameter exceeds the maximum allowed value of {maxPerPage}. Received: {receivedPerPage}. |
| `perPageCannotBeLessThanOne` | `50211` | `perPageCannotBeLessThanOne` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.perPageCannotBeLessThanOne` | The 'perPage' parameter cannot be less than {minPerPage}. Received: {receivedPerPage}. |
| `invalidCursorData` | `50212` | `invalidCursorData` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.invalidCursorData` | The provided cursor data is invalid. |
| `failedToEncodeCursor` | `50213` | `failedToEncodeCursor` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.failedToEncodeCursor` | Failed to encode cursor data. |
| `failedToDecodeCursor` | `50214` | `failedToDecodeCursor` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.failedToDecodeCursor` | Failed to decode cursor data. |
| `orderDirectionNotAllowed` | `50215` | `orderDirectionNotAllowed` | 422 (`UNPROCESSABLE_ENTITY`) | `pagination.error.orderDirectionNotAllowed` | The 'orderBy' direction is not allowed. Allowed directions are: {allowedDirections}. |

## `request`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
| `validation` | `50300` | `validation` | 422 (`UNPROCESSABLE_ENTITY`) | `request.error.validation` | There are validation errors. |
| `timeout` | `50301` | `timeout` | 408 (`REQUEST_TIMEOUT`) | `http.clientError.requestTimeOut` | Request Timeout |
| `paramRequired` | `50302` | `paramRequired` | 400 (`BAD_REQUEST`) | `request.error.paramRequired` | Required parameter is missing. |
| `envForbidden` | `50303` | `envForbidden` | 403 (`FORBIDDEN`) | `http.clientError.forbidden` | Forbidden |

## `session`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
| `notFound` | `50400` | `notFound` | 404 (`NOT_FOUND`) | `session.error.notFound` | Sorry, we couldn't find the session. |
| `forbidden` | `50401` | `forbidden` | 401 (`UNAUTHORIZED`) | `session.error.forbidden` | You cannot revoke your current session. |

## `role`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
| `notFound` | `50500` | `notFound` | 404 (`NOT_FOUND`) | `role.error.notFound` | Sorry, we couldn't find the requested role. |
| `exist` | `50501` | `exist` | 409 (`CONFLICT`) | `role.error.exist` | A role with this name already exists. |
| `predefinedNotFound` | `50502` | `predefinedNotFound` | 500 (`INTERNAL_SERVER_ERROR`) | `role.error.predefinedNotFound` | Predefined roles not setted. |
| `forbidden` | `50503` | `forbidden` | 403 (`FORBIDDEN`) | `role.error.forbidden` | Sorry, your role doesn't grant access to this resource. |
| `used` | `50504` | `used` | 409 (`CONFLICT`) | `role.error.used` | This role is currently in use and cannot be deleted. |

## `feature-flag`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
| `notFound` | `50600` | `notFound` | 404 (`NOT_FOUND`) | `featureFlag.error.notFound` | Feature flag not found. |
| `serviceUnavailable` | `50601` | `serviceUnavailable` | 503 (`SERVICE_UNAVAILABLE`) | `featureFlag.error.serviceUnavailable` | Feature flag service is currently unavailable. |
| `invalidMetadata` | `50602` | `invalidMetadata` | 400 (`BAD_REQUEST`) | `featureFlag.error.invalidMetadata` | Feature flag metadata is invalid. |
| `predefinedKeyLengthExceeded` | `50603` | `predefinedKeyLengthExceeded` | 500 (`INTERNAL_SERVER_ERROR`) | `featureFlag.error.predefinedKeyLengthExceeded` | Predefined key length exceeded the maximum allowed. |
| `predefinedKeyEmpty` | `50604` | `predefinedKeyEmpty` | 500 (`INTERNAL_SERVER_ERROR`) | `featureFlag.error.predefinedKeyEmpty` | Predefined key cannot be empty. |
| `predefinedKeyTypeInvalid` | `50605` | `predefinedKeyTypeInvalid` | 500 (`INTERNAL_SERVER_ERROR`) | `featureFlag.error.predefinedKeyTypeInvalid` | Predefined key type is invalid. |

## `api-key`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
| `xApiKeyRequired` | `50700` | `xApiKeyRequired` | 401 (`UNAUTHORIZED`) | `apiKey.error.xApiKey.required` | Please provide your API key to continue. |
| `xApiKeyNotFound` | `50701` | `xApiKeyNotFound` | 403 (`FORBIDDEN`) | `apiKey.error.xApiKey.notFound` | We couldn't find this API key in our system. |
| `xApiKeyInvalid` | `50702` | `xApiKeyInvalid` | 401 (`UNAUTHORIZED`) | `apiKey.error.xApiKey.invalid` | Sorry, this API key appears to be invalid. |
| `xApiKeyForbidden` | `50703` | `xApiKeyForbidden` | 403 (`FORBIDDEN`) | `apiKey.error.xApiKey.forbidden` | You don't have permission to use this API key. |
| `xApiKeyPredefinedNotFound` | `50704` | `xApiKeyPredefinedNotFound` | 500 (`INTERNAL_SERVER_ERROR`) | `apiKey.error.xApiKey.predefinedNotFound` | Predefined API key not found in the system. |
| `expired` | `50705` | `expired` | 400 (`BAD_REQUEST`) | `apiKey.error.expired` | This API key has expired. Would you like to create a new one? |
| `notFound` | `50706` | `notFound` | 404 (`NOT_FOUND`) | `apiKey.error.notFound` | We couldn't locate this API key. Please check and try again. |
| `inactive` | `50707` | `inactive` | 400 (`BAD_REQUEST`) | `apiKey.error.inactive` | This API key is currently inactive. |

## `auth`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
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

## `country`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
| `notFound` | `50900` | `notFound` | 404 (`NOT_FOUND`) | `country.error.notFound` | Country not found. |
| `isActive` | `50901` | `isActive` | — | `country.error.isActive` | — |
| `inactive` | `50902` | `inactive` | — | `country.error.inactive` | — |
| `exist` | `50903` | `exist` | — | `country.error.exist` | — |

## `user`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
| `notFound` | `51000` | `notFound` | 404 (`NOT_FOUND`) | `user.error.notFound` | Sorry, we couldn't find the user you requested. |
| `notSelf` | `51001` | `notSelf` | 400 (`BAD_REQUEST`) | `user.error.notSelf` | You cannot perform this action on your own account. |
| `emailExist` | `51002` | `emailExist` | 409 (`CONFLICT`) | `user.error.emailExist` | This email already exists. |
| `usernameExist` | `51003` | `usernameExist` | 409 (`CONFLICT`) | `user.error.usernameExist` | This username has already been taken. |
| `mobileNumberNotFound` | `51004` | `mobileNumberNotFound` | 404 (`NOT_FOUND`) | `user.error.mobileNumberNotFound` | Mobile number not found. |
| `statusInvalid` | `51005` | `statusInvalid` | — | `user.error.statusInvalid` | Invalid user status. |
| `blockedInvalid` | `51006` | `blockedInvalid` | 400 (`BAD_REQUEST`) | `user.error.blockedInvalid` | This user account has been blocked. |
| `inactiveForbidden` | `51007` | `inactiveForbidden` | 403 (`FORBIDDEN`) | `user.error.inactive` | This user is inactive. |
| `deletedForbidden` | `51008` | `deletedForbidden` | — | `user.error.deletedForbidden` | — |
| `blockedForbidden` | `51009` | `blockedForbidden` | 403 (`FORBIDDEN`) | `user.error.blocked` | This user account has been blocked. |
| `passwordNotMatch` | `51010` | `passwordNotMatch` | 400 (`BAD_REQUEST`) | `auth.error.passwordNotMatch` | Passwords do not match. |
| `passwordMustNew` | `51011` | `passwordMustNew` | 400 (`BAD_REQUEST`) | `auth.error.passwordMustNew` | New password must be different from previous passwords within the past {period} days. |
| `passwordExpired` | `51012` | `passwordExpired` | 403 (`FORBIDDEN`) | `auth.error.passwordExpired` | Your password has expired. |
| `passwordAttemptMax` | `51013` | `passwordAttemptMax` | 403 (`FORBIDDEN`) | `auth.error.passwordAttemptMax` | Maximum password attempts exceeded. |
| `mobileNumberInvalid` | `51014` | `mobileNumberInvalid` | 400 (`BAD_REQUEST`) | `user.error.mobileNumberInvalid` | This mobile number is invalid. |
| `usernameNotAllowed` | `51015` | `usernameNotAllowed` | 400 (`BAD_REQUEST`) | `user.error.usernameNotAllowed` | This username is not allowed. |
| `usernameContainBadWord` | `51016` | `usernameContainBadWord` | 400 (`BAD_REQUEST`) | `user.error.usernameContainBadWord` | Username contains inappropriate words. |
| `emailNotVerified` | `51017` | `emailNotVerified` | 403 (`FORBIDDEN`) | `user.error.emailNotVerified` | Email not verified. |
| `passwordNotSet` | `51018` | `passwordNotSet` | 400 (`BAD_REQUEST`) | `auth.error.passwordNotSet` | Password has not been set for this account. |
| `tokenInvalid` | `51019` | `tokenInvalid` | 400 (`BAD_REQUEST`) | `user.error.verificationTokenInvalid` | Verification token is invalid or expired. |
| `emailAlreadyVerified` | `51020` | `emailAlreadyVerified` | 400 (`BAD_REQUEST`) | `user.error.emailAlreadyVerified` | This email has already been verified. |
| `mobileNumberExist` | `51021` | `mobileNumberExist` | 409 (`CONFLICT`) | `user.error.mobileNumberExist` | This mobile number already exists. |
| `verificationEmailResendLimitExceeded` | `51022` | `verificationEmailResendLimitExceeded` | 400 (`BAD_REQUEST`) | `user.error.verificationEmailResendLimitExceeded` | You have exceeded the limit for resending verification emails. Try again after {minutes} minutes. |
| `forgotPasswordRequestLimitExceeded` | `51023` | `forgotPasswordRequestLimitExceeded` | 400 (`BAD_REQUEST`) | `user.error.forgotPasswordRequestLimitExceeded` | You have exceeded the limit for password reset requests. Try again after {minutes} minutes. |
| `twoFactorMethodRequired` | `51024` | `twoFactorMethodRequired` | — | `user.error.twoFactorMethodRequired` | — |
| `notFoundForbidden` | `51025` | `notFoundForbidden` | 403 (`FORBIDDEN`) | `user.error.notFound` | Sorry, we couldn't find the user you requested. |
| `importEmailExist` | `51026` | `importEmailExist` | 409 (`CONFLICT`) | `user.error.importEmailExist` | There are existing users with the provided email addresses. Email: {emails} |

## `policy`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
| `forbidden` | `51100` | `forbidden` | 403 (`FORBIDDEN`) | `policy.error.forbidden` | Sorry, you don't have the necessary permissions to perform this action. |
| `predefinedNotFound` | `51101` | `predefinedNotFound` | 500 (`INTERNAL_SERVER_ERROR`) | `policy.error.predefinedNotFound` | Predefined abilities not setted. |

## `notification`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
| `notFound` | `51200` | `notFound` | 404 (`NOT_FOUND`) | `notification.error.notFound` | Notification not found. |
| `alreadyRead` | `51201` | `alreadyRead` | 400 (`BAD_REQUEST`) | `notification.error.alreadyRead` | Notification is already marked as read. |
| `invalidType` | `51202` | `invalidType` | 400 (`BAD_REQUEST`) | `notification.error.invalidType` | Invalid notification type. |
| `invalidChannel` | `51203` | `invalidChannel` | 400 (`BAD_REQUEST`) | `notification.error.invalidChannel` | Invalid notification channel. |

## `device`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
| `notFound` | `51300` | `notFound` | 404 (`NOT_FOUND`) | `device.error.notFound` | Device information not found |

## `aws`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
| `serviceUnavailable` | `51400` | `serviceUnavailable` | 503 (`SERVICE_UNAVAILABLE`) | `aws.error.serviceUnavailable` | The AWS service is currently unavailable. Please try again later. |

## `term-policy`

| member | statusCode | statusCodeKey | httpStatus | messagePath | description |
|---|---|---|---|---|---|
| `notFound` | `51500` | `notFound` | 404 (`NOT_FOUND`) | `termPolicy.error.notFound` | Term policy not found. |
| `exist` | `51501` | `exist` | 409 (`CONFLICT`) | `termPolicy.error.exist` | A term policy with this name already exists. |
| `languageDuplicate` | `51502` | `languageDuplicate` | 400 (`BAD_REQUEST`) | `termPolicy.error.contentsLanguageMustBeUnique` | Each language can only be used once in term policy contents. |
| `alreadyAccepted` | `51503` | `alreadyAccepted` | 409 (`CONFLICT`) | `termPolicy.error.alreadyAccepted` | You have already accepted this term policy. |
| `requiredInvalid` | `51504` | `requiredInvalid` | 403 (`FORBIDDEN`) | `termPolicy.error.requiredInvalid` | Required field value is invalid. |
| `statusInvalid` | `51505` | `statusInvalid` | 400 (`BAD_REQUEST`) | `termPolicy.error.statusInvalid` | Term policy status is invalid. |
| `contentNotFound` | `51506` | `contentNotFound` | 404 (`NOT_FOUND`) | `termPolicy.error.contentNotFound` | Term policy content not found. |
| `contentExist` | `51507` | `contentExist` | 409 (`CONFLICT`) | `termPolicy.error.contentExist` | This content already exists in the term policy. |
| `contentEmpty` | `51508` | `contentEmpty` | 400 (`BAD_REQUEST`) | `termPolicy.error.contentEmpty` | Term policy content cannot be empty. |

## Related documents

- [Handling Error](handling-error.md)
- [Message](message.md)
- [Response](response.md)
- [Request Validation](request-validation.md)
