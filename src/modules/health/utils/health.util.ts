import type { HealthResponseDto } from '@modules/health/dtos/response/health.response.dto';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';
import { Injectable } from '@nestjs/common';
import type { HealthCheckResult, HealthCheckStatus } from '@nestjs/terminus';

@Injectable()
export class HealthUtil {
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
