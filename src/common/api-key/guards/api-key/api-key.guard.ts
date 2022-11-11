import { AuthGuard } from '@nestjs/passport';
import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';

@Injectable()
export class ApiKeyGuard extends AuthGuard('api-key') {
    constructor(private readonly helperNumberService: HelperNumberService) {
        super();
    }

    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }

    handleRequest<TUser = any>(
        err: Record<string, any>,
        user: TUser,
        info: Error | string
    ): TUser {
        if (err || !user) {
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
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_PREFIX_INVALID_ERROR,
                    message: 'apiKey.error.prefixInvalid',
                });
            }

            const statusCode: number = this.helperNumberService.create(
                info as string
            );

            console.log('err', err);
            console.log('user', user);
            console.log('info', info);
            console.log('111');

            if (
                statusCode ===
                ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_PASSPHRASE_NOT_FOUND_ERROR
            ) {
                console.log('000');
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_PASSPHRASE_NOT_FOUND_ERROR,
                    message: 'apiKey.error.passphraseNotFound',
                });
            } else if (
                statusCode ===
                ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_PASSPHRASE_INVALID_ERROR
            ) {
                console.log('222');
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_PASSPHRASE_INVALID_ERROR,
                    message: 'apiKey.error.passphraseInvalid',
                });
            } else if (
                statusCode ===
                ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_SCHEMA_INVALID_ERROR
            ) {
                console.log('333');
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_SCHEMA_INVALID_ERROR,
                    message: 'apiKey.error.schemaInvalid',
                });
            } else if (
                statusCode ===
                ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_TIMESTAMP_NOT_MATCH_WITH_REQUEST_ERROR
            ) {
                console.log('444');
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_TIMESTAMP_NOT_MATCH_WITH_REQUEST_ERROR,
                    message: 'apiKey.error.timestampNotMatchWithRequest',
                });
            } else if (
                statusCode ===
                ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR
            ) {
                console.log('555');
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_TIMESTAMP_INVALID_ERROR,
                    message: 'apiKey.error.timestampInvalid',
                });
            } else if (
                statusCode ===
                ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR
            ) {
                console.log('666');
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR,
                    message: 'apiKey.error.notFound',
                });
            } else if (
                statusCode ===
                ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_INACTIVE_ERROR
            ) {
                console.log('777');
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_INACTIVE_ERROR,
                    message: 'apiKey.error.inactive',
                });
            }

            console.log('888');
            throw new UnauthorizedException({
                statusCode:
                    ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_INVALID_ERROR,
                message: 'apiKey.error.invalid',
            });
        }

        return user;
    }
}
