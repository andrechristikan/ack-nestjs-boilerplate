import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';
import {
    ApiKeyDocSecurityName,
    ApiKeyProtectedDocErrors,
    ApiKeySystemProtectedDocErrors,
    ApiKeyXTypeMetaKey,
} from '@modules/api-key/constants/api-key.constant';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { ApiKeyXApiKeyGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { ApiKeyXApiKeyTypeGuard } from '@modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { EnumApiKeyType } from '@generated/prisma-client/client';

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
