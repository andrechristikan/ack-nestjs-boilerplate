import { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthSocialAppleRequiredException } from '@modules/auth/exceptions/auth.social-apple-required.exception';
import { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthService } from '@modules/auth/services/auth.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/** Guard validating an Apple ID token and attaching the social payload to the request. */
@Injectable()
export class AuthSocialAppleGuard implements CanActivate {
    constructor(
        private readonly authService: AuthService,
        private readonly authUtil: AuthUtil
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestApp<IAuthSocialPayload>>();

        const requestHeaders = this.authUtil.extractHeaderApple(request);
        if (requestHeaders.length !== 2) {
            throw new AuthSocialAppleRequiredException();
        }

        request.user = await this.authService.validateOAuthApple(
            requestHeaders[1]
        );

        return true;
    }
}
