import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

/**
 * Reports Google OAuth client id presence as a Terminus health indicator.
 */
@Injectable()
export class HealthGoogleIndicator {
    private readonly clientId: string | null;

    constructor(
        private readonly configService: ConfigService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {
        const clientId = this.configService.get<string | null>(
            'auth.google.clientId'
        );

        this.clientId = clientId ?? null;
    }

    /**
     * Down when the Google client id is missing or empty.
     */
    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        if (!this.clientId) {
            return indicator.down('Google is not configured');
        }

        return indicator.up();
    }
}
