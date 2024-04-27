import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
} from '@nestjs/common';
import { API_KEY_X_TYPE_META_KEY } from 'src/common/api-key/constants/api-key.constant';
import { ENUM_API_KEY_TYPE } from 'src/common/api-key/constants/api-key.enum.constant';
import { ApiKeyXApiKeyGuard } from 'src/common/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { ApiKeyXApiKeyTypeGuard } from 'src/common/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { IApiKeyPayload } from 'src/common/api-key/interfaces/api-key.interface';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

export const ApiKeyPayload: () => ParameterDecorator = createParamDecorator(
    (data: string, ctx: ExecutionContext): IApiKeyPayload => {
        const { apiKey } = ctx
            .switchToHttp()
            .getRequest<IRequestApp & { apiKey: IApiKeyPayload }>();
        return data ? apiKey[data] : apiKey;
    }
);

export function ApiKeyServiceProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard),
        SetMetadata(API_KEY_X_TYPE_META_KEY, [ENUM_API_KEY_TYPE.SERVICE])
    );
}

export function ApiKeyPublicProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyXApiKeyTypeGuard),
        SetMetadata(API_KEY_X_TYPE_META_KEY, [ENUM_API_KEY_TYPE.PUBLIC])
    );
}
