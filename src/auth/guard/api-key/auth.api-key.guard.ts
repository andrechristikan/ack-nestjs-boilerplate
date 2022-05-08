import { AuthGuard } from '@nestjs/passport';
import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/auth/auth.constant';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ApiKeyGuard extends AuthGuard('api-key') {
    constructor(
        private readonly debuggerService: DebuggerService,
        private readonly configService: ConfigService,
        private readonly reflector: Reflector
    ) {
        super();
    }

    canActivate(context: ExecutionContext) {
        const mode = this.configService.get<string>('app.mode');
        const excludeApiKey = this.reflector.get<boolean>(
            'excludeApiKey',
            context.getHandler()
        );

        const request = context.switchToHttp().getRequest();
        request.apiKey = {};

        if (excludeApiKey || mode !== 'secure') {
            return true;
        }

        return super.canActivate(context);
    }

    handleRequest<TUser = any>(
        err: Record<string, any>,
        user: TUser,
        info: Error | string
    ): TUser {
        if (err || !user) {
            this.debuggerService.error(
                info instanceof Error ? info.message : `${info}`,
                'ApiKeyGuard',
                'handleRequest',
                err
            );

            if (
                info instanceof Error &&
                info.name === 'BadRequestError' &&
                info.message === 'Missing API Key'
            ) {
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_NEEDED_ERROR,
                    message: 'auth.apiKey.error.keyNeeded',
                });
            } else if (
                info instanceof Error &&
                info.name === 'BadRequestError' &&
                info.message.startsWith('Invalid API Key prefix')
            ) {
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_PREFIX_INVALID_ERROR,
                    message: 'auth.apiKey.error.prefixInvalid',
                });
            }

            const statusCode: number = parseInt(info as string);

            if (
                statusCode ===
                ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_SCHEMA_INVALID_ERROR
            ) {
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_SCHEMA_INVALID_ERROR,
                    message: 'auth.apiKey.error.schemaInvalid',
                });
            } else if (
                statusCode ===
                ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_TIMESTAMP_NOT_MATCH_WITH_REQUEST_ERROR
            ) {
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_TIMESTAMP_NOT_MATCH_WITH_REQUEST_ERROR,
                    message: 'auth.apiKey.error.timestampNotMatchWithRequest',
                });
            } else if (
                statusCode ===
                ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_NOT_FOUND_ERROR
            ) {
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_NOT_FOUND_ERROR,
                    message: 'auth.apiKey.error.notFound',
                });
            } else if (
                statusCode ===
                ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_INACTIVE_ERROR
            ) {
                throw new UnauthorizedException({
                    statusCode:
                        ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_INACTIVE_ERROR,
                    message: 'auth.apiKey.error.inactive',
                });
            }

            throw new UnauthorizedException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_API_KEY_INVALID_ERROR,
                message: 'auth.apiKey.error.invalid',
            });
        }

        return user;
    }
}
