import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { POLICY_ROLE_META_KEY } from 'src/modules/policy/constants/policy.constant';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { ENUM_POLICY_STATUS_CODE_ERROR } from 'src/modules/policy/enums/policy.status-code.enum';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/modules/auth/enums/auth.status-code.enum';

@Injectable()
export class PolicyRoleGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const role =
            this.reflector.get<ENUM_POLICY_ROLE_TYPE>(
                POLICY_ROLE_META_KEY,
                context.getHandler()
            ) || [];

        const { user } = context.switchToHttp().getRequest<IRequestApp>();
        if (!user) {
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
