import type { HealthResponseDto } from '@modules/health/dtos/response/health.response.dto';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';
import { Injectable } from '@nestjs/common';
import type { HealthCheckResult, HealthCheckStatus } from '@nestjs/terminus';

@Injectable()
export class HealthUtil {
    private isIndicatorMap(value: unknown): boolean {
        return typeof value === 'object' && value !== null;
    }

    private mapStatus(status: HealthCheckStatus): EnumHealthStatus {
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

    toResponse(result: HealthCheckResult): HealthResponseDto {
        const status = this.mapStatus(result.status);

        return {
            status,
            info: result.info,
            error: result.error,
            details: result.details,
        };
    }
}
