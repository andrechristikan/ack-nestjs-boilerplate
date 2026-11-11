import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class HealthGithubIndicator {
    private readonly clientId: string | null;
    private readonly clientSecret: string | null;

    constructor(
        private readonly configService: ConfigService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {
        const clientId = this.configService.get<string | null>(
            'auth.github.clientId'
        );
        const clientSecret = this.configService.get<string | null>(
            'auth.github.clientSecret'
        );

        this.clientId = clientId ?? null;
        this.clientSecret = clientSecret ?? null;
    }

    async isHealthy(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        if (!this.clientId || !this.clientSecret) {
            return indicator.down('GitHub is not configured');
        }

        return indicator.up();
    }
}
