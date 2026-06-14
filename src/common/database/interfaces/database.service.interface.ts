import { HealthIndicatorResult } from '@nestjs/terminus';

/**
 * Contract for the database service health indicator.
 */
export interface IDatabaseService {
    /**
     * Pings the database and returns a Terminus health indicator result.
     *
     * @returns {Promise<HealthIndicatorResult>} Object keyed by `"database"` with status `"up"` or `"down"`
     */
    isHealthy(): Promise<HealthIndicatorResult>;
}
