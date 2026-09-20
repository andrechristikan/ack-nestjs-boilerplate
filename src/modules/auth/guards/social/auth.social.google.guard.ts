import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthSocialGoogleRequiredException } from '@modules/auth/exceptions/auth.social-google-required.exception';
import type { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthDomain } from '@modules/auth/domains/auth.domain';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Guard validating a Google ID token and attaching the social payload to the request. */
@Injectable()
export class AuthSocialGoogleGuard implements CanActivate {
    private readonly googleHeader: string;
    private readonly googlePrefix: string;

    constructor(
        private readonly authDomain: AuthDomain,
        private readonly configService: ConfigService
    ) {
        this.googleHeader =
            this.configService.get<string>('auth.google.header')!;
        this.googlePrefix =
            this.configService.get<string>('auth.google.prefix')!;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestApp<IAuthSocialPayload>>();

        const googleHeaderName = this.googleHeader.toLowerCase();
        const requestHeaders =
            (request.headers[googleHeaderName] as string)?.split(
                `${this.googlePrefix} `
            ) ?? [];
        if (requestHeaders.length !== 2) {
            throw new AuthSocialGoogleRequiredException();
        }

        request.user = await this.authDomain.validateOAuthGoogle(
            requestHeaders[1]
        );

        return true;
    }
}
