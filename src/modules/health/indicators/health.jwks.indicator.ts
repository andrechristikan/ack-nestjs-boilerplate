import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

/**
 * Reports JWKS URI shape as a Terminus health indicator.
 */
@Injectable()
export class HealthJwksIndicator {
    private readonly accessTokenJwksUri: string;
    private readonly refreshTokenJwksUri: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {
        this.accessTokenJwksUri = this.configService.get<string>(
            'auth.jwt.accessToken.jwksUri'
        )!;
        this.refreshTokenJwksUri = this.configService.get<string>(
            'auth.jwt.refreshToken.jwksUri'
        )!;
    }

    /**
     * Down when the URI is empty or not a valid URL. Does not fetch.
     */
    private async checkUri(
        key: string,
        uri?: string
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            if (!uri) {
                return indicator.down('JWKS URI is not configured');
            }

            new URL(uri);

            return indicator.up();
        } catch {
            return indicator.down('JWKS URI is not a valid URL');
        }
    }

    /**
     * Down when the access-token JWKS URI is empty or not a valid URL.
     */
    async isHealthyAccessToken(key: string): Promise<HealthIndicatorResult> {
        return this.checkUri(key, this.accessTokenJwksUri);
    }

    /**
     * Down when the refresh-token JWKS URI is empty or not a valid URL.
     */
    async isHealthyRefreshToken(key: string): Promise<HealthIndicatorResult> {
        return this.checkUri(key, this.refreshTokenJwksUri);
    }
}
