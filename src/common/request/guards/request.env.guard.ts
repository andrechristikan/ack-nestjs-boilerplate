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
 *
 * This guard enforces environment restrictions on route handlers by comparing
 * the current application environment against the allowed environments specified
 * in the route metadata. It prevents access to endpoints that should not be
 * available in certain environments (e.g., debug endpoints in production).
 *
 * The guard retrieves the required environments from metadata set by the
 * RequestEnvProtected decorator and validates them against the current
 * application environment configured in the system.
 *
 * @throws {ForbiddenException} When the current environment is not in the list
 *                              of allowed environments or when no environments are specified
 *
 * @see {@link REQUEST_ENV_META_KEY} - Metadata key used to retrieve environment requirements
 * @see {@link ENUM_APP_ENVIRONMENT} - Available application environment types
 * @see {@link ENUM_REQUEST_STATUS_CODE_ERROR.ENV_FORBIDDEN} - Status code used in forbidden responses
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
