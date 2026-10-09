import type { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    AuthBearerScheme,
    AuthHeaderName,
} from '@modules/auth/constants/auth.constant';
import { AuthSocialGoogleRequiredException } from '@modules/auth/exceptions/auth.social-google-required.exception';
import type { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthDomain } from '@modules/auth/domains/auth.domain';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

/** Guard validating a Google ID token and attaching the social payload to the request. */
@Injectable()
export class AuthSocialGoogleGuard implements CanActivate {
    constructor(private readonly authDomain: AuthDomain) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestApp<IAuthSocialPayload>>();

        const requestHeaders =
            (request.headers[AuthHeaderName.toLowerCase()] as string)?.split(
                `${AuthBearerScheme} `
            ) ?? [];
        if (requestHeaders.length !== 2) {
            throw new AuthSocialGoogleRequiredException();
        }

        request.user = await this.authDomain.validateOAuthGoogle(
            requestHeaders[1]!
        );

        return true;
    }
}
