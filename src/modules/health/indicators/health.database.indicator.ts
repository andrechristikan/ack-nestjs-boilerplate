import { DatabaseService } from '@common/database/services/database.service';
import { Injectable } from '@nestjs/common';
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from '@nestjs/terminus';

/**
 * Reports database reachability as a Terminus health indicator.
 */
@Injectable()
export class HealthDatabaseIndicator {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    /**
     * Down when the PostgreSQL health query fails or throws.
     */
    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            await this.databaseService.client.$queryRaw`SELECT 1`;

            return indicator.up();
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Unknown error';

            return indicator.down(
                `HealthDatabaseIndicator Failed - ${message}`
            );
        }
    }
}
