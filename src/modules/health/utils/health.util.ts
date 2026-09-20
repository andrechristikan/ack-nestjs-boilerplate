import { EnumHealthStatus } from '@modules/health/enums/health.enum';
import { Injectable } from '@nestjs/common';
import type { HealthCheckResult, HealthCheckStatus } from '@nestjs/terminus';

/**
 * Recognizes a Terminus check result and maps its status onto the module's own enum.
 */
@Injectable()
export class HealthUtil {
    private isIndicatorMap(value: unknown): boolean {
        return typeof value === 'object' && value !== null;
    }

    isHealthCheckResult(value: string | object): value is HealthCheckResult {
        if (typeof value !== 'object') {
            return false;
        }

        if (!('status' in value) || typeof value.status !== 'string') {
            return false;
        }

        if (
            !('info' in value) ||
            !('error' in value) ||
            !('details' in value)
        ) {
            return false;
        }

        const isInfoMap = this.isIndicatorMap(value.info);
        const isErrorMap = this.isIndicatorMap(value.error);
        const isDetailsMap = this.isIndicatorMap(value.details);

        return isInfoMap && isErrorMap && isDetailsMap;
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
