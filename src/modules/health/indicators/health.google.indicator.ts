import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from '@nestjs/terminus';

/**
 * Reports Google OAuth credential presence as a Terminus health indicator.
 */
@Injectable()
export class HealthGoogleIndicator {
    constructor(
        private readonly configService: ConfigService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    /**
     * Down when the Google client id or client secret is missing or empty.
     */
    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const clientId = this.configService.get<string | null>(
                'auth.google.clientId'
            );
            const clientSecret = this.configService.get<string | null>(
                'auth.google.clientSecret'
            );

            if (!clientId) {
                return indicator.down(
                    'Google OAuth client id is not configured'
                );
            }

            if (!clientSecret) {
                return indicator.down(
                    'Google OAuth client secret is not configured'
                );
            }

            return indicator.up();
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Unknown error';

            return indicator.down(
                `HealthGoogleIndicator Failed - ${message}`
            );
        }
    }
}
