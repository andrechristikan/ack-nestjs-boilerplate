import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import { Reflector } from '@nestjs/core';
import {
    UserGuardIsVerifiedMetaKey,
    UserStoreKey,
} from '@modules/user/constants/user.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';

/** Validates the authenticated user and stores it in the request context for `UserCurrent`. */
@Injectable()
export class UserGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly userDomain: UserDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isVerifiedRequired = this.reflector.get<boolean>(
            UserGuardIsVerifiedMetaKey,
            context.getHandler()
        );
        const isVerified = isVerifiedRequired ?? false;

        const request = context.switchToHttp().getRequest<IRequestApp>();

        const user = await this.userDomain.validateUserGuard(
            request.user?.userId ?? null,
            isVerified
        );

        this.requestStoreService.set(UserStoreKey, user);

        return true;
    }
}
