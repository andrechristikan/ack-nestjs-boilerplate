import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import {
    AUTH_ADMIN_META_KEY,
    ENUM_AUTH_STATUS_CODE_ERROR,
} from 'src/auth/auth.constant';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthPayloadAdminGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required: boolean[] = this.reflector.getAllAndOverride<boolean[]>(
            AUTH_ADMIN_META_KEY,
            [context.getHandler(), context.getClass()]
        );

        if (!required) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        if (!required.includes(user.role.isAdmin)) {
            throw new ForbiddenException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_ADMIN_ERROR,
                message: 'auth.error.admin',
            });
        }
        return true;
    }
}
