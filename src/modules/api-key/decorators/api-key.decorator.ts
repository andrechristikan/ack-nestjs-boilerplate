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
import { ApiKeyEntity } from '@modules/api-key/repository/entities/api-key.entity';
import { ENUM_API_KEY_TYPE } from '@modules/api-key/enums/api-key.enum';

export const ApiKeyPayload: () => ParameterDecorator = createParamDecorator(
    <T = ApiKeyEntity>(data: string, ctx: ExecutionContext): T => {
        const { __apiKey } = ctx.switchToHttp().getRequest<IRequestApp>();
        return data ? __apiKey[data] : (__apiKey as T);
    }
);

export function ApiKeySystemProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard),
        SetMetadata(API_KEY_X_TYPE_META_KEY, [ENUM_API_KEY_TYPE.SYSTEM])
    );
}

export function ApiKeyProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard),
        SetMetadata(API_KEY_X_TYPE_META_KEY, [ENUM_API_KEY_TYPE.DEFAULT])
    );
}
