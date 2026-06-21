import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    AuthJwtAccessGuardKey,
    AuthPayloadStoreKey,
} from '@modules/auth/constants/auth.constant';
import { AuthService } from '@modules/auth/services/auth.service';
import { RequestStoreService } from '@common/request/services/request.store.service';

/** Guard for JWT access token routes; stores the validated payload in the request store. */
@Injectable()
export class AuthJwtAccessGuard extends AuthGuard(AuthJwtAccessGuardKey) {
    constructor(
        private readonly authService: AuthService,
        private readonly requestStoreService: RequestStoreService
    ) {
        super();
    }

    /** Validates the Passport result, then persists the payload to the request store. */
    handleRequest<T = IAuthJwtAccessTokenPayload>(
        err: Error,
        user: IAuthJwtAccessTokenPayload,
        info: Error
    ): T {
        const payload = this.authService.validateJwtAccessGuard(
            err,
            user,
            info
        );

        this.requestStoreService.set(AuthPayloadStoreKey, payload);

        return payload as T;
    }
}
