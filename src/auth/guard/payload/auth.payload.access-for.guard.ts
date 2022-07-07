import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/auth/auth.constant';
import {
    ENUM_ROLE_ACCESS_FOR,
    ROLE_ACCESS_FOR_META_KEY,
} from 'src/role/role.constant';

@Injectable()
export class AuthPayloadAccessForGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredFor: ENUM_ROLE_ACCESS_FOR[] =
            this.reflector.getAllAndOverride<ENUM_ROLE_ACCESS_FOR[]>(
                ROLE_ACCESS_FOR_META_KEY,
                [context.getHandler(), context.getClass()]
            );

        if (!requiredFor) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        const { role } = user;
        const roleFor = role.accessFor;
        const hasFor: boolean = requiredFor.every((rFor) =>
            roleFor.includes(rFor)
        );

        if (!hasFor) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_GUARD_ROLE_ACCESS_FOR_INVALID_ERROR,
                message: 'role.error.forbidden',
            });
        }
        return hasFor;
    }
}
