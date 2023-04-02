import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_TYPE_META_KEY } from 'src/common/auth/constants/auth.constant';
import { ENUM_AUTH_TYPE } from 'src/common/auth/constants/auth.enum.constant';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/common/auth/constants/auth.status-code.constant';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';

@Injectable()
export class AuthPayloadTypeGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly helperArrayService: HelperArrayService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredFor: ENUM_AUTH_TYPE[] = this.reflector.getAllAndOverride<
            ENUM_AUTH_TYPE[]
        >(AUTH_TYPE_META_KEY, [context.getHandler(), context.getClass()]);

        const { user } = context.switchToHttp().getRequest();
        const { type } = user;

        if (!requiredFor || type === ENUM_AUTH_TYPE.SUPER_ADMIN) {
            return true;
        }

        const hasFor: boolean = this.helperArrayService.includes(
            requiredFor,
            type
        );

        if (!hasFor) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PAYLOAD_TYPE_INVALID_ERROR,
                message: 'auth.error.typeForbidden',
            });
        }
        return hasFor;
    }
}
