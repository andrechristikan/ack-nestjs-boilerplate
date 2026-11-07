import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    AuthJwtAccessGuardKey,
    AuthPayloadStoreKey,
} from '@modules/auth/constants/auth.constant';
import { AuthService } from '@modules/auth/services/auth.service';
import { RequestStoreService } from '@common/request/services/request.store.service';

@Injectable()
export class AuthJwtAccessGuard extends AuthGuard(AuthJwtAccessGuardKey) {
    constructor(
        private readonly authService: AuthService,
        private readonly requestStoreService: RequestStoreService
    ) {
        super();
    }

    handleRequest<T = IAuthJwtAccessTokenPayload>(
        err: Error | null,
        user: IAuthJwtAccessTokenPayload | false,
        info: Error | string | undefined
    ): T {
        const payload = this.authService.validateJwtAccessGuard(
            err,
            user === false ? null : user,
            info instanceof Error ? info : null
        );

        this.requestStoreService.set(AuthPayloadStoreKey, payload);

        return payload as T;
    }
}
