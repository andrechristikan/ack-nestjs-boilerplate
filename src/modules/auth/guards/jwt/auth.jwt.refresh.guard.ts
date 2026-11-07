import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import {
    AuthJwtRefreshGuardKey,
    AuthPayloadStoreKey,
} from '@modules/auth/constants/auth.constant';
import { AuthService } from '@modules/auth/services/auth.service';
import { RequestStoreService } from '@common/request/services/request.store.service';

@Injectable()
export class AuthJwtRefreshGuard extends AuthGuard(AuthJwtRefreshGuardKey) {
    constructor(
        private readonly authService: AuthService,
        private readonly requestStoreService: RequestStoreService
    ) {
        super();
    }

    handleRequest<T = IAuthJwtRefreshTokenPayload>(
        err: Error | null,
        user: IAuthJwtRefreshTokenPayload | false,
        info: Error | string | undefined
    ): T {
        const payload = this.authService.validateJwtRefreshGuard(
            err,
            user === false ? null : user,
            info instanceof Error ? info : null
        );

        this.requestStoreService.set(
            AuthPayloadStoreKey,
            payload as IAuthJwtAccessTokenPayload
        );

        return payload as T;
    }
}
