import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

/**
 * Reports Apple Sign In client id presence as a Terminus health indicator.
 */
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

    /**
     * Down when neither the Apple client id nor the sign-in client id is set.
     */
    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        if (!this.clientId && !this.signInClientId) {
            return indicator.down('Apple is not configured');
        }

        return indicator.up();
    }
}
