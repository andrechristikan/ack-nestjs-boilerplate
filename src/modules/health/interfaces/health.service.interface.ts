import { HealthCheckResult } from '@nestjs/terminus';

export interface IHealthService {
    checkAws(): Promise<HealthCheckResult>;
    checkDatabase(): Promise<HealthCheckResult>;
    checkThirdParty(): Promise<HealthCheckResult>;
    checkInstance(): Promise<HealthCheckResult>;
}
