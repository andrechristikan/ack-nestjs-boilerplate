import { AuthGuard } from '@nestjs/passport';
import {
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';

@Injectable()
export class ApiKeyXApiKeyGuard extends AuthGuard('api-key') {
    constructor(private readonly helperNumberService: HelperNumberService) {
        super();
    }

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
                info instanceof Error &&
                info.name === 'BadRequestError' &&
                info.message === 'Missing API Key'
            ) {
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NEEDED_ERROR,
                    message: 'apiKey.error.keyNeeded',
                });
            } else if (
                info instanceof Error &&
                info.name === 'BadRequestError' &&
                info.message.startsWith('Invalid API Key prefix')
            ) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_PREFIX_INVALID_ERROR,
                    message: 'apiKey.error.prefixInvalid',
                });
            }

            const statusCode: number = this.helperNumberService.create(
                err.message as string
            );

            if (
                statusCode ===
                ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR
            ) {
                throw new ForbiddenException({
                    statusCode,
                    message: 'apiKey.error.notFound',
                });
            } else if (
                statusCode ===
                ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_IS_ACTIVE_ERROR
            ) {
                throw new ForbiddenException({
                    statusCode,
                    message: 'apiKey.error.inactive',
                });
            } else if (
                statusCode ===
                ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_EXPIRED_ERROR
            ) {
                throw new ForbiddenException({
                    statusCode,
                    message: 'apiKey.error.expired',
                });
            } else if (
                statusCode ===
                ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_WRONG_ERROR
            ) {
                throw new ForbiddenException({
                    statusCode,
                    message: 'apiKey.error.wrong',
                });
            }

            throw new UnauthorizedException({
                statusCode,
                message: 'apiKey.error.invalid',
            });
        }

        return apiKey;
    }
}
