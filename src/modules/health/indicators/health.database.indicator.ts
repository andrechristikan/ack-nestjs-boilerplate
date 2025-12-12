import { DatabaseService } from '@common/database/services/database.service';
import { Injectable } from '@nestjs/common';
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from '@nestjs/terminus';

@Injectable()
export class HealthDatabaseIndicator {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            await this.databaseService.$runCommandRaw({ ping: 1 });

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
