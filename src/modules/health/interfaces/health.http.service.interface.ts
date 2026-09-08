import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { HealthAwsResponseDto } from '@modules/health/dtos/response/health.aws.response.dto';
import { HealthDatabaseResponseDto } from '@modules/health/dtos/response/health.database.response.dto';
import { HealthInstanceResponseDto } from '@modules/health/dtos/response/health.instance.response.dto';
import { HealthThirdPartyResponseDto } from '@modules/health/dtos/response/health.third-party.response.dto';

export interface IHealthHttpService {
    checkAws(): Promise<IResponseReturn<HealthAwsResponseDto>>;
    checkDatabase(): Promise<IResponseReturn<HealthDatabaseResponseDto>>;
    checkThirdParty(): Promise<IResponseReturn<HealthThirdPartyResponseDto>>;
    checkInstance(): Promise<IResponseReturn<HealthInstanceResponseDto>>;
}
