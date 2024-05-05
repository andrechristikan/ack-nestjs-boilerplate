import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ROLE_META_KEY } from 'src/common/role/constants/role.constant';
import { ENUM_ROLE_TYPE } from 'src/common/role/constants/role.enum.constant';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/common/role/constants/role.status-code.constant';

@Injectable()
export class RoleGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const role =
            this.reflector.get<ENUM_ROLE_TYPE>(
                ROLE_META_KEY,
                context.getHandler()
            ) || [];

        const { user } = context.switchToHttp().getRequest<IRequestApp>();
        const { type } = user;

        if (type === ENUM_ROLE_TYPE.SUPER_ADMIN) {
            return true;
        }

        if (role !== type) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.FORBIDDEN_ERROR,
                message: 'role.error.forbidden',
            });
        }

        return true;
    }
}
