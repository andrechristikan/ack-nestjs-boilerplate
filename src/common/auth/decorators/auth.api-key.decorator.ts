import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from 'src/common/auth/guards/api-key/auth.api-key.guard';
import { IAuthApiPayload } from 'src/common/auth/interfaces/auth.interface';
import { ResponseDoc } from 'src/common/response/decorators/response.decorator';
import 'dotenv/config';

export const ApiKey = createParamDecorator(
    (data: string, ctx: ExecutionContext): IAuthApiPayload => {
        const { apiKey } = ctx.switchToHttp().getRequest();
        return data ? apiKey[data] : apiKey;
    }
);

export function AuthApiKey(): any {
    const docs = [];

    if (process.env.APP_MODE === 'secure') {
        docs.push(
            ApiSecurity('apiKey'),
            ResponseDoc({
                httpStatus: HttpStatus.UNAUTHORIZED,
            })
        );
    }

    return applyDecorators(UseGuards(ApiKeyGuard), ...docs);
}
