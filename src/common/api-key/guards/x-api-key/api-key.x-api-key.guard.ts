import { AuthGuard } from '@nestjs/passport';
import {
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { BadRequestError } from 'passport-headerapikey';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';

@Injectable()
export class ApiKeyXApiKeyGuard extends AuthGuard('x-api-key') {
    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }

    handleRequest<IApiKeyPayload = any>(
        err: Record<string, any>,
        apiKey: IApiKeyPayload,
        info: Error | string
    ): IApiKeyPayload {
        if (err || !apiKey) {
            if (
                info instanceof BadRequestError &&
                info.message === 'Missing API Key'
            ) {
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_REQUIRED_ERROR,
                    message: 'apiKey.error.xApiKey.required',
                });
            } else if (err) {
                const statusCode: number = Number.parseInt(
                    err.message as string
                );

                if (
                    statusCode ===
                    ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_NOT_FOUND_ERROR
                ) {
                    throw new ForbiddenException({
                        statusCode,
                        message: 'apiKey.error.xApiKey.notFound',
                    });
                } else if (
                    statusCode ===
                    ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INACTIVE_ERROR
                ) {
                    throw new ForbiddenException({
                        statusCode,
                        message: 'apiKey.error.xApiKey.inactive',
                    });
                } else if (
                    statusCode ===
                    ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_EXPIRED_ERROR
                ) {
                    throw new ForbiddenException({
                        statusCode,
                        message: 'apiKey.error.xApiKey.expired',
                    });
                }
            }

            throw new UnauthorizedException({
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID_ERROR,
                message: 'apiKey.error.xApiKey.invalid',
            });
        }

        return apiKey;
    }
}
