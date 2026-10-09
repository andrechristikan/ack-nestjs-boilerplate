import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';
import { ClsServiceManager } from 'nestjs-cls';
import { RequestGuardMissingException } from '@common/request/exceptions/request.guard-missing.exception';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import {
    ApiKeyDocSecurityName,
    ApiKeyStoreKey,
    ApiKeyXTypeMetaKey,
    DocApiKeyErrorResponses,
} from '@modules/api-key/constants/api-key.constant';
import { ApiKeyXApiKeyGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { ApiKeyXApiKeyTypeGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';

/**
 * Reads the authenticated `ApiKey`, or one of its fields, that `@ApiKeyProtected()` or `@ApiKeySystemProtected()` stored. Throws `RequestGuardMissingException` when the request carries no key and `RequestContextMissingException` when the requested field is null.
 * @public
 */
export const ApiKeyPayload = createParamDecorator<
    Extract<keyof ApiKey, string> | undefined,
    ApiKey | NonNullable<ApiKey[Extract<keyof ApiKey, string>]>
>(
    (
        field: Extract<keyof ApiKey, string> | undefined
    ): ApiKey | NonNullable<ApiKey[Extract<keyof ApiKey, string>]> => {
        const current =
            ClsServiceManager.getClsService().get<ApiKey | null>(
                ApiKeyStoreKey
            ) ?? null;
        if (current === null) {
            throw new RequestGuardMissingException(ApiKeyStoreKey);
        }

        const fieldKey = field ?? null;
        if (fieldKey === null) {
            return current;
        }

        const value = current[fieldKey] ?? null;
        if (value === null) {
            throw new RequestContextMissingException(
                `${ApiKeyStoreKey}.${field}`
            );
        }

        return value;
    }
);

/**
 * Requires a valid X-API-Key and restricts the route to system-type API keys.
 * @public
 */
export function ApiKeySystemProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard),
        SetMetadata(ApiKeyXTypeMetaKey, [EnumApiKeyType.system]),
        ApiSecurity(ApiKeyDocSecurityName),
        DocApiKeyErrorResponses.unauthorized,
        DocApiKeyErrorResponses.forbidden
    );
}

/**
 * Requires a valid X-API-Key and restricts the route to default-type API keys.
 * @public
 */
export function ApiKeyProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard),
        SetMetadata(ApiKeyXTypeMetaKey, [EnumApiKeyType.default]),
        ApiSecurity(ApiKeyDocSecurityName),
        DocApiKeyErrorResponses.unauthorized,
        DocApiKeyErrorResponses.forbidden
    );
}
