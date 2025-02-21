import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { APP_ENV_META_KEY } from 'src/app/constants/app.constant';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';

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

        if (!required) {
            return true;
        } else if (!required.includes(this.env)) {
            throw new ForbiddenException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.ENV_FORBIDDEN,
                message: 'http.clientError.forbidden',
            });
        }

        return true;
    }
}
