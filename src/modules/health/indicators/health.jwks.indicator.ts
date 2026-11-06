import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

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

    async isHealthyAccessToken(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        return this.checkUri(key, this.accessTokenJwksUri);
    }

    async isHealthyRefreshToken(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        return this.checkUri(key, this.refreshTokenJwksUri);
    }
}
