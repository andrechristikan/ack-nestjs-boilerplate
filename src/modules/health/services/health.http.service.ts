import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { HealthAwsResponseDto } from '@modules/health/dtos/response/health.aws.response.dto';
import type { HealthDatabaseResponseDto } from '@modules/health/dtos/response/health.database.response.dto';
import type { HealthInstanceResponseDto } from '@modules/health/dtos/response/health.instance.response.dto';
import type { HealthResponseDto } from '@modules/health/dtos/response/health.response.dto';
import type { HealthThirdPartyResponseDto } from '@modules/health/dtos/response/health.third-party.response.dto';
import { HealthDomain } from '@modules/health/domains/health.domain';
import { HealthUtil } from '@modules/health/utils/health.util';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { HealthCheckResult } from '@nestjs/terminus';

@Injectable()
export class HealthHttpService {
    constructor(
        private readonly healthDomain: HealthDomain,
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

                const isHealthCheckResult =
                    this.healthUtil.isHealthCheckResult(response);
                if (isHealthCheckResult) {
                    return this.mapResponse(response);
                }
            }

            throw error;
        }
    }

    private mapResponse(result: HealthCheckResult): HealthResponseDto {
        const status = this.healthUtil.mapStatus(result.status);

        return {
            status,
            info: result.info,
            error: result.error,
            details: result.details,
        };
    }

    async checkAws(): Promise<IResponseReturn<HealthAwsResponseDto>> {
        const check = this.healthDomain.checkAws();
        const data = await this.resolveResponse(check);

        return { data };
    }

    async checkDatabase(): Promise<IResponseReturn<HealthDatabaseResponseDto>> {
        const check = this.healthDomain.checkDatabase();
        const data = await this.resolveResponse(check);

        return { data };
    }

    async checkThirdParty(): Promise<
        IResponseReturn<HealthThirdPartyResponseDto>
    > {
        const check = this.healthDomain.checkThirdParty();
        const data = await this.resolveResponse(check);

        return { data };
    }

    async checkInstance(): Promise<IResponseReturn<HealthInstanceResponseDto>> {
        const check = this.healthDomain.checkInstance();
        const data = await this.resolveResponse(check);

        return { data };
    }
}
