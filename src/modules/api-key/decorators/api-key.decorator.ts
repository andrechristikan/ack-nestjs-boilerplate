import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';
import { ClsServiceManager } from 'nestjs-cls';
import { ApiKeyGuardMissingException } from '@modules/api-key/exceptions/api-key.guard-missing.exception';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import {
    ApiKeyDocSecurityName,
    ApiKeyProtectedDocErrors,
    ApiKeyStoreKey,
    ApiKeySystemProtectedDocErrors,
    ApiKeyXTypeMetaKey,
} from '@modules/api-key/constants/api-key.constant';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { ApiKeyXApiKeyGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { ApiKeyXApiKeyTypeGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import type {
    IApiKeyField,
    IApiKeyFieldValue,
} from '@modules/api-key/interfaces/api-key.interface';

/** @public */
export const ApiKeyPayload = createParamDecorator<
    IApiKeyField | undefined,
    ApiKey | IApiKeyFieldValue
>((field: IApiKeyField | undefined): ApiKey | IApiKeyFieldValue => {
    const current =
        ClsServiceManager.getClsService().get<ApiKey | null>(ApiKeyStoreKey) ??
        null;
    if (current === null) {
        throw new ApiKeyGuardMissingException();
    }

    const fieldKey = field ?? null;
    if (fieldKey === null) {
        return current;
    }

    const value = current[fieldKey] ?? null;
    if (value === null) {
        throw new RequestContextMissingException(`${ApiKeyStoreKey}.${field}`);
    }

    return value;
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
