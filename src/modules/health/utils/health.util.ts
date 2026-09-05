import { EnumHealthStatus } from '@modules/health/enums/health.enum';
import { Injectable } from '@nestjs/common';
import { HealthCheckResult, HealthCheckStatus } from '@nestjs/terminus';

/**
 * Recognizes a Terminus check result and maps its status onto the module's own enum.
 */
@Injectable()
export class HealthUtil {
    private isIndicatorMap(value: unknown): boolean {
        return typeof value === 'object' && value !== null;
    }

    isHealthCheckResult(value: string | object): value is HealthCheckResult {
        return (
            typeof value === 'object' &&
            'status' in value &&
            typeof value.status === 'string' &&
            'info' in value &&
            this.isIndicatorMap(value.info) &&
            'error' in value &&
            this.isIndicatorMap(value.error) &&
            'details' in value &&
            this.isIndicatorMap(value.details)
        );
    }

    mapStatus(status: HealthCheckStatus): EnumHealthStatus {
        switch (status) {
            case 'ok':
                return EnumHealthStatus.ok;
            case 'degraded':
                return EnumHealthStatus.degraded;
            case 'error':
                return EnumHealthStatus.error;
            case 'shutting_down':
                return EnumHealthStatus.shuttingDown;
        }
    }
}
