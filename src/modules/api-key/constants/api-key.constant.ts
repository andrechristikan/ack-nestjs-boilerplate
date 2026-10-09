import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
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
 * X-API-Key guard error kit for `@ApiKeyProtected` / `@ApiKeySystemProtected`.
 * Same shape as `DocFileErrorResponses` / `DocPaginationErrorResponses` — each value is a
 * `DocResponseError` MethodDecorator, not an `applyDecorators` blob.
 * @public
 */
export const DocApiKeyErrorResponses = {
    unauthorized: DocResponseError(
        HttpStatus.UNAUTHORIZED,
        {
            statusCode: EnumApiKeyStatusCodeError.xApiKeyRequired,
            messagePath: 'apiKey.error.xApiKey.required',
        },
        {
            statusCode: EnumApiKeyStatusCodeError.xApiKeyInvalid,
            messagePath: 'apiKey.error.xApiKey.invalid',
        }
    ),
    forbidden: DocResponseError(HttpStatus.FORBIDDEN, {
        statusCode: EnumApiKeyStatusCodeError.xApiKeyForbidden,
        messagePath: 'apiKey.error.xApiKey.forbidden',
    }),
    guardMissing: DocResponseError(HttpStatus.UNAUTHORIZED, {
        statusCode: EnumApiKeyStatusCodeError.guardMissing,
        messagePath: 'apiKey.error.guardMissing',
    }),
} as const;

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
