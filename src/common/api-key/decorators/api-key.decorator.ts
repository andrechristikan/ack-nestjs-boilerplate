import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UseGuards,
} from '@nestjs/common';
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

export function ApiKeyProtected(): MethodDecorator {
    return applyDecorators(UseGuards(ApiKeyXApiKeyGuard));
}

export const GetApiKey = createParamDecorator(
    (returnPlain: boolean, ctx: ExecutionContext): ApiKeyDoc | ApiKeyEntity => {
        const { __apiKey } = ctx
            .switchToHttp()
            .getRequest<IRequestApp & { __apiKey: ApiKeyDoc }>();
        return returnPlain ? __apiKey.toObject() : __apiKey;
    }
);
