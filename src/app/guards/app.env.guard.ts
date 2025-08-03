import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { APP_ENV_META_KEY } from '@app/constants/app.constant';
import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';

/**
 * Guard to protect routes based on the application environment.
 * It checks if the current environment matches the required environments set in metadata.
 * If not, it throws a ForbiddenException.
 */
@Injectable()
export class AppEnvGuard implements CanActivate {
    private readonly env: ENUM_APP_ENVIRONMENT;

    constructor(
        private readonly reflector: Reflector,
        private readonly configService: ConfigService
    ) {
        this.env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required: ENUM_APP_ENVIRONMENT[] =
            this.reflector.getAllAndOverride<ENUM_APP_ENVIRONMENT[]>(
                APP_ENV_META_KEY,
                [context.getHandler(), context.getClass()]
            );

        if (!required || !required.includes(this.env)) {
            throw new ForbiddenException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.ENV_FORBIDDEN,
                message: 'http.clientError.forbidden',
            });
        }

        return true;
    }
}
