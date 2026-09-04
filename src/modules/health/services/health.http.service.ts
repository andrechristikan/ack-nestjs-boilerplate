import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { HealthAwsResponseDto } from '@modules/health/dtos/response/health.aws.response.dto';
import { HealthDatabaseResponseDto } from '@modules/health/dtos/response/health.database.response.dto';
import { HealthInstanceResponseDto } from '@modules/health/dtos/response/health.instance.response.dto';
import { HealthThirdPartyResponseDto } from '@modules/health/dtos/response/health.third-party.response.dto';
import { IHealthHttpService } from '@modules/health/interfaces/health.http.service.interface';
import { HealthService } from '@modules/health/services/health.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthHttpService implements IHealthHttpService {
    constructor(private readonly healthService: HealthService) {}

    async checkAws(): Promise<IResponseReturn<HealthAwsResponseDto>> {
        const data = await this.healthService.checkAws();

        return {
            data: data as HealthAwsResponseDto,
        };
    }

    async checkDatabase(): Promise<IResponseReturn<HealthDatabaseResponseDto>> {
        const data = await this.healthService.checkDatabase();

        return {
            data: data as HealthDatabaseResponseDto,
        };
    }

    async checkThirdParty(): Promise<
        IResponseReturn<HealthThirdPartyResponseDto>
    > {
        const data = await this.healthService.checkThirdParty();

        return {
            data: data as HealthThirdPartyResponseDto,
        };
    }

    async checkInstance(): Promise<IResponseReturn<HealthInstanceResponseDto>> {
        const data = await this.healthService.checkInstance();

        return {
            data: data as HealthInstanceResponseDto,
        };
    }
}
