import { DatabaseService } from '@common/database/services/database.service';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

/**
 * Reports MongoDB reachability as a Terminus health indicator.
 */
@Injectable()
export class HealthDatabaseIndicator {
    private readonly logger = new Logger(HealthDatabaseIndicator.name);

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    /**
     * Down when the `ping` command fails or throws.
     */
    async isHealthy(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            await this.databaseService.client.$runCommandRaw({ ping: 1 });

            return indicator.up();
        } catch (err: unknown) {
            this.logger.error(err, 'Database health check failed');

            return indicator.down('Database is unreachable');
        }
    }
}
