import {
    ExecutionContext,
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ApiKeyXTypeMetaKey } from '@modules/api-key/constants/api-key.constant';
import { ApiKeyXApiKeyGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { ApiKeyXApiKeyTypeGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { ApiKey, EnumApiKeyType } from '@generated/prisma-client';

/**
 * Parameter decorator that extracts the authenticated API key from the request context.
 * Must be used on a controller method parameter after `@ApiKeyProtected()` or `@ApiKeySystemProtected()` has been applied.
 *
 * @returns {ApiKey | T} The full API key object, or the value of a specific property if a property name is passed
 */
export const ApiKeyPayload: () => ParameterDecorator = createParamDecorator(
    <T = ApiKey>(data: string, ctx: ExecutionContext): T => {
        const { __apiKey } = ctx.switchToHttp().getRequest<IRequestApp>();
        return data ? (__apiKey?.[data as keyof ApiKey] as T) : (__apiKey as T);
    }
);

/**
 * Method decorator that applies API key authentication and restricts access to system-type API keys only.
 * Combines `ApiKeyXApiKeyGuard` and `ApiKeyXApiKeyTypeGuard` with type set to `EnumApiKeyType.system`.
 *
 * @returns {MethodDecorator} Combined decorators for system API key authentication and type validation
 */
export function ApiKeySystemProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard),
        SetMetadata(ApiKeyXTypeMetaKey, [EnumApiKeyType.system])
    );
}

/**
 * Method decorator that applies API key authentication and restricts access to default-type API keys only.
 * Combines `ApiKeyXApiKeyGuard` and `ApiKeyXApiKeyTypeGuard` with type set to `EnumApiKeyType.default`.
 *
 * @returns {MethodDecorator} Combined decorators for default API key authentication and type validation
 */
export function ApiKeyProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard),
        SetMetadata(ApiKeyXTypeMetaKey, [EnumApiKeyType.default])
    );
}
