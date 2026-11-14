import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { ApiSecurity } from '@nestjs/swagger';
import {
    ApiKeyContextStoreKey,
    ApiKeyDocSecurityName,
    ApiKeyProtectedDocErrors,
    ApiKeySystemProtectedDocErrors,
    ApiKeyXTypeMetaKey,
} from '@modules/api-key/constants/api-key.constant';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { ApiKeyXApiKeyGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { ApiKeyXApiKeyTypeGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

/** @public */
export const ApiKeyContext = createParamDecorator((): IApiKeyContext => {
    const apiKeyContext =
        ClsServiceManager.getClsService().get<IApiKeyContext | null>(
            ApiKeyContextStoreKey
        ) ?? null;
    if (apiKeyContext === null) {
        throw new RequestContextMissingException(ApiKeyContextStoreKey);
    }

    return apiKeyContext;
});

/** @public */
export function ApiKeySystemProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard),
        SetMetadata(ApiKeyXTypeMetaKey, [EnumApiKeyType.system]),
        ApiSecurity(ApiKeyDocSecurityName),
        DocErrors(...ApiKeySystemProtectedDocErrors)
    );
}

/** @public */
export function ApiKeyProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard),
        SetMetadata(ApiKeyXTypeMetaKey, [EnumApiKeyType.default]),
        ApiSecurity(ApiKeyDocSecurityName),
        DocErrors(...ApiKeyProtectedDocErrors)
    );
}
