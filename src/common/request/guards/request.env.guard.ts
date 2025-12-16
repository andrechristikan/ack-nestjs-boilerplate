import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { RequestEnvMetaKey } from '@common/request/constants/request.constant';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

/**
 * Environment-based access control guard for route protection.
 * Enforces environment restrictions by comparing current environment against allowed environments.
 */
@Injectable()
export class RequestEnvGuard implements CanActivate {
    private readonly env: EnumAppEnvironment;

    constructor(
        private readonly reflector: Reflector,
        private readonly configService: ConfigService
    ) {
        this.env = this.configService.get<EnumAppEnvironment>('app.env');
    }

    /**
     * Validates if current environment is allowed to access the route.
     * @param {ExecutionContext} context - Execution context containing route metadata
     * @returns {Promise<boolean>} Promise resolving to true if access is allowed
     * @throws {ForbiddenException} When environment access is not permitted
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required: EnumAppEnvironment[] = this.reflector.getAllAndOverride<
            EnumAppEnvironment[]
        >(RequestEnvMetaKey, [context.getHandler(), context.getClass()]);

        if (!required || !required.includes(this.env)) {
            throw new ForbiddenException({
                statusCode: EnumRequestStatusCodeError.envForbidden,
                message: 'http.clientError.forbidden',
            });
        }

        return true;
    }
}
