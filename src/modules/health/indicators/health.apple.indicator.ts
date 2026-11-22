import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class HealthAppleIndicator {
    private readonly clientIds: string[];

    constructor(
        private readonly configService: ConfigService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {
        this.clientIds = this.configService.get<string[]>(
            'auth.social.apple.clientIds'
        )!;
    }

    async isHealthy(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        if (this.clientIds.length === 0) {
            return indicator.down('Apple is not configured');
        }

        return indicator.up();
    }
}
