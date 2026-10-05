import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import * as Sentry from '@sentry/nestjs';

/**
 * Reports Sentry client readiness as a Terminus health indicator.
 */
@Injectable()
export class HealthSentryIndicator {
    private readonly dsn: string | null;

    constructor(
        private readonly configService: ConfigService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {
        const dsn = this.configService.get<string | null>('logger.sentry.dsn');

        this.dsn = dsn ?? null;
    }

    /**
     * Down when no DSN is configured, or unless the client is initialized and enabled.
     */
    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        if (!this.dsn) {
            return indicator.down('Sentry is not configured');
        }

        try {
            const client = Sentry.getClient();
            if (!client) {
                return indicator.down('Sentry client not initialized');
            }

            if (client.getOptions().enabled === false) {
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
