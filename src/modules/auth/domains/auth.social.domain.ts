import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginTicket, OAuth2Client } from 'google-auth-library';
import type { TokenPayload } from 'google-auth-library';
import verifyAppleToken from 'verify-apple-id-token';
import type { VerifyAppleIdTokenResponse } from 'verify-apple-id-token';
import { AuthSocialAppleNotConfiguredException } from '@modules/auth/exceptions/auth.social-apple-not-configured.exception';
import { AuthSocialGoogleInvalidException } from '@modules/auth/exceptions/auth.social-google-invalid.exception';
import { AuthSocialGoogleNotConfiguredException } from '@modules/auth/exceptions/auth.social-google-not-configured.exception';

/** Verifies Google and Apple identity tokens. See docs/authentication.md. */
@Injectable()
export class AuthSocialDomain {
    private readonly appleClientIds: string[];

    private readonly google: {
        client: OAuth2Client;
        clientId: string;
    } | null;

    constructor(private readonly configService: ConfigService) {
        const appleClientId = this.configService.get<string | null>(
            'auth.apple.clientId'
        );
        const appleSignInClientId = this.configService.get<string | null>(
            'auth.apple.signInClientId'
        );
        const googleClientId = this.configService.get<string | null>(
            'auth.google.clientId'
        );

        this.appleClientIds = [appleClientId, appleSignInClientId].filter(
            (clientId): clientId is string => !!clientId
        );
        this.google = googleClientId
            ? {
                  client: new OAuth2Client(googleClientId),
                  clientId: googleClientId,
              }
            : null;
    }

    async verifyGoogle(token: string): Promise<TokenPayload> {
        if (!this.google) {
            throw new AuthSocialGoogleNotConfiguredException();
        }

        const login: LoginTicket = await this.google.client.verifyIdToken({
            idToken: token,
            audience: this.google.clientId,
        });

        const payload = login.getPayload();

        if (!payload) {
            throw new AuthSocialGoogleInvalidException(
                'Unable to extract payload from Google token'
            );
        }
        if (!payload.email) {
            throw new AuthSocialGoogleInvalidException(
                'Google token payload does not contain email'
            );
        }

        if (!payload.email_verified) {
            throw new AuthSocialGoogleInvalidException(
                'Google token payload does not contain email_verified'
            );
        }

        return payload as TokenPayload;
    }

    async verifyApple(token: string): Promise<VerifyAppleIdTokenResponse> {
        if (this.appleClientIds.length === 0) {
            throw new AuthSocialAppleNotConfiguredException();
        }

        return verifyAppleToken.default({
            idToken: token,
            clientId: this.appleClientIds,
        });
    }
}
