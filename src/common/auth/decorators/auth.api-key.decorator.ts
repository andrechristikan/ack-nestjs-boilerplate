import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from 'src/common/auth/guards/api-key/auth.api-key.guard';
import { IAuthApiPayload } from 'src/common/auth/interfaces/auth.interface';
import 'dotenv/config';

export const ApiKey = createParamDecorator(
    (data: string, ctx: ExecutionContext): IAuthApiPayload => {
        const { apiKey } = ctx.switchToHttp().getRequest();
        return data ? apiKey[data] : apiKey;
    }
);

export function AuthApiKey(): any {
    return applyDecorators(UseGuards(ApiKeyGuard));
}
