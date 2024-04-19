import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AppleAuth, { AppleAuthAccessToken, AppleAuthConfig } from 'apple-auth';
import { IHelperAppleService } from 'src/common/helper/interfaces/helper.apple-service.interface';
import {
    IHelperApplePayload,
    IHelperAppleRefresh,
} from 'src/common/helper/interfaces/helper.interface';
import fs from 'fs';
import { JwtService } from '@nestjs/jwt';

// TODO: Merge with Google Service and rename to ThridParty Helper
@Injectable()
export class HelperAppleService implements IHelperAppleService {
    private readonly appleClient: AppleAuth;
    private readonly configAppleClient: AppleAuthConfig;

    private readonly certP8Path: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService
    ) {
        this.configAppleClient = {
            client_id: this.configService.get<string>('apple.clientId'),
            team_id: this.configService.get<string>('apple.teamId'),
            key_id: this.configService.get<string>('apple.keyId'),
            redirect_uri: this.configService.get<string>('apple.callbackUrl'),
            scope: 'name email',
        };

        this.certP8Path = this.configService.get<string>('apple.certP8Path');

        const certP8: string = fs.readFileSync(this.certP8Path).toString();

        this.appleClient = new AppleAuth(
            this.configAppleClient,
            certP8,
            'text'
        );
    }

    async getTokenInfo(accessToken: string): Promise<IHelperApplePayload> {
        const payload = await this.jwtService.decode(accessToken);

        return { email: payload.email };
    }

    async refreshToken(refreshToken: string): Promise<IHelperAppleRefresh> {
        const accessToken: AppleAuthAccessToken =
            await this.appleClient.refreshToken(refreshToken);

        return { accessToken: accessToken.access_token };
    }
}
