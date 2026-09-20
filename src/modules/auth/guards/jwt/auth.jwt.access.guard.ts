import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    AuthJwtAccessGuardKey,
    AuthPayloadStoreKey,
} from '@modules/auth/constants/auth.constant';
import { AuthDomain } from '@modules/auth/domains/auth.domain';
import { RequestStoreService } from '@common/request/services/request.store.service';

/** Guard for JWT access token routes; stores the validated payload in the request store. */
@Injectable()
export class AuthJwtAccessGuard extends AuthGuard(AuthJwtAccessGuardKey) {
    constructor(
        private readonly authDomain: AuthDomain,
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
        const payload = this.authDomain.validateJwtAccessGuard(err, user, info);

        this.requestStoreService.set(AuthPayloadStoreKey, payload);

        return payload as T;
    }
}
