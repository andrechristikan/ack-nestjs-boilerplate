import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import {
    ApiKeyStoreKey,
    ApiKeyXTypeMetaKey,
} from '@modules/api-key/constants/api-key.constant';
import { ApiKeyXApiKeyGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { ApiKeyXApiKeyTypeGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';

/**
 * Reads the authenticated `ApiKey`, or one of its fields, that `@ApiKeyProtected()` or `@ApiKeySystemProtected()` stored; throws when either is absent.
 * @public
 */
export const ApiKeyPayload = createParamDecorator<
    Extract<keyof ApiKey, string> | undefined,
    ApiKey | NonNullable<ApiKey[Extract<keyof ApiKey, string>]>
>(
    (
        field: Extract<keyof ApiKey, string> | undefined
    ): ApiKey | NonNullable<ApiKey[Extract<keyof ApiKey, string>]> => {
        const apiKey = ClsServiceManager.getClsService().get<
            ApiKey | undefined
        >(ApiKeyStoreKey);
        if (apiKey === undefined || apiKey === null) {
            throw new RequestContextMissingException(ApiKeyStoreKey);
        }

        if (field === undefined || field === null) {
            return apiKey;
        }

        const value = apiKey[field];
        if (value === undefined || value === null) {
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
        SetMetadata(ApiKeyXTypeMetaKey, [EnumApiKeyType.system])
    );
}

/**
 * Requires a valid X-API-Key and restricts the route to default-type API keys.
 * @public
 */
export function ApiKeyProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard),
        SetMetadata(ApiKeyXTypeMetaKey, [EnumApiKeyType.default])
    );
}
