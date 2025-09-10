import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { UserService } from '@modules/user/services/user.service';
import { Reflector } from '@nestjs/core';
import { USER_GUARD_IS_VERIFIED_META_KEY } from '@modules/user/constants/user.constant';

@Injectable()
export class UserGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly userService: UserService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isVerified =
            this.reflector.get<boolean>(
                USER_GUARD_IS_VERIFIED_META_KEY,
                context.getHandler()
            ) || false;

        const request = context.switchToHttp().getRequest<IRequestApp>();

        const user = await this.userService.validateUserGuard(
            request,
            isVerified
        );

        request.__user = user;

        return true;
    }
}
