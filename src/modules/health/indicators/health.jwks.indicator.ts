import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

/**
 * Reports JWKS endpoint availability as a Terminus health indicator.
 */
@Injectable()
export class HealthJwksIndicator {
    private readonly logger = new Logger(HealthJwksIndicator.name);
    private readonly accessTokenJwksUri: string;
    private readonly refreshTokenJwksUri: string;
    private readonly jwksTimeoutInMs: number;

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
        this.jwksTimeoutInMs = this.configService.get<number>(
            'health.jwksTimeoutInMs'
        )!;
    }

    /**
     * Down when the URI is empty or not a valid URL, or when fetching it within the timeout does not yield a key set.
     */
    private async checkUri(
        key: EnumHealthIndicatorKey,
        uri?: string
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        if (!uri) {
            return indicator.down('JWKS URI is not configured');
        }

        if (!URL.canParse(uri)) {
            return indicator.down('JWKS URI is not a valid URL');
        }

        try {
            const response = await fetch(uri, {
                signal: AbortSignal.timeout(this.jwksTimeoutInMs),
            });
            if (!response.ok) {
                return indicator.down('JWKS endpoint is unreachable');
            }

            const body: unknown = await response.json();
            const hasKeys =
                typeof body === 'object' &&
                body !== null &&
                'keys' in body &&
                Array.isArray(body.keys);
            if (!hasKeys) {
                return indicator.down('JWKS endpoint is unreachable');
            }

            return indicator.up();
        } catch (err: unknown) {
            this.logger.error(err, 'JWKS health check failed');

            return indicator.down('JWKS endpoint is unreachable');
        }
    }

    /**
     * Down when the access-token JWKS endpoint is not configured or does not answer with a key set.
     */
    async isHealthyAccessToken(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        return this.checkUri(key, this.accessTokenJwksUri);
    }

    /**
     * Down when the refresh-token JWKS endpoint is not configured or does not answer with a key set.
     */
    async isHealthyRefreshToken(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        return this.checkUri(key, this.refreshTokenJwksUri);
    }
}
