import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from '@nestjs/terminus';

/**
 * Reports Apple Sign In credential presence as a Terminus health indicator.
 */
@Injectable()
export class HealthAppleIndicator {
    constructor(
        private readonly configService: ConfigService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    /**
     * Down when the Apple client id or sign-in client id is missing or empty.
     */
    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const clientId = this.configService.get<string | null>(
                'auth.apple.clientId'
            );
            const signInClientId = this.configService.get<string | null>(
                'auth.apple.signInClientId'
            );

            if (!clientId) {
                return indicator.down('Apple client id is not configured');
            }

            if (!signInClientId) {
                return indicator.down(
                    'Apple sign-in client id is not configured'
                );
            }

            return indicator.up();
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Unknown error';

            return indicator.down(`HealthAppleIndicator Failed - ${message}`);
        }
    }
}
