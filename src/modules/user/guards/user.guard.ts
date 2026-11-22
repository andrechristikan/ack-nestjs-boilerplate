import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { UserService } from '@modules/user/services/user.service';
import { Reflector } from '@nestjs/core';
import {
    UserContextStoreKey,
    UserGuardIsVerifiedMetaKey,
} from '@modules/user/constants/user.constant';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import {
    AuthJwtAccessContextStoreKey,
    AuthJwtRefreshContextStoreKey,
} from '@modules/auth/constants/auth.constant';
import { AuthJwtGuardMissingException } from '@modules/auth/exceptions/auth.jwt-guard-missing.exception';
import type {
    IAuthJwtAccessContext,
    IAuthJwtRefreshContext,
} from '@modules/auth/interfaces/auth.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';

@Injectable()
export class UserGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly userService: UserService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isVerifiedRequired = this.reflector.get<boolean>(
            UserGuardIsVerifiedMetaKey,
            context.getHandler()
        );
        const isVerified = isVerifiedRequired ?? false;

        const accessContext =
            this.requestStoreService.get<IAuthJwtAccessContext>(
                AuthJwtAccessContextStoreKey
            );
        const refreshContext =
            this.requestStoreService.get<IAuthJwtRefreshContext>(
                AuthJwtRefreshContextStoreKey
            );
        const authContext = accessContext ?? refreshContext;
        if (authContext === null) {
            throw new AuthJwtGuardMissingException();
        }

        const user = await this.userService.validateUserGuard(
            authContext,
            isVerified
        );

        this.requestStoreService.set<IUserContext>(UserContextStoreKey, {
            user,
        });

        return true;
    }
}
