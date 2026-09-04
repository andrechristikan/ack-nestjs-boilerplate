import { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthSocialGoogleRequiredException } from '@modules/auth/exceptions/auth.social-google-required.exception';
import { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthService } from '@modules/auth/services/auth.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/** Guard validating a Google ID token and attaching the social payload to the request. */
@Injectable()
export class AuthSocialGoogleGuard implements CanActivate {
    constructor(
        private readonly authService: AuthService,
        private readonly authUtil: AuthUtil
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestApp<IAuthSocialPayload>>();

        const requestHeaders = this.authUtil.extractHeaderGoogle(request);
        if (requestHeaders.length !== 2) {
            throw new AuthSocialGoogleRequiredException();
        }

        request.user = await this.authService.validateOAuthGoogle(
            requestHeaders[1]
        );

        return true;
    }
}
