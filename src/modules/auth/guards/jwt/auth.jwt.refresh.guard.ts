import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type {
    IAuthJwtAccessContext,
    IAuthJwtRefreshContext,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import {
    AuthJwtRefreshContextStoreKey,
    AuthJwtRefreshGuardKey,
} from '@modules/auth/constants/auth.constant';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { AuthService } from '@modules/auth/services/auth.service';
import { RequestActorStoreKey } from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';

@Injectable()
export class AuthJwtRefreshGuard extends AuthGuard(AuthJwtRefreshGuardKey) {
    constructor(
        private readonly authService: AuthService,
        private readonly requestStoreService: RequestStoreService
    ) {
        super();
    }

    override handleRequest<T = IAuthJwtAccessContext>(
        err: Error | null,
        user: IAuthJwtRefreshTokenPayload | false,
        info: Error | string | undefined,
        context: ExecutionContext
    ): T {
        const payload = this.authService.validateJwtRefreshGuard(
            err,
            user === false ? null : user,
            info instanceof Error ? info : null
        );

        const { authorization } = context
            .switchToHttp()
            .getRequest<IRequestApp>().headers;
        const bearer = authorization?.split(' ')[1] ?? null;
        if (bearer === null) {
            throw new AuthJwtRefreshTokenInvalidException();
        }

        const accessContext: IAuthJwtAccessContext = {
            userId: payload.userId,
            sessionId: payload.sessionId,
            deviceOwnershipId: payload.deviceOwnershipId,
            loginWith: payload.loginWith,
        };
        this.requestStoreService.set<IAuthJwtRefreshContext>(
            AuthJwtRefreshContextStoreKey,
            { ...accessContext, token: bearer }
        );
        this.requestStoreService.set<string>(
            RequestActorStoreKey,
            accessContext.userId
        );

        return accessContext as T;
    }
}
