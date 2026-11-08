import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import { EnumApiKeyType, Prisma } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
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
export const ApiKeyCacheSchema = z.object({
    id: z.string(),
    type: z.enum(EnumApiKeyType),
    name: z.string(),
    key: z.string(),
    hash: z.string(),
    isActive: z.boolean(),
    startAt: z.coerce.date().nullable(),
    endAt: z.coerce.date().nullable(),
    createdAt: z.coerce.date(),
    createdBy: z.string().nullable(),
    updatedAt: z.coerce.date(),
    updatedBy: z.string().nullable(),
}) satisfies z.ZodType<ApiKey>;

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
