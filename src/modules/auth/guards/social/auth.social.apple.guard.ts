import type { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    AuthBearerScheme,
    AuthHeaderName,
    AuthSocialContextStoreKey,
} from '@modules/auth/constants/auth.constant';
import type { IAuthSocialContext } from '@modules/auth/interfaces/auth.interface';
import { AuthSocialAppleRequiredException } from '@modules/auth/exceptions/auth.social-apple-required.exception';
import { AuthService } from '@modules/auth/services/auth.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AuthSocialAppleGuard implements CanActivate {
    constructor(
        private readonly authService: AuthService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();

        const requestHeaders =
            (request.headers[AuthHeaderName.toLowerCase()] as string)?.split(
                `${AuthBearerScheme} `
            ) ?? [];
        if (requestHeaders.length !== 2) {
            throw new AuthSocialAppleRequiredException();
        }

        const { email, emailVerified, subject } =
            await this.authService.validateOauthApple(requestHeaders[1]!);
        this.requestStoreService.set<IAuthSocialContext>(
            AuthSocialContextStoreKey,
            { email, emailVerified, subject }
        );

        return true;
    }
}
