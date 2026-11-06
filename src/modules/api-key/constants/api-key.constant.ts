import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumApiKeyStatusCodeError } from '@modules/api-key/enums/api-key.status-code.enum';

/** @public */
export const ApiKeyXTypeMetaKey = 'ApiKeyXTypeMetaKey';

/** @public */
export const ApiKeyStoreKey = 'ApiKeyStoreKey';

/** @public */
export const ApiKeyDocSecurityName = 'xApiKey';

/** @public */
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

/** @public */
export const ApiKeyHeaderName = 'x-api-key';

/** @public */
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

/** @public */
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
