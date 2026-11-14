import type { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    AuthBearerScheme,
    AuthHeaderName,
    AuthSocialContextStoreKey,
} from '@modules/auth/constants/auth.constant';
import type { IAuthSocialContext } from '@modules/auth/interfaces/auth.interface';
import { AuthSocialGoogleRequiredException } from '@modules/auth/exceptions/auth.social-google-required.exception';
import { AuthService } from '@modules/auth/services/auth.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AuthSocialGoogleGuard implements CanActivate {
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
            throw new AuthSocialGoogleRequiredException();
        }

        const { email, emailVerified } =
            await this.authService.validateOAuthGoogle(requestHeaders[1]!);
        this.requestStoreService.set<IAuthSocialContext>(
            AuthSocialContextStoreKey,
            { email, emailVerified }
        );

        return true;
    }
}
