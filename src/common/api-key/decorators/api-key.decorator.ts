import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
} from '@nestjs/common';
import { API_KEY_TYPE_META_KEY } from 'src/common/api-key/constants/api-key.constant';
import { ENUM_API_KEY_TYPE } from 'src/common/api-key/constants/api-key.enum.constant';
import { ApiKeyPayloadTypeGuard } from 'src/common/api-key/guards/payload/api-key.payload.type.guard';
import { ApiKeyXApiKeyGuard } from 'src/common/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { IApiKeyPayload } from 'src/common/api-key/interfaces/api-key.interface';
import {
    ApiKeyDoc,
    ApiKeyEntity,
} from 'src/common/api-key/repository/entities/api-key.entity';
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
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyPayloadTypeGuard),
        SetMetadata(API_KEY_TYPE_META_KEY, [ENUM_API_KEY_TYPE.SERVICE])
    );
}

export function ApiKeyPublicProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ApiKeyXApiKeyGuard, ApiKeyPayloadTypeGuard),
        SetMetadata(API_KEY_TYPE_META_KEY, [ENUM_API_KEY_TYPE.PUBLIC])
    );
}

export const GetApiKey = createParamDecorator(
    (returnPlain: boolean, ctx: ExecutionContext): ApiKeyDoc | ApiKeyEntity => {
        const { __apiKey } = ctx
            .switchToHttp()
            .getRequest<IRequestApp & { __apiKey: ApiKeyDoc }>();
        return returnPlain ? __apiKey.toObject() : __apiKey;
    }
);
