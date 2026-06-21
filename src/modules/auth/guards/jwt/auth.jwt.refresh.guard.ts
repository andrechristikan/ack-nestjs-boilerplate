import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import { AuthJwtRefreshGuardKey, AuthPayloadStoreKey } from '@modules/auth/constants/auth.constant';
import { AuthService } from '@modules/auth/services/auth.service';
import { RequestStoreService } from '@common/request/services/request.store.service';

/** Guard for JWT refresh token routes; stores the validated payload in the request store. */
@Injectable()
export class AuthJwtRefreshGuard extends AuthGuard(AuthJwtRefreshGuardKey) {
    constructor(
        private readonly authService: AuthService,
        private readonly requestStoreService: RequestStoreService
    ) {
        super();
    }

    /** Validates the Passport result, then persists the payload to the request store. */
    handleRequest<T = IAuthJwtRefreshTokenPayload>(
        err: Error,
        user: IAuthJwtRefreshTokenPayload,
        info: Error
    ): T {
        const payload = this.authService.validateJwtRefreshGuard(
            err,
            user,
            info
        );

        this.requestStoreService.set(
            AuthPayloadStoreKey,
            payload as IAuthJwtAccessTokenPayload
        );

        return payload as T;
    }
}
