import { FirebaseService } from '@common/firebase/services/firebase.service';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

/**
 * Reports Firebase Admin SDK initialization as a Terminus health indicator.
 */
@Injectable()
export class HealthFirebaseIndicator {
    private readonly logger = new Logger(HealthFirebaseIndicator.name);

    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    /**
     * Down when Firebase is not configured, or unless the Admin SDK finished initializing.
     */
    async isHealthy(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const isInitialized = this.firebaseService.isInitialized();
            if (!isInitialized) {
                return indicator.down('Firebase is not configured');
            }

            return indicator.up();
        } catch (err: unknown) {
            this.logger.error(err, 'Firebase health check failed');

            return indicator.down('Firebase check failed');
        }
    }
}
