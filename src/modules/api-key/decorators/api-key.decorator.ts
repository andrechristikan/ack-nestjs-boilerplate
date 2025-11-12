import {
    ExecutionContext,
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { API_KEY_X_TYPE_META_KEY } from '@modules/api-key/constants/api-key.constant';
import { ApiKeyXApiKeyGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { ApiKeyXApiKeyTypeGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { ApiKey, ENUM_API_KEY_TYPE } from '@prisma/client';

/**
 * Parameter decorator that extracts API key data from the request context
 * @param {string} data - Optional property name to extract from the API key object
 * @param {ExecutionContext} ctx - NestJS execution context
 * @returns {T} The API key object or specific property if data is provided
 */
export const ApiKeyPayload: () => ParameterDecorator = createParamDecorator(
    <T = ApiKey>(data: string, ctx: ExecutionContext): T => {
        const { __apiKey } = ctx.switchToHttp().getRequest<IRequestApp>();
        return data ? __apiKey[data] : (__apiKey as T);
    }
);

/**
 * Method decorator that applies system-level API key protection guards
 * @returns {MethodDecorator} Combined decorators for system API key validation
 */
export function ApiKeySystemProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard),
        SetMetadata(API_KEY_X_TYPE_META_KEY, [ENUM_API_KEY_TYPE.system])
    );
}

/**
 * Method decorator that applies default API key protection guards
 * @returns {MethodDecorator} Combined decorators for default API key validation
 */
export function ApiKeyProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard),
        SetMetadata(API_KEY_X_TYPE_META_KEY, [ENUM_API_KEY_TYPE.default])
    );
}
