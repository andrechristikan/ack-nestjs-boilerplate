import { Injectable } from '@nestjs/common';
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from '@nestjs/terminus';
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class HealthSentryIndicator {
    constructor(
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const client = Sentry.getClient();
            if (!client) {
                return indicator.down('Sentry client not initialized');
            }

            const options = client.getOptions();
            if (!options.dsn) {
                return indicator.down('Sentry DSN not configured');
            }

            if (options.enabled === false) {
                return indicator.down('Sentry is disabled');
            }

            return indicator.up();
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Unknown error';

            return indicator.down(`HealthSentryIndicator Failed - ${message}`);
        }
    }
}
