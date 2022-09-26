import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from 'src/common/auth/guards/api-key/auth.api-key.guard';
import { IAuthApiPayload } from 'src/common/auth/interfaces/auth.interface';
import { ResponseDocOneOf } from 'src/common/response/decorators/response.decorator';
import 'dotenv/config';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/common/auth/constants/auth.status-code.constant';

export const ApiKey = createParamDecorator(
    (data: string, ctx: ExecutionContext): IAuthApiPayload => {
        const { apiKey } = ctx.switchToHttp().getRequest();
        return data ? apiKey[data] : apiKey;
    }
);

export function AuthApiKey(): any {
    const docs = [
        ApiSecurity('apiKey'),
        ApiHeader({
            name: 'x-timestamp',
            description: 'Timestamp header, in microseconds',
            required: true,
            schema: {
                example: 1662876305642,
                type: 'number',
            },
        }),
        ResponseDocOneOf(
            HttpStatus.UNAUTHORIZED,
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_NEEDED_ERROR,
                messagePath: 'auth.apiKey.error.keyNeeded',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_PREFIX_INVALID_ERROR,
                messagePath: 'auth.apiKey.error.prefixInvalid',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_SCHEMA_INVALID_ERROR,
                messagePath: 'auth.apiKey.error.schemaInvalid',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_NOT_FOUND_ERROR,
                messagePath: 'auth.apiKey.error.notFound',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_INACTIVE_ERROR,
                messagePath: 'auth.apiKey.error.inactive',
            },
            {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_API_KEY_INVALID_ERROR,
                messagePath: 'auth.apiKey.error.invalid',
            }
        ),
    ];

    return applyDecorators(UseGuards(ApiKeyGuard), ...docs);
}
