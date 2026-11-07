import type { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    AuthBearerScheme,
    AuthHeaderName,
} from '@modules/auth/constants/auth.constant';
import { AuthSocialAppleRequiredException } from '@modules/auth/exceptions/auth.social-apple-required.exception';
import type { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthService } from '@modules/auth/services/auth.service';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AuthSocialAppleGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestApp<IAuthSocialPayload>>();

        const requestHeaders =
            (request.headers[AuthHeaderName.toLowerCase()] as string)?.split(
                `${AuthBearerScheme} `
            ) ?? [];
        if (requestHeaders.length !== 2) {
            throw new AuthSocialAppleRequiredException();
        }

        request.user = await this.authService.validateOAuthApple(
            requestHeaders[1]!
        );

        return true;
    }
}
