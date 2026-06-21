import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { UserService } from '@modules/user/services/user.service';
import { Reflector } from '@nestjs/core';
import { UserGuardIsVerifiedMetaKey, UserStoreKey } from '@modules/user/constants/user.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';

/** Validates the authenticated user and stores it in the request context for `UserCurrent`. */
@Injectable()
export class UserGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly userService: UserService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isVerified =
            this.reflector.get<boolean>(
                UserGuardIsVerifiedMetaKey,
                context.getHandler()
            ) ?? false;

        const request = context.switchToHttp().getRequest<IRequestApp>();

        const user = await this.userService.validateUserGuard(
            request,
            isVerified
        );

        this.requestStoreService.set(UserStoreKey, user);

        return true;
    }
}
