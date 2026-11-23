import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/** @public */
export const RequestIdRegex = /^[A-Za-z0-9._-]+$/;

/** @public */
export const RequestIdMaxLength = 128;

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
export const RequestLanguageStoreKey = 'RequestLanguageStoreKey';
/** @public */
export const RequestVersionStoreKey = 'RequestVersionStoreKey';
/** @public */
export const RequestCorrelationIdStoreKey = 'RequestCorrelationIdStoreKey';
/** @public */
export const RequestIdStoreKey = 'RequestIdStoreKey';
/** @public */
export const RequestLogStoreKey = 'RequestLogStoreKey';
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
export const RequestHelmetCacheControlHeaderName = 'Cache-Control';

/** @public */
export const RequestHelmetCacheControlHeaderValue = 'no-store';

/** @public */
export const RequestHelmetCspDirectives: Record<string, string[]> = {
    defaultSrc: ["'none'"],
    baseUri: ["'none'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
};

/** @public */
export const RequestHelmetCspDocDirectives: Record<string, string[]> = {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:'],
    baseUri: ["'none'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
};

/** @public */
export const RequestUploadTimeout = '1m';

/** @public */
export const RequestTrustedProxyPresets: ReadonlySet<string> = new Set([
    'loopback',
    'linklocal',
    'uniquelocal',
]);

/** @public */
export const RequestCorsOriginSchemeRegex = /^(https?):\/\//i;

/** @public */
export const RequestCustomLanguageListSeparatorRegex = /[,;]/;

/** @public */
export const RequestCustomLanguageSubtagSeparatorRegex = /[-_]/;

/** @public */
export const RequestEmailFormatRegex = /\S+@\S+\.\S+/;

/** @public */
export const RequestEmailDomainLabelRegex = /^[a-zA-Z0-9-]+$/;

/** @public */
export const RequestEmailTldRegex = /^[a-zA-Z]{2,}$/;

/** @public */
export const RequestEmailLocalPartRegex = /^[a-zA-Z0-9-_.]+$/;

/** @public */
export const RequestEncryptionSecretRegex = /^[A-Za-z0-9_-]+$/;

/** @public */
export const RequestMongoIdRegex = /^[0-9a-fA-F]+$/;

/** @public */
export const RequestSesIdentityArnRegex =
    /^arn:aws[a-z-]*:ses:[a-z0-9-]+:\d{12}:identity\/.+$/;
