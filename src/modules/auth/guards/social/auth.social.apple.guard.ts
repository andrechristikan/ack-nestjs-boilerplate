import { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthSocialAppleRequiredException } from '@modules/auth/exceptions/auth.social-apple-required.exception';
import { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthService } from '@modules/auth/services/auth.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Guard validating an Apple ID token and attaching the social payload to the request. */
@Injectable()
export class AuthSocialAppleGuard implements CanActivate {
    private readonly appleHeader: string;
    private readonly applePrefix: string;

    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService
    ) {
        this.appleHeader = this.configService.get<string>('auth.apple.header')!;
        this.applePrefix = this.configService.get<string>('auth.apple.prefix')!;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestApp<IAuthSocialPayload>>();

        const requestHeaders =
            (request.headers[this.appleHeader.toLowerCase()] as string)?.split(
                `${this.applePrefix} `
            ) ?? [];
        if (requestHeaders.length !== 2) {
            throw new AuthSocialAppleRequiredException();
        }

        request.user = await this.authService.validateOAuthApple(
            requestHeaders[1]
        );

        return true;
    }
}
