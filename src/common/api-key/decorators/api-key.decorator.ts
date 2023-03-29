import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UseGuards,
} from '@nestjs/common';
import { ApiKeyXApiKeyGuard } from 'src/common/api-key/guards/x-api-key/api-key.x-api-key.guard';
import { IApiKeyPayload } from 'src/common/api-key/interfaces/api-key.interface';
import { ApiKeyDoc } from 'src/common/api-key/repository/entities/api-key.entity';

export const ApiKeyPayload: () => ParameterDecorator = createParamDecorator(
    (data: string, ctx: ExecutionContext): IApiKeyPayload => {
        const { apiKey } = ctx.switchToHttp().getRequest();
        return data ? apiKey[data] : apiKey;
    }
);

export function ApiKeyProtected(): MethodDecorator {
    return applyDecorators(UseGuards(ApiKeyXApiKeyGuard));
}

export const GetApiKey = createParamDecorator(
    (data: string, ctx: ExecutionContext): ApiKeyDoc => {
        const { __apiKey } = ctx.switchToHttp().getRequest();
        return __apiKey;
    }
);
