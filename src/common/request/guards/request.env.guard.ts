import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { REQUEST_ENV_META_KEY } from '@common/request/constants/request.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from '@common/request/enums/request.status-code.enum';

/**
 * Environment-based access control guard for route protection.
 * Enforces environment restrictions by comparing current environment against allowed environments.
 */
@Injectable()
export class RequestEnvGuard implements CanActivate {
    private readonly env: ENUM_APP_ENVIRONMENT;

    constructor(
        private readonly reflector: Reflector,
        private readonly configService: ConfigService
    ) {
        this.env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');
    }

    /**
     * Validates if current environment is allowed to access the route.
     * @param {ExecutionContext} context - Execution context containing route metadata
     * @returns {Promise<boolean>} Promise resolving to true if access is allowed
     * @throws {ForbiddenException} When environment access is not permitted
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required: ENUM_APP_ENVIRONMENT[] =
            this.reflector.getAllAndOverride<ENUM_APP_ENVIRONMENT[]>(
                REQUEST_ENV_META_KEY,
                [context.getHandler(), context.getClass()]
            );

        if (!required || !required.includes(this.env)) {
            throw new ForbiddenException({
                statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.ENV_FORBIDDEN,
                message: 'http.clientError.forbidden',
            });
        }

        return true;
    }
}
