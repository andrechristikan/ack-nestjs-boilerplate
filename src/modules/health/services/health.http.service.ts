import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { HealthAwsResponseDto } from '@modules/health/dtos/response/health.aws.response.dto';
import { HealthDatabaseResponseDto } from '@modules/health/dtos/response/health.database.response.dto';
import { HealthInstanceResponseDto } from '@modules/health/dtos/response/health.instance.response.dto';
import { HealthResponseDto } from '@modules/health/dtos/response/health.response.dto';
import { HealthThirdPartyResponseDto } from '@modules/health/dtos/response/health.third-party.response.dto';
import { IHealthHttpService } from '@modules/health/interfaces/health.http.service.interface';
import { HealthService } from '@modules/health/services/health.service';
import { HealthUtil } from '@modules/health/utils/health.util';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckResult } from '@nestjs/terminus';

@Injectable()
export class HealthHttpService implements IHealthHttpService {
    constructor(
        private readonly healthService: HealthService,
        private readonly healthUtil: HealthUtil
    ) {}

    /**
     * Unwraps the health result Terminus reports through `ServiceUnavailableException`, and
     * re-throws any other error unchanged.
     */
    private async resolveResponse(
        check: Promise<HealthCheckResult>
    ): Promise<HealthResponseDto> {
        try {
            const result = await check;

            return this.mapResponse(result);
        } catch (error: unknown) {
            if (error instanceof ServiceUnavailableException) {
                const response = error.getResponse();

                if (this.healthUtil.isHealthCheckResult(response)) {
                    return this.mapResponse(response);
                }
            }

            throw error;
        }
    }

    private mapResponse(result: HealthCheckResult): HealthResponseDto {
        return {
            status: this.healthUtil.mapStatus(result.status),
            info: result.info,
            error: result.error,
            details: result.details,
        };
    }

    async checkAws(): Promise<IResponseReturn<HealthAwsResponseDto>> {
        const data = await this.resolveResponse(this.healthService.checkAws());

        return { data };
    }

    async checkDatabase(): Promise<IResponseReturn<HealthDatabaseResponseDto>> {
        const data = await this.resolveResponse(
            this.healthService.checkDatabase()
        );

        return { data };
    }

    async checkThirdParty(): Promise<
        IResponseReturn<HealthThirdPartyResponseDto>
    > {
        const data = await this.resolveResponse(
            this.healthService.checkThirdParty()
        );

        return { data };
    }

    async checkInstance(): Promise<IResponseReturn<HealthInstanceResponseDto>> {
        const data = await this.resolveResponse(
            this.healthService.checkInstance()
        );

        return { data };
    }
}
