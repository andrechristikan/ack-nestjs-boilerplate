import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from 'src/common/api-key/guards/api-key/api-key.guard';
import { IApiKeyPayload } from 'src/common/api-key/interfaces/api-key.interface';

export const ApiKeyPayload: () => ParameterDecorator = createParamDecorator(
    (data: string, ctx: ExecutionContext): IApiKeyPayload => {
        const { apiKey } = ctx.switchToHttp().getRequest();
        return data ? apiKey[data] : apiKey;
    }
);

export function ApiKeyProtected(): MethodDecorator {
    return applyDecorators(UseGuards(ApiKeyGuard));
}
