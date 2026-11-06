import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class HealthAppleIndicator {
    private readonly clientId: string | null;
    private readonly signInClientId: string | null;

    constructor(
        private readonly configService: ConfigService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {
        const clientId = this.configService.get<string | null>(
            'auth.apple.clientId'
        );
        const signInClientId = this.configService.get<string | null>(
            'auth.apple.signInClientId'
        );

        this.clientId = clientId ?? null;
        this.signInClientId = signInClientId ?? null;
    }

    async isHealthy(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        if (!this.clientId && !this.signInClientId) {
            return indicator.down('Apple is not configured');
        }

        return indicator.up();
    }
}
