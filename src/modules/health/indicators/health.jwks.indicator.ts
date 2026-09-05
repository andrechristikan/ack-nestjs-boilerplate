import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from '@nestjs/terminus';

/**
 * Reports JWKS URI shape as a Terminus health indicator.
 */
@Injectable()
export class HealthJwksIndicator {
    constructor(
        private readonly configService: ConfigService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    /**
     * Down when the access-token JWKS URI is empty or not a valid URL.
     */
    async isHealthyAccessToken(key: string): Promise<HealthIndicatorResult> {
        return this.checkUri(
            key,
            this.configService.get<string>('auth.jwt.accessToken.jwksUri')
        );
    }

    /**
     * Down when the refresh-token JWKS URI is empty or not a valid URL.
     */
    async isHealthyRefreshToken(key: string): Promise<HealthIndicatorResult> {
        return this.checkUri(
            key,
            this.configService.get<string>('auth.jwt.refreshToken.jwksUri')
        );
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
        } catch (err: unknown) {
            if (err instanceof TypeError) {
                return indicator.down('JWKS URI is not a valid URL');
            }

            const message =
                err instanceof Error ? err.message : 'Unknown error';

            return indicator.down(`HealthJwksIndicator Failed - ${message}`);
        }
    }
}
