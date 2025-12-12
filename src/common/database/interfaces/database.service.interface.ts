import { HealthIndicatorResult } from '@nestjs/terminus';

export interface IDatabaseService {
    isHealthy(): Promise<HealthIndicatorResult>;
}
