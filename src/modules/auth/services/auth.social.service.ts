import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginTicket, OAuth2Client, TokenPayload } from 'google-auth-library';
import verifyAppleToken, {
    VerifyAppleIdTokenResponse,
} from 'verify-apple-id-token';
import { IAuthSocialService } from '@modules/auth/interfaces/auth.social.service.interface';

/** Verifies Google and Apple identity tokens. See docs/authentication.md. */
@Injectable()
export class AuthSocialService implements IAuthSocialService {
    private readonly appleClientId: string;
    private readonly appleSignInClientId: string;

    private readonly googleClient: OAuth2Client;

    constructor(private readonly configService: ConfigService) {
        this.appleClientId = this.configService.get<string>(
            'auth.apple.clientId'
        )!;
        this.appleSignInClientId = this.configService.get<string>(
            'auth.apple.signInClientId'
        )!;

        this.googleClient = new OAuth2Client(
            this.configService.get<string>('auth.google.clientId')!,
            this.configService.get<string>('auth.google.clientSecret')!
        );
    }

    async verifyGoogle(token: string): Promise<TokenPayload> {
        const login: LoginTicket = await this.googleClient.verifyIdToken({
            idToken: token,
        });

        const payload = login.getPayload();

        if (!payload) {
            throw new Error('Unable to extract payload from Google token');
        }
        if (!payload.email) {
            throw new Error('Google token payload does not contain email');
        }

        if (!payload.email_verified) {
            throw new Error(
                'Google token payload does not contain email_verified'
            );
        }

        return payload as TokenPayload;
    }

    async verifyApple(token: string): Promise<VerifyAppleIdTokenResponse> {
        return verifyAppleToken({
            idToken: token,
            clientId: [this.appleClientId, this.appleSignInClientId],
        });
    }
}
