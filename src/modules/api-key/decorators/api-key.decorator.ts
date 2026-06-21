import {
    ExecutionContext,
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ApiKeyStoreKey, ApiKeyXTypeMetaKey } from '@modules/api-key/constants/api-key.constant';
import { ApiKeyXApiKeyGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { ApiKeyXApiKeyTypeGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { ApiKey, EnumApiKeyType } from '@generated/prisma-client';
import { ClsServiceManager } from 'nestjs-cls';

/**
 * Extracts the authenticated API key (or one of its properties) from the request store.
 * Requires `@ApiKeyProtected()` or `@ApiKeySystemProtected()` on the route.
 */
export const ApiKeyPayload: () => ParameterDecorator = createParamDecorator(
    <T = ApiKey>(data: string, _ctx: ExecutionContext): T => {
        const apiKey = ClsServiceManager.getClsService().get<ApiKey>(ApiKeyStoreKey);
        return data ? (apiKey?.[data as keyof ApiKey] as T) : (apiKey as T);
    }
);

/**
 * Requires a valid X-API-Key and restricts the route to system-type API keys.
 */
export function ApiKeySystemProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard),
        SetMetadata(ApiKeyXTypeMetaKey, [EnumApiKeyType.system])
    );
}

/**
 * Requires a valid X-API-Key and restricts the route to default-type API keys.
 */
export function ApiKeyProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard),
        SetMetadata(ApiKeyXTypeMetaKey, [EnumApiKeyType.default])
    );
}
