import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';

/**
 * Route metadata key holding the API key types a handler accepts.
 * @public
 */
export const ApiKeyXTypeMetaKey = 'ApiKeyXTypeMetaKey';

/**
 * Request-store key holding the validated API key.
 * @public
 */
export const ApiKeyStoreKey = 'ApiKeyStoreKey';

/**
 * OpenAPI apiKey scheme name for X-API-Key Protected routes.
 * @public
 */
export const ApiKeyDocSecurityName = 'xApiKey';

/**
 * Columns an api key read returns toward HTTP; the credential hash is never among them.
 * @public
 */
export const ApiKeySelect = {
    id: true,
    type: true,
    name: true,
    key: true,
    isActive: true,
    startAt: true,
    endAt: true,
    createdAt: true,
    createdBy: true,
    updatedAt: true,
    updatedBy: true,
} satisfies Prisma.ApiKeySelect;

/**
 * Request header carrying the API key credential.
 * @public
 */
export const ApiKeyHeaderName = 'x-api-key';

/**
 * Error entries `@ApiKeySystemProtected` documents: the missing, invalid, expired, and forbidden key and the missing key store.
 * @public
 */
export const ApiKeySystemProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
        messagePath: 'apiKey.error.xApiKey.required',
    },
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
        messagePath: 'apiKey.error.xApiKey.invalid',
    },
    {
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumApiKeyStatusCodeError.expired,
        messagePath: 'apiKey.error.expired',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumApiKeyStatusCodeError.xApiKeyForbidden,
        messagePath: 'apiKey.error.xApiKey.forbidden',
    },
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumApiKeyStatusCodeError.guardMissing,
        messagePath: 'apiKey.error.guardMissing',
    },
];

/**
 * Error entries `@ApiKeyProtected` documents: the missing, invalid, expired, and forbidden key and the missing key store.
 * @public
 */
export const ApiKeyProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
        messagePath: 'apiKey.error.xApiKey.required',
    },
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
        messagePath: 'apiKey.error.xApiKey.invalid',
    },
    {
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumApiKeyStatusCodeError.expired,
        messagePath: 'apiKey.error.expired',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumApiKeyStatusCodeError.xApiKeyForbidden,
        messagePath: 'apiKey.error.xApiKey.forbidden',
    },
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumApiKeyStatusCodeError.guardMissing,
        messagePath: 'apiKey.error.guardMissing',
    },
];
