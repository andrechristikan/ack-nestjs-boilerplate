import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthService } from '@modules/auth/services/auth.service';
import { UserService } from '@modules/user/services/user.service';
import { ENUM_USER_STATUS } from '@modules/user/enums/user.enum';
import { ENUM_USER_STATUS_CODE_ERROR } from '@modules/user/enums/user.status-code.enum';
import { ENUM_ROLE_STATUS_CODE_ERROR } from '@modules/role/enums/role.status-code.enum';
import { Reflector } from '@nestjs/core';
import { USER_GUARD_EMAIL_VERIFIED_META_KEY } from '@modules/user/constants/user.constant';
import { UserEntity } from '@modules/user/repository/entities/user.entity';

@Injectable()
export class UserGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly userService: UserService,
        private readonly authService: AuthService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // const emailVerified =
        //     this.reflector.get<boolean[]>(
        //         USER_GUARD_EMAIL_VERIFIED_META_KEY,
        //         context.getHandler()
        //     ) || [];

        // const request = context.switchToHttp().getRequest<IRequestApp>();
        // const { userId } = request.user;

        // const userWithRole: UserEntity =
        //     await this.userService.findOneWithRoleAndCountryById(userId);

        // if (!userWithRole) {
        //     throw new ForbiddenException({
        //         statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
        //         message: 'user.error.notFound',
        //     });
        // } else if (userWithRole.status !== ENUM_USER_STATUS.ACTIVE) {
        //     throw new ForbiddenException({
        //         statusCode: ENUM_USER_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
        //         message: 'user.error.inactive',
        //     });
        // }

        // const checkPasswordExpired: boolean =
        //     this.authService.checkPasswordExpired(userWithRole.passwordExpired);
        // if (checkPasswordExpired) {
        //     throw new ForbiddenException({
        //         statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED,
        //         message: 'auth.error.passwordExpired',
        //     });
        // } else if (
        //     emailVerified.includes(true) &&
        //     userWithRole.verification.email !== true
        // ) {
        //     throw new ForbiddenException({
        //         statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_NOT_VERIFIED,
        //         message: 'user.error.emailNotVerified',
        //     });
        // }

        // request.__user = userWithRole.toObject<IUserEntity>();

        return true;
    }
}
