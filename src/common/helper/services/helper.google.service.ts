import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import {
    RefreshAccessTokenResponse,
    TokenInfo,
} from 'google-auth-library/build/src/auth/oauth2client';
import { IHelperGoogleService } from 'src/common/helper/interfaces/helper.google-service.interface';
import {
    IHelperGooglePayload,
    IHelperGoogleRefresh,
} from 'src/common/helper/interfaces/helper.interface';

@Injectable()
export class HelperGoogleService implements IHelperGoogleService {
    private readonly googleClient: OAuth2Client;

    constructor(private readonly configService: ConfigService) {
        this.googleClient = new OAuth2Client(
            this.configService.get<string>('google.clientId'),
            this.configService.get<string>('google.clientSecret')
        );
    }

    async getTokenInfo(accessToken: string): Promise<IHelperGooglePayload> {
        const payload: TokenInfo =
            await this.googleClient.getTokenInfo(accessToken);

        return { email: payload.email };
    }

    async refreshToken(refreshToken: string): Promise<IHelperGoogleRefresh> {
        this.googleClient.setCredentials({
            refresh_token: refreshToken,
            scope: 'profile email openid',
        });
        const payload: RefreshAccessTokenResponse =
            await this.googleClient.refreshAccessToken();

        return { accessToken: payload.credentials.access_token };
    }
}
