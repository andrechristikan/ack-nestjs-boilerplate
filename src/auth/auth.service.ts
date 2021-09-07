import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Helper } from 'src/helper/helper.decorator';
import { HelperService } from 'src/helper/helper.service';

@Injectable()
export class AuthService {
    constructor(
        @Helper() private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {}

    async createAccessToken(
        payload: Record<string, any>,
        rememberMe: boolean
    ): Promise<string> {
        return this.helperService.jwtCreateToken(payload, {
            secretKey: this.configService.get<string>(
                'auth.jwt.accessToken.secretKey'
            ),
            expiredIn: rememberMe
                ? this.configService.get<string>(
                      'auth.jwt.accessToken.rememberMe.expirationTime'
                  )
                : this.configService.get<string>(
                      'auth.jwt.accessToken.expirationTime'
                  ),
            notBefore: rememberMe
                ? this.configService.get<string>(
                      'auth.jwt.accessToken.rememberMe.notBeforeExpirationTime'
                  )
                : this.configService.get<string>(
                      'auth.jwt.accessToken.notBeforeExpirationTime'
                  )
        });
    }

    async validateAccessToken(token: string): Promise<boolean> {
        return this.helperService.jwtVerify(token, {
            secretKey: this.configService.get<string>(
                'auth.jwt.accessToken.secretKey'
            )
        });
    }

    async payloadAccessToken(token: string): Promise<Record<string, any>> {
        return this.helperService.jwtPayload(token, {
            secretKey: this.configService.get<string>(
                'auth.jwt.accessToken.secretKey'
            )
        });
    }

    async createRefreshToken(
        payload: Record<string, any>,
        rememberMe: boolean
    ): Promise<string> {
        return this.helperService.jwtCreateToken(payload, {
            secretKey: this.configService.get<string>(
                'auth.jwt.refreshToken.secretKey'
            ),
            expiredIn: rememberMe
                ? this.configService.get<string>(
                      'auth.jwt.refreshToken.rememberMe.expirationTime'
                  )
                : this.configService.get<string>(
                      'auth.jwt.refreshToken.expirationTime'
                  ),
            notBefore: rememberMe
                ? this.configService.get<string>(
                      'auth.jwt.refreshToken.rememberMe.notBeforeExpirationTime'
                  )
                : this.configService.get<string>(
                      'auth.jwt.refreshToken.notBeforeExpirationTime'
                  )
        });
    }

    async validateRefreshToken(token: string): Promise<boolean> {
        return this.helperService.jwtVerify(token, {
            secretKey: this.configService.get<string>(
                'auth.jwt.refreshToken.secretKey'
            )
        });
    }

    async payloadRefreshToken(token: string): Promise<Record<string, any>> {
        return this.helperService.jwtPayload(token, {
            secretKey: this.configService.get<string>(
                'auth.jwt.refreshToken.secretKey'
            )
        });
    }

    async createBasicToken(
        clientId: string,
        clientSecret: string
    ): Promise<string> {
        const token: string = `${clientId}:${clientSecret}`;
        return this.helperService.base64Encrypt(token);
    }

    async validateBasicToken(
        clientBasicToken: string,
        ourBasicToken: string
    ): Promise<boolean> {
        if (ourBasicToken !== clientBasicToken) {
            return false;
        }
        return true;
    }

    async validateUser(
        passwordString: string,
        passwordHash: string
    ): Promise<boolean> {
        return this.helperService.bcryptComparePassword(
            passwordString,
            passwordHash
        );
    }
}
