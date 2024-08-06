import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
} from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { API_KEY_X_TYPE_META_KEY } from 'src/modules/api-key/constants/api-key.constant';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';
import { ApiKeyXApiKeyGuard } from 'src/modules/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { ApiKeyXApiKeyTypeGuard } from 'src/modules/api-key/guards/x-api-key/api-key.x-api-key.type.guard';
import { IApiKeyPayload } from 'src/modules/api-key/interfaces/api-key.interface';

export const ApiKeyPayload: () => ParameterDecorator = createParamDecorator(
    <T = IApiKeyPayload>(data: string, ctx: ExecutionContext): T => {
        const { apiKey } = ctx
            .switchToHttp()
            .getRequest<IRequestApp & { apiKey: IApiKeyPayload }>();
        return data ? apiKey[data] : apiKey;
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
