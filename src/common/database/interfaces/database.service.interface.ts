import { HealthIndicatorResult } from '@nestjs/terminus';

export interface IDatabaseService {
    /**
     * Checks if the database connection is healthy
     * Compatible with @nestjs/terminus health checks
     * @returns A health indicator result object
     */
    isHealthy(): Promise<HealthIndicatorResult>;
}
