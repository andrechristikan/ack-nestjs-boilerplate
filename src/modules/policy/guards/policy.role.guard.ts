import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { POLICY_ROLE_META_KEY } from '@modules/policy/constants/policy.constant';
import { ENUM_POLICY_ROLE_TYPE } from '@modules/policy/enums/policy.enum';
import { ENUM_POLICY_STATUS_CODE_ERROR } from '@modules/policy/enums/policy.status-code.enum';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@modules/auth/enums/auth.status-code.enum';

/**
 * Guard that validates user access based on policy role types
 */
@Injectable()
export class PolicyRoleGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    /**
     * Validates if the current user has the required role to access the resource
     * @param {ExecutionContext} context - NestJS execution context containing request information
     * @returns {Promise<boolean>} Promise that resolves to true if user has required role access
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const role =
            this.reflector.get<ENUM_POLICY_ROLE_TYPE>(
                POLICY_ROLE_META_KEY,
                context.getHandler()
            ) || [];

        const { __user, user } = context
            .switchToHttp()
            .getRequest<IRequestApp>();
        if (!__user || !user) {
            throw new ForbiddenException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const { type } = user;

        if (type === ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN) {
            return true;
        } else if (role.length === 0) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_POLICY_STATUS_CODE_ERROR.ROLE_PREDEFINED_NOT_FOUND,
                message: 'policy.error.rolePredefinedNotFound',
            });
        } else if (!role.includes(type)) {
            throw new ForbiddenException({
                statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ROLE_FORBIDDEN,
                message: 'policy.error.roleForbidden',
            });
        }

        return true;
    }
}
