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
        err: Error,
        apiKey: IApiKeyPayload,
        info: BadRequestError
    ): IApiKeyPayload {
        if (!apiKey || info?.message === 'Missing Api Key') {
            throw new UnauthorizedException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_REQUIRED,
                message: 'apiKey.error.xApiKey.required',
            });
        } else if (err) {
            const statusCode: number = Number.parseInt(err.message as string);

            if (
                statusCode ===
                ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_NOT_FOUND
            ) {
                throw new ForbiddenException({
                    statusCode,
                    message: 'apiKey.error.xApiKey.notFound',
                });
            } else if (
                statusCode === ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INACTIVE
            ) {
                throw new ForbiddenException({
                    statusCode,
                    message: 'apiKey.error.xApiKey.inactive',
                });
            } else if (
                statusCode === ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_EXPIRED
            ) {
                throw new ForbiddenException({
                    statusCode,
                    message: 'apiKey.error.xApiKey.expired',
                });
            }

            throw new UnauthorizedException({
                statusCode: ENUM_API_KEY_STATUS_CODE_ERROR.X_API_KEY_INVALID,
                message: 'apiKey.error.xApiKey.invalid',
            });
        }

        return apiKey;
    }
}
