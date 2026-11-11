import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginTicket, OAuth2Client } from 'google-auth-library';
import type { TokenPayload } from 'google-auth-library';
import verifyAppleToken from 'verify-apple-id-token';
import type { VerifyAppleIdTokenResponse } from 'verify-apple-id-token';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import {
    AuthBearerScheme,
    AuthSocialGithubEmailsPath,
} from '@modules/auth/constants/auth.constant';
import type { IAuthSocialGithubResponse } from '@modules/auth/interfaces/auth.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { AuthProviderUnavailableException } from '@modules/auth/exceptions/auth.provider-unavailable.exception';
import { AuthSocialGithubInvalidException } from '@modules/auth/exceptions/auth.social-github-invalid.exception';
import { AuthSocialGithubNotConfiguredException } from '@modules/auth/exceptions/auth.social-github-not-configured.exception';
import { AuthSocialAppleInvalidException } from '@modules/auth/exceptions/auth.social-apple-invalid.exception';
import { AuthSocialAppleNotConfiguredException } from '@modules/auth/exceptions/auth.social-apple-not-configured.exception';
import { AuthSocialGoogleInvalidException } from '@modules/auth/exceptions/auth.social-google-invalid.exception';
import { AuthSocialGoogleNotConfiguredException } from '@modules/auth/exceptions/auth.social-google-not-configured.exception';

@Injectable()
export class AuthSocialService {
    private readonly appleClientIds: string[];

    private readonly google: {
        client: OAuth2Client;
        clientId: string;
    } | null;

    private readonly github: {
        clientId: string;
        clientSecret: string;
        tokenUrl: string;
        apiUrl: string;
        apiVersion: string;
        timeoutInMs: number;
    } | null;

    constructor(
        private readonly configService: ConfigService,
        private readonly authUtil: AuthUtil
    ) {
        const githubClientId = this.configService.get<string | null>(
            'auth.github.clientId'
        );
        const githubClientSecret = this.configService.get<string | null>(
            'auth.github.clientSecret'
        );
        const githubTokenUrl = this.configService.get<string>(
            'auth.github.tokenUrl'
        );
        const githubApiUrl =
            this.configService.get<string>('auth.github.apiUrl');
        const githubApiVersion = this.configService.get<string>(
            'auth.github.apiVersion'
        );
        const githubTimeoutInMs = this.configService.get<number>(
            'auth.github.timeoutInMs'
        );
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
        this.github =
            githubClientId && githubClientSecret
                ? {
                      clientId: githubClientId,
                      clientSecret: githubClientSecret,
                      tokenUrl: githubTokenUrl!,
                      apiUrl: githubApiUrl!,
                      apiVersion: githubApiVersion!,
                      timeoutInMs: githubTimeoutInMs!,
                  }
                : null;
    }

    private async requestGithub(
        url: string,
        init: RequestInit
    ): Promise<IAuthSocialGithubResponse> {
        try {
            const response = await fetch(url, init);
            const text = await response.text();

            return { status: response.status, headers: response.headers, text };
        } catch (err) {
            throw new AuthProviderUnavailableException(err);
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

    async verifyGithub(
        code: string,
        redirectUri: string,
        codeVerifier: string
    ): Promise<string> {
        if (!this.github) {
            throw new AuthSocialGithubNotConfiguredException();
        }

        const tokenResponse = await this.requestGithub(this.github.tokenUrl, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: this.github.clientId,
                client_secret: this.github.clientSecret,
                code,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier,
            }),
            signal: AbortSignal.timeout(this.github.timeoutInMs),
        });

        const tokenUnavailable = this.authUtil.toGithubUnavailableException(
            tokenResponse.status,
            tokenResponse.headers
        );
        if (tokenUnavailable instanceof AuthProviderUnavailableException) {
            throw tokenUnavailable;
        }

        const token = this.authUtil.parseGithubToken(tokenResponse.text);
        if (token instanceof AppUnknownException) {
            throw token;
        }

        const { access_token: accessToken, ...tokenRest } = token;
        if (tokenRest.error) {
            const tokenException = this.authUtil.toGithubTokenException(
                tokenRest.error,
                tokenRest.error_description ?? null
            );
            if (
                tokenException instanceof AuthSocialGithubInvalidException ||
                tokenException instanceof AppUnknownException
            ) {
                throw tokenException;
            }
        }
        if (typeof accessToken !== 'string') {
            throw new AppUnknownException(
                tokenRest,
                'GitHub token response carries no access_token'
            );
        }

        const emailsResponse = await this.requestGithub(
            `${this.github.apiUrl}${AuthSocialGithubEmailsPath}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `${AuthBearerScheme} ${accessToken}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': this.github.apiVersion,
                },
                signal: AbortSignal.timeout(this.github.timeoutInMs),
            }
        );

        const emailsUnavailable = this.authUtil.toGithubUnavailableException(
            emailsResponse.status,
            emailsResponse.headers
        );
        if (emailsUnavailable instanceof AuthProviderUnavailableException) {
            throw emailsUnavailable;
        }

        const emailsException = this.authUtil.toGithubEmailsException(
            emailsResponse.status
        );
        if (
            emailsException instanceof AuthSocialGithubInvalidException ||
            emailsException instanceof AppUnknownException
        ) {
            throw emailsException;
        }

        const emails = this.authUtil.parseGithubEmails(emailsResponse.text);
        if (emails instanceof AppUnknownException) {
            throw emails;
        }

        const primary = emails.find(item => item.primary && item.verified);
        if (!primary) {
            throw new AuthSocialGithubInvalidException(
                'GitHub account has no primary verified email'
            );
        }

        return primary.email;
    }
}
