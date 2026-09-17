import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { RequestStore } from '@common/request/decorators/request.decorator';
import {
    ApiKeyStoreKey,
    ApiKeyXTypeMetaKey,
} from '@modules/api-key/constants/api-key.constant';
import { ApiKeyXApiKeyGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { ApiKeyXApiKeyTypeGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';

/**
 * Reads the authenticated `ApiKey`, or one of its fields, that `@ApiKeyProtected()` or `@ApiKeySystemProtected()` stored.
 * @public
 */
export function ApiKeyPayload<K extends Extract<keyof ApiKey, string>>(
    field?: K
): ParameterDecorator {
    return RequestStore(ApiKeyStoreKey, field);
}

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
