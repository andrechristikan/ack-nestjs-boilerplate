import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { HealthAwsResponseDto } from '@modules/health/dtos/response/health.aws.response.dto';
import type { HealthDatabaseResponseDto } from '@modules/health/dtos/response/health.database.response.dto';
import type { HealthInstanceResponseDto } from '@modules/health/dtos/response/health.instance.response.dto';
import type { HealthThirdPartyResponseDto } from '@modules/health/dtos/response/health.third-party.response.dto';
import { HealthDomain } from '@modules/health/domains/health.domain';
import { HealthUtil } from '@modules/health/utils/health.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthHttpService {
    constructor(
        private readonly healthDomain: HealthDomain,
        private readonly healthUtil: HealthUtil
    ) {}

    async checkAws(): Promise<IResponseReturn<HealthAwsResponseDto>> {
        const result = await this.healthDomain.checkAws();
        const data = this.healthUtil.toResponse(result);

        return { data };
    }

    async checkDatabase(): Promise<IResponseReturn<HealthDatabaseResponseDto>> {
        const result = await this.healthDomain.checkDatabase();
        const data = this.healthUtil.toResponse(result);

        return { data };
    }

    async checkThirdParty(): Promise<
        IResponseReturn<HealthThirdPartyResponseDto>
    > {
        const result = await this.healthDomain.checkThirdParty();
        const data = this.healthUtil.toResponse(result);

        return { data };
    }

    async checkInstance(): Promise<IResponseReturn<HealthInstanceResponseDto>> {
        const result = await this.healthDomain.checkInstance();
        const data = this.healthUtil.toResponse(result);

        return { data };
    }
}
