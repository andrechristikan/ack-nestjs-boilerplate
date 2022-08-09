import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';
import { AUTH_ACCESS_FOR_META_KEY } from '../../constants/auth.constant';
import { ENUM_AUTH_ACCESS_FOR } from '../../constants/auth.enum.constant';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '../../constants/auth.status-code.constant';

@Injectable()
export class AuthPayloadAccessForGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private readonly helperArrayService: HelperArrayService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredFor: ENUM_AUTH_ACCESS_FOR[] =
            this.reflector.getAllAndOverride<ENUM_AUTH_ACCESS_FOR[]>(
                AUTH_ACCESS_FOR_META_KEY,
                [context.getHandler(), context.getClass()]
            );

        if (!requiredFor) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        const { role } = user;
        const hasFor: boolean = this.helperArrayService.includes(
            requiredFor,
            role.accessFor
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
