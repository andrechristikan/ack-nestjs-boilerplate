import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import type {
    IAuthJwtAccessContext,
    IAuthJwtAccessTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import {
    AuthJwtAccessContextStoreKey,
    AuthJwtAccessGuardKey,
} from '@modules/auth/constants/auth.constant';
import { AuthService } from '@modules/auth/services/auth.service';
import { RequestActorStoreKey } from '@common/request/constants/request.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';

@Injectable()
export class AuthJwtAccessGuard extends AuthGuard(AuthJwtAccessGuardKey) {
    constructor(
        private readonly authService: AuthService,
        private readonly requestStoreService: RequestStoreService
    ) {
        super();
    }

    handleRequest<T = IAuthJwtAccessContext>(
        err: Error | null,
        user: IAuthJwtAccessTokenPayload | false,
        info: Error | string | undefined
    ): T {
        const payload = this.authService.validateJwtAccessGuard(
            err,
            user === false ? null : user,
            info instanceof Error ? info : null
        );

        const authContext: IAuthJwtAccessContext = {
            userId: payload.userId,
            sessionId: payload.sessionId,
            deviceOwnershipId: payload.deviceOwnershipId,
            loginWith: payload.loginWith,
        };
        this.requestStoreService.set<IAuthJwtAccessContext>(
            AuthJwtAccessContextStoreKey,
            authContext
        );
        this.requestStoreService.set<string>(
            RequestActorStoreKey,
            authContext.userId
        );

        return authContext as T;
    }
}
