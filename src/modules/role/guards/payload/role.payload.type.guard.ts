import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ROLE_TYPE_META_KEY } from 'src/modules/role/constants/role.constant';
import { ENUM_ROLE_TYPE } from 'src/modules/role/constants/role.enum.constant';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';

@Injectable()
export class RolePayloadTypeGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredFor: ENUM_ROLE_TYPE[] = this.reflector.getAllAndOverride<
            ENUM_ROLE_TYPE[]
        >(ROLE_TYPE_META_KEY, [context.getHandler(), context.getClass()]);

        const { user } = context.switchToHttp().getRequest<IRequestApp>();
        const { type } = user.user;

        if (!requiredFor || type === ENUM_ROLE_TYPE.SUPER_ADMIN) {
            return true;
        }

        const hasFor: boolean = requiredFor.includes(type);
        if (!hasFor) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_ROLE_STATUS_CODE_ERROR.ROLE_PAYLOAD_TYPE_INVALID_ERROR,
                message: 'role.error.typeForbidden',
            });
        }
        return hasFor;
    }
}
