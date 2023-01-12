import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_ACCESS_FOR_META_KEY } from 'src/common/auth/constants/auth.constant';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/common/auth/constants/auth.status-code.constant';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';

@Injectable()
export class AuthPayloadAccessForGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly helperArrayService: HelperArrayService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredFor: ENUM_AUTH_ACCESS_FOR[] =
            this.reflector.getAllAndOverride<ENUM_AUTH_ACCESS_FOR[]>(
                AUTH_ACCESS_FOR_META_KEY,
                [context.getHandler(), context.getClass()]
            );

        const { user } = context.switchToHttp().getRequest();
        const { accessFor } = user;

        if (!requiredFor || accessFor === ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN) {
            return true;
        }

        const hasFor: boolean = this.helperArrayService.includes(
            requiredFor,
            accessFor
        );

        if (!hasFor) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.AUTH_ACCESS_FOR_INVALID_ERROR,
                message: 'auth.error.accessForForbidden',
            });
        }
        return hasFor;
    }
}
