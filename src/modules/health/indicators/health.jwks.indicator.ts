import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '@nestjs/http-client';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class HealthJwksIndicator {
    private readonly logger = new Logger(HealthJwksIndicator.name);
    private readonly accessTokenJwksUri: string;
    private readonly refreshTokenJwksUri: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly healthIndicatorService: HealthIndicatorService,
        private readonly httpClient: HttpClient
    ) {
        this.accessTokenJwksUri = this.configService.get<string>(
            'auth.jwt.accessToken.jwksUri'
        )!;
        this.refreshTokenJwksUri = this.configService.get<string>(
            'auth.jwt.refreshToken.jwksUri'
        )!;
    }

    private async checkUri(
        key: EnumHealthIndicatorKey,
        uri: string
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const { data: body } = await this.httpClient.get(uri);
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
