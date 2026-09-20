import { FirebaseService } from '@common/firebase/services/firebase.service';
import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

/**
 * Reports Firebase Admin SDK initialization as a Terminus health indicator.
 */
@Injectable()
export class HealthFirebaseIndicator {
    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    /**
     * Down unless the Admin SDK finished initializing.
     */
    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const isInitialized = this.firebaseService.isInitialized();
            if (!isInitialized) {
                return indicator.down('Firebase Admin SDK not initialized');
            }

            return indicator.up();
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Unknown error';

            return indicator.down(
                `HealthFirebaseIndicator Failed - ${message}`
            );
        }
    }
}
