import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginTicket, OAuth2Client } from 'google-auth-library';
import type { TokenPayload } from 'google-auth-library';
import verifyAppleToken from 'verify-apple-id-token';
import type { VerifyAppleIdTokenResponse } from 'verify-apple-id-token';
import { AuthSocialAppleInvalidException } from '@modules/auth/exceptions/auth.social-apple-invalid.exception';
import { AuthSocialAppleNotConfiguredException } from '@modules/auth/exceptions/auth.social-apple-not-configured.exception';
import { AuthSocialGoogleInvalidException } from '@modules/auth/exceptions/auth.social-google-invalid.exception';
import { AuthSocialNonceInvalidException } from '@modules/auth/exceptions/auth.social-nonce-invalid.exception';
import { AuthSocialGoogleNotConfiguredException } from '@modules/auth/exceptions/auth.social-google-not-configured.exception';
import type { IAuthSocialNonce } from '@modules/auth/interfaces/auth.interface';
import { AuthSocialNonceRepository } from '@modules/auth/repositories/auth.social-nonce.repository';

@Injectable()
export class AuthSocialService {
    private readonly appleClientIds: string[];

    private readonly google: {
        client: OAuth2Client;
        clientId: string;
    } | null;

    private readonly nonceLength: number;
    private readonly expiresInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly authSocialNonceRepository: AuthSocialNonceRepository,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService
    ) {
        this.nonceLength = this.configService.get<number>(
            'auth.social.nonce.length'
        )!;
        this.expiresInMs = this.configService.get<number>(
            'auth.social.nonce.expiresInMs'
        )!;
        const googleClientId = this.configService.get<string | null>(
            'auth.social.google.clientId'
        );

        this.appleClientIds = this.configService.get<string[]>(
            'auth.social.apple.clientIds'
        )!;
        this.google = googleClientId
            ? {
                  client: new OAuth2Client(googleClientId),
                  clientId: googleClientId,
              }
            : null;
    }

    /** Stores the SHA-256 hash of a new nonce, deletes the expired rows in the same call, and returns the plain nonce once. */
    async createNonce(): Promise<IAuthSocialNonce> {
        const nonce = this.helperStringService.random(this.nonceLength);
        const nonceHash = this.helperHashService.sha256Hash(nonce);
        const now = this.helperDateService.create();
        const duration = this.helperDateService.createDuration({
            milliseconds: this.expiresInMs,
        });
        const expiredAt = this.helperDateService.forward(now, duration);

        await Promise.all([
            this.authSocialNonceRepository.create(nonceHash, expiredAt),
            this.authSocialNonceRepository.deleteExpired(now),
        ]);

        return { nonce, expiredAt };
    }

    /** Spends the nonce claim of a verified ID token: the one `deleteMany` statement lets only one of two concurrent calls win. */
    async consumeNonce(nonce: string | null): Promise<void> {
        if (nonce === null || nonce === '') {
            throw new AuthSocialNonceInvalidException();
        }

        const nonceHash = this.helperHashService.sha256Hash(nonce);
        const now = this.helperDateService.create();
        const consumed = await this.authSocialNonceRepository.consume(
            nonceHash,
            now
        );

        if (!consumed) {
            throw new AuthSocialNonceInvalidException();
        }
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

        const payload = await verifyAppleToken.default({
            idToken: token,
            clientId: this.appleClientIds,
        });
        if (!payload.email) {
            throw new AuthSocialAppleInvalidException(
                'Apple token payload does not contain email'
            );
        }

        // Apple sends email_verified as a boolean or as the string "true"
        if (String(payload.email_verified) !== 'true') {
            throw new AuthSocialAppleInvalidException(
                'Apple token payload does not contain verified email'
            );
        }

        return payload;
    }
}
