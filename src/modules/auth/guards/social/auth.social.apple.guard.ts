import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthSocialAppleRequiredException } from '@modules/auth/exceptions/auth.social-apple-required.exception';
import type { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthDomain } from '@modules/auth/domains/auth.domain';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Guard validating an Apple ID token and attaching the social payload to the request. */
@Injectable()
export class AuthSocialAppleGuard implements CanActivate {
    private readonly appleHeader: string;
    private readonly applePrefix: string;

    constructor(
        private readonly authDomain: AuthDomain,
        private readonly configService: ConfigService
    ) {
        this.appleHeader = this.configService.get<string>('auth.apple.header')!;
        this.applePrefix = this.configService.get<string>('auth.apple.prefix')!;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestApp<IAuthSocialPayload>>();

        const appleHeaderName = this.appleHeader.toLowerCase();
        const requestHeaders =
            (request.headers[appleHeaderName] as string)?.split(
                `${this.applePrefix} `
            ) ?? [];
        if (requestHeaders.length !== 2) {
            throw new AuthSocialAppleRequiredException();
        }

        request.user = await this.authDomain.validateOAuthApple(
            requestHeaders[1]
        );

        return true;
    }
}
