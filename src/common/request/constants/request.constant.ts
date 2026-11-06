import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/** @public */
export const RequestIdRegex = /^[A-Za-z0-9._-]{1,128}$/;

/** @public */
export const RequestPasswordStrengthRegex =
    /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])/;

/** @public */
export const RequestCustomTimeoutMetaKey = 'RequestCustomTimeoutMetaKey';

/** @public */
export const RequestCustomTimeoutValueMetaKey =
    'RequestCustomTimeoutValueMetaKey';

/** @public */
export const RequestEnvMetaKey = 'RequestEnvMetaKey';

/** @public */
export const RequestEnvProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.NOT_FOUND,
        statusCode: EnumRequestStatusCodeError.envNotAllowed,
        messagePath: 'http.clientError.notFound',
    },
];

/** @public */
export const RequestThrottleOptionsMetaKey = 'RequestThrottleOptionsMetaKey';

/** @public */
export const RequestLogStoreKey = 'RequestLogStoreKey';
/** @public */
export const RequestLanguageStoreKey = 'RequestLanguageStoreKey';
/** @public */
export const RequestVersionStoreKey = 'RequestVersionStoreKey';
/** @public */
export const RequestCorrelationIdStoreKey = 'RequestCorrelationIdStoreKey';
/** @public */
export const RequestIdStoreKey = 'RequestIdStoreKey';
/** @public */
export const RequestActorStoreKey = 'RequestActorStoreKey';
/** @public */
export const RequestCustomLangHeaderName = 'x-custom-lang';

/** @public */
export const RequestCorrelationIdHeaderName = 'x-correlation-id';

/** @public */
export const RequestIdHeaderName = 'x-request-id';

/** @public */
export const RequestThrottleHeaderName = 'X-RateLimit';

/** @public */
export const RequestWorkspaceIdHeaderName = 'x-workspace-id';

/** @public */
export const RequestWorkspaceIdStoreKey = 'RequestWorkspaceIdStoreKey';
